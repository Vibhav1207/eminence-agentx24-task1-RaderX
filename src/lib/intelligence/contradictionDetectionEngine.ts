import {
  EvidenceModel,
  ClaimModel,
  ContradictionModel,
  ConflictType,
  InvestigationModel,
} from '@/lib/types';
import { dbRepository } from '@/lib/db/repository';
import { defaultLLMProvider } from '@/lib/orchestrator/llmProvider';
import { scoreSourceQuality } from './claimExtractionEngine';

// ==================================================
// TEMPORAL REASONING HELPER
// Determines whether two claims describe the same or
// different time periods. If they describe temporal
// progression (2025 → 2026 for the same metric),
// they should NOT be flagged as contradictions.
// ==================================================

interface TemporalInterval {
  year?: number;
  quarter?: number; // 1-4
}

function parseTemporalScope(scope?: string): TemporalInterval | null {
  if (!scope) return null;
  const yearMatch = scope.match(/\b(20\d\d)\b/);
  const qtrMatch = scope.match(/[Qq]([1-4])/);
  return {
    year: yearMatch ? parseInt(yearMatch[1]) : undefined,
    quarter: qtrMatch ? parseInt(qtrMatch[1]) : undefined,
  };
}

/**
 * Returns true if the two temporal scopes represent non-overlapping
 * distinct periods (e.g., 2025 vs 2026-Q1), suggesting temporal progression
 * rather than a true contradiction.
 */
function isTemporalProgression(scopeA?: string, scopeB?: string): boolean {
  const a = parseTemporalScope(scopeA);
  const b = parseTemporalScope(scopeB);
  if (!a || !b) return false;
  if (!a.year || !b.year) return false;
  // Different years without quarter overlap → temporal progression
  if (a.year !== b.year) return true;
  // Same year, different quarters → still a possible scope difference
  if (a.quarter && b.quarter && a.quarter !== b.quarter) return true;
  return false;
}

// ==================================================
// NUMERIC CONTRADICTION DETECTOR
// Detects when two claims reference the same metric
// with conflicting numeric values.
// ==================================================

const NUMERIC_PATTERN = /(\d[\d.,]+)\s*(%|billion|million|trillion|units?|patents?|models?)?/gi;

function extractNumericRefs(text: string): Array<{ value: number; unit: string }> {
  const matches: Array<{ value: number; unit: string }> = [];
  const pattern = new RegExp(NUMERIC_PATTERN.source, 'gi');
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    const unit = match[2] || '';
    if (!isNaN(value)) matches.push({ value, unit });
  }
  return matches;
}

function hasNumericConflict(statA: string, statB: string): boolean {
  const numsA = extractNumericRefs(statA);
  const numsB = extractNumericRefs(statB);
  if (numsA.length === 0 || numsB.length === 0) return false;
  // Check if same unit context but materially different value (>20% divergence)
  for (const a of numsA) {
    for (const b of numsB) {
      if (a.unit === b.unit && a.value > 0 && b.value > 0) {
        const divergence = Math.abs(a.value - b.value) / Math.max(a.value, b.value);
        if (divergence > 0.15) return true;
      }
    }
  }
  return false;
}

// ==================================================
// SCOPE ANALYSER
// Detects whether claims seem to describe the same
// thing but with different geographic/segment scope.
// ==================================================

const SCOPE_MARKERS = [
  'global', 'worldwide', 'us', 'united states', 'north america',
  'china', 'europe', 'emea', 'apac', 'q1', 'q2', 'q3', 'q4',
  'enterprise', 'consumer', 'cloud', 'on-premise', 'hyperscaler',
];

function extractScopeHints(text: string): string[] {
  const lower = text.toLowerCase();
  return SCOPE_MARKERS.filter((s) => lower.includes(s));
}

function hasScopeDifference(statA: string, statB: string): boolean {
  const scopeA = extractScopeHints(statA);
  const scopeB = extractScopeHints(statB);
  if (scopeA.length === 0 || scopeB.length === 0) return false;
  // If A and B mention completely different scope markers, scope difference explains apparent conflict
  const overlap = scopeA.filter((s) => scopeB.includes(s));
  return overlap.length === 0;
}

// ==================================================
// SEMANTIC CONTRADICTION CLASSIFIER (LLM-backed)
// Uses Gemini to classify whether two claims are a
// TRUE contradiction or merely an APPARENT one.
// Falls back to rule-based classification on failure.
// ==================================================

interface SemanticConflictAnalysis {
  isContradiction: boolean;
  conflictType: ConflictType;
  explanation: string;
  suggestedResolution?: string;
}

async function classifyConflictWithLLM(
  claimA: ClaimModel,
  claimB: ClaimModel,
  evidenceA: EvidenceModel | undefined,
  evidenceB: EvidenceModel | undefined,
): Promise<SemanticConflictAnalysis> {
  const prompt = `You are a senior intelligence analyst assessing conflicting evidence.

CLAIM A:
Statement: "${claimA.statement}"
Source: ${evidenceA?.source || 'Unknown'} (${evidenceA?.sourceType || 'UNKNOWN'})
Published: ${evidenceA?.publishedAt || claimA.temporalScope || 'Unknown date'}
Topic: ${claimA.topic}
Temporal Scope: ${claimA.temporalScope || 'Not specified'}
Scope Note: ${claimA.scopeNote || 'None'}

CLAIM B:
Statement: "${claimB.statement}"
Source: ${evidenceB?.source || 'Unknown'} (${evidenceB?.sourceType || 'UNKNOWN'})
Published: ${evidenceB?.publishedAt || claimB.temporalScope || 'Unknown date'}
Topic: ${claimB.topic}
Temporal Scope: ${claimB.temporalScope || 'Not specified'}
Scope Note: ${claimB.scopeNote || 'None'}

Analyze whether these claims TRULY contradict each other or are only APPARENTLY conflicting due to:
- Different time periods (temporal progression, not contradiction)
- Different geographic or segment scope
- Different definitions of the same term
- Entity confusion (different entities named similarly)

Output ONLY valid JSON:
{
  "isContradiction": true or false,
  "conflictType": "DIRECT" | "NUMERIC" | "TEMPORAL" | "SCOPE" | "ENTITY" | "DEFINITION" | "APPARENT",
  "explanation": "One paragraph explanation of your finding",
  "suggestedResolution": "How this should be resolved or null if unresolvable"
}`;

  try {
    const raw = await defaultLLMProvider.complete({
      prompt,
      systemPrompt: 'You are a structured intelligence analyst. Output only valid JSON, no markdown.',
      temperature: 0.1,
      maxTokens: 600,
    });
    const cleaned = raw.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      isContradiction: parsed.isContradiction ?? true,
      conflictType: parsed.conflictType || 'DIRECT',
      explanation: parsed.explanation || 'Conflict analysis completed.',
      suggestedResolution: parsed.suggestedResolution || undefined,
    };
  } catch {
    // Rule-based fallback
    const isNumeric = hasNumericConflict(claimA.statement, claimB.statement);
    const isScope = hasScopeDifference(claimA.statement, claimB.statement);
    const isTemporal = isTemporalProgression(claimA.temporalScope, claimB.temporalScope);

    if (isTemporal) {
      return { isContradiction: false, conflictType: 'TEMPORAL', explanation: 'Claims refer to different time periods (temporal progression).' };
    }
    if (isScope) {
      return { isContradiction: false, conflictType: 'SCOPE', explanation: 'Claims appear to refer to different geographic or market segments.' };
    }
    if (isNumeric) {
      return { isContradiction: true, conflictType: 'NUMERIC', explanation: 'Claims report materially different numeric values for the same metric.' };
    }
    return { isContradiction: true, conflictType: 'DIRECT', explanation: 'Claims appear to directly contradict each other.' };
  }
}

// ==================================================
// CONTRADICTION DETECTION ENGINE
// Main orchestrator that groups claims by topic,
// pairs them, and classifies each pair for conflicts.
// ==================================================

export interface DetectionResult {
  contradictions: ContradictionModel[];
  apparentConflicts: ContradictionModel[];    // APPARENT — not real contradictions
  temporalProgressions: Array<{ claimA: ClaimModel; claimB: ClaimModel; explanation: string }>;
}

export class ContradictionDetectionEngine {
  /**
   * Detect real and apparent conflicts across a list of claims.
   * Groups claims by topic, then pairs them for comparison.
   */
  async detectConflicts(
    investigation: InvestigationModel,
    claims: ClaimModel[],
    evidenceMap: Map<string, EvidenceModel>
  ): Promise<DetectionResult> {
    const result: DetectionResult = {
      contradictions: [],
      apparentConflicts: [],
      temporalProgressions: [],
    };

    // Group claims by topic (same entity/topic = potential conflict zone)
    const byTopic = new Map<string, ClaimModel[]>();
    for (const claim of claims) {
      const key = claim.topic.toLowerCase().trim();
      const existing = byTopic.get(key) || [];
      existing.push(claim);
      byTopic.set(key, existing);
    }

    for (const [topic, topicClaims] of byTopic.entries()) {
      // Only process topics with ≥2 claims (potential contradictions)
      if (topicClaims.length < 2) continue;

      // Compare each pair
      for (let i = 0; i < topicClaims.length - 1; i++) {
        for (let j = i + 1; j < topicClaims.length; j++) {
          const claimA = topicClaims[i];
          const claimB = topicClaims[j];

          // Skip if claims are essentially the same statement
          if (claimA.statement.toLowerCase() === claimB.statement.toLowerCase()) continue;

          // Quick rule-based temporal check before calling LLM
          const isTempProg = isTemporalProgression(claimA.temporalScope, claimB.temporalScope);
          if (isTempProg) {
            result.temporalProgressions.push({
              claimA,
              claimB,
              explanation: `"${claimA.statement}" (${claimA.temporalScope}) and "${claimB.statement}" (${claimB.temporalScope}) represent temporal progression, not contradiction.`,
            });
            continue;
          }

          const evA = claimA.evidenceIds[0] ? evidenceMap.get(claimA.evidenceIds[0]) : undefined;
          const evB = claimB.evidenceIds[0] ? evidenceMap.get(claimB.evidenceIds[0]) : undefined;

          const analysis = await classifyConflictWithLLM(claimA, claimB, evA, evB);

          if (!analysis.isContradiction) {
            // Apparent conflict — record but do not block resolution
            const apparent = await dbRepository.createContradiction({
              investigationId: investigation.id,
              claims: [claimA.statement, claimB.statement],
              evidenceIds: [
                ...(claimA.evidenceIds || []),
                ...(claimB.evidenceIds || []),
              ],
              claimIds: [claimA.id, claimB.id],
              severity: 'LOW',
              conflictType: analysis.conflictType,
              status: 'RESOLVED',
              resolutionStrategy: 'SCOPE_CLARIFIED',
              resolution: analysis.explanation,
              resolvedAt: new Date().toISOString(),
            });
            result.apparentConflicts.push(apparent);
            // Update claim statuses — not contradicted, just PARTIALLY_SUPPORTED
            await dbRepository.updateClaim(claimA.id, { status: 'PARTIALLY_SUPPORTED' });
            await dbRepository.updateClaim(claimB.id, { status: 'PARTIALLY_SUPPORTED' });
          } else {
            // Real contradiction
            const qualityA = evA ? scoreSourceQuality(evA) : 50;
            const qualityB = evB ? scoreSourceQuality(evB) : 50;
            const severity = (qualityA > 80 || qualityB > 80) ? 'HIGH' : 'MEDIUM';

            const contradiction = await dbRepository.createContradiction({
              investigationId: investigation.id,
              claims: [claimA.statement, claimB.statement],
              evidenceIds: [
                ...(claimA.evidenceIds || []),
                ...(claimB.evidenceIds || []),
              ],
              claimIds: [claimA.id, claimB.id],
              severity: severity as any,
              conflictType: analysis.conflictType,
              status: 'UNRESOLVED',
            });
            result.contradictions.push(contradiction);

            // Mark claims as CONTRADICTED
            await dbRepository.updateClaim(claimA.id, {
              status: 'CONTRADICTED',
              contradictingEvidenceIds: claimB.evidenceIds,
              contradictionId: contradiction.id,
            });
            await dbRepository.updateClaim(claimB.id, {
              status: 'CONTRADICTED',
              contradictingEvidenceIds: claimA.evidenceIds,
              contradictionId: contradiction.id,
            });
          }
        }
      }
    }

    return result;
  }
}

export const defaultContradictionDetectionEngine = new ContradictionDetectionEngine();
