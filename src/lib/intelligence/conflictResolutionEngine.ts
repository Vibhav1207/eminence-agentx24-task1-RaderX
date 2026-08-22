import {
  ContradictionModel,
  ClaimModel,
  EvidenceModel,
  InvestigationModel,
  ConflictResolutionStrategy,
} from '@/lib/types';
import { dbRepository } from '@/lib/db/repository';
import { defaultLLMProvider } from '@/lib/orchestrator/llmProvider';
import { scoreSourceQuality } from './claimExtractionEngine';
import { defaultWebProvider } from '@/lib/providers/webProvider';
import { defaultEvidenceNormalizer } from '@/lib/normalization/evidenceNormalizer';

// ==================================================
// CONFLICT RESOLUTION ENGINE
//
// Resolves detected contradictions by:
// 1. Evaluating source quality of each claim's evidence
// 2. Applying temporal reasoning (newer facts for dynamic data)
// 3. Searching for corroborating evidence from a third source
// 4. Using Gemini to reason through the conflict semantically
// 5. Preserving uncertainty if resolution is impossible
//
// PRINCIPLE: RadarX must NEVER fabricate certainty.
// If a conflict cannot be resolved, it is preserved in
// the final brief as an acknowledged uncertainty.
// ==================================================

export interface ResolutionOutcome {
  contradictionId: string;
  resolved: boolean;
  strategy: ConflictResolutionStrategy;
  resolution: string;
  confidenceDelta: number;         // +ve = confidence restored, -ve = confidence lost
  corroborationEvidenceId?: string;// New corroboration evidence found
  preservedUncertainty?: string;   // If unresolved, text for the brief
}

// Determines which claim wins on source quality
function resolveBySourceQuality(
  claimA: ClaimModel,
  claimB: ClaimModel,
  evidenceMap: Map<string, EvidenceModel>
): { winner: ClaimModel | null; scoreA: number; scoreB: number } {
  const evA = claimA.evidenceIds
    .map((id) => evidenceMap.get(id))
    .filter(Boolean) as EvidenceModel[];
  const evB = claimB.evidenceIds
    .map((id) => evidenceMap.get(id))
    .filter(Boolean) as EvidenceModel[];

  const scoreA = evA.length > 0
    ? evA.reduce((sum, e) => sum + scoreSourceQuality(e), 0) / evA.length
    : 35;
  const scoreB = evB.length > 0
    ? evB.reduce((sum, e) => sum + scoreSourceQuality(e), 0) / evB.length
    : 35;

  const QUALITY_MARGIN = 15; // Require at least 15-point quality lead for automatic resolution
  if (scoreA - scoreB >= QUALITY_MARGIN) return { winner: claimA, scoreA, scoreB };
  if (scoreB - scoreA >= QUALITY_MARGIN) return { winner: claimB, scoreA, scoreB };
  return { winner: null, scoreA, scoreB }; // Too close — cannot resolve by quality alone
}

// Determines which claim is temporally newer (for dynamic/changing data)
function resolveByTemporalPriority(
  claimA: ClaimModel,
  claimB: ClaimModel,
  evidenceMap: Map<string, EvidenceModel>
): ClaimModel | null {
  const getDate = (c: ClaimModel): number => {
    const ev = c.evidenceIds.map((id) => evidenceMap.get(id)).find(Boolean);
    if (!ev) return 0;
    const dateStr = ev.publishedAt || ev.date || ev.discoveredAt;
    return dateStr ? new Date(dateStr).getTime() : 0;
  };
  const tA = getDate(claimA);
  const tB = getDate(claimB);
  const TEMPORAL_MARGIN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days minimum gap
  if (tA - tB > TEMPORAL_MARGIN_MS) return claimA;  // A is newer
  if (tB - tA > TEMPORAL_MARGIN_MS) return claimB;  // B is newer
  return null; // Too close in time to determine
}

// Searches for a third corroborating source via web provider
async function searchCorroboration(
  investigation: InvestigationModel,
  contradiction: ContradictionModel,
  claimA: ClaimModel,
  claimB: ClaimModel
): Promise<EvidenceModel | null> {
  const query = `${investigation.primaryEntities[0] || investigation.title} ${claimA.topic} independent analysis`;
  try {
    const results = await defaultWebProvider.search(query, { limit: 2 });
    if (results.length === 0) return null;

    const topResult = results[0];
    const { evidence: corrobEvidence } = defaultEvidenceNormalizer.normalizeSourceResult(
      topResult,
      investigation.id,
      `corroboration-${contradiction.id}`
    );
    await dbRepository.saveEvidenceItem(corrobEvidence);
    return corrobEvidence;
  } catch {
    return null;
  }
}

// LLM-powered resolution reasoning
async function resolveWithLLM(
  contradiction: ContradictionModel,
  claimA: ClaimModel,
  claimB: ClaimModel,
  evidenceA: EvidenceModel | undefined,
  evidenceB: EvidenceModel | undefined,
  corroboration: EvidenceModel | null,
  qualityScoreA: number,
  qualityScoreB: number,
): Promise<{ resolution: string; strategy: ConflictResolutionStrategy; resolved: boolean; confidence: number }> {
  const corrobText = corroboration
    ? `\nCORROBORATING EVIDENCE:\nSource: ${corroboration.source}\nPublished: ${corroboration.publishedAt || 'Unknown'}\nContent: ${corroboration.summary}`
    : '\nNo corroborating evidence was found.';

  const prompt = `You are an intelligence analyst tasked with resolving a conflicting evidence case.

CONFLICT SUMMARY:
Claim A: "${claimA.statement}"
  Source: ${evidenceA?.source || 'Unknown'} (type: ${evidenceA?.sourceType || 'UNKNOWN'}, quality score: ${qualityScoreA}/100)
  Published: ${evidenceA?.publishedAt || claimA.temporalScope || 'Unknown'}
  URL: ${evidenceA?.url || 'N/A'}

Claim B: "${claimB.statement}"
  Source: ${evidenceB?.source || 'Unknown'} (type: ${evidenceB?.sourceType || 'UNKNOWN'}, quality score: ${qualityScoreB}/100)
  Published: ${evidenceB?.publishedAt || claimB.temporalScope || 'Unknown'}
  URL: ${evidenceB?.url || 'N/A'}
${corrobText}

Your task:
1. Analyze whether one claim is clearly more credible given source quality, date, and provenance.
2. If corroborating evidence exists, determine which claim it supports.
3. If resolution is impossible, say so explicitly. Do NOT invent certainty.

Output ONLY valid JSON:
{
  "resolved": true or false,
  "strategy": "SOURCE_QUALITY_WINS" | "TEMPORAL_WINS" | "CORROBORATION" | "PRESERVED_UNCERTAINTY" | "REFUTED",
  "resolution": "Clear, honest explanation of your finding. If unresolved, state both sides and why uncertainty is preserved.",
  "confidence": 0-100 confidence in the resolution
}`;

  try {
    const raw = await defaultLLMProvider.complete({
      prompt,
      systemPrompt: 'You are a rigorous intelligence analyst. Never fabricate certainty. Output only valid JSON.',
      temperature: 0.15,
      maxTokens: 600,
    });
    const cleaned = raw.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      resolution: parsed.resolution || 'Resolution analysis completed.',
      strategy: parsed.strategy || 'PRESERVED_UNCERTAINTY',
      resolved: parsed.resolved ?? false,
      confidence: parsed.confidence ?? 50,
    };
  } catch {
    // Deterministic fallback — compare scores
    if (qualityScoreA - qualityScoreB >= 15) {
      return {
        resolved: true,
        strategy: 'SOURCE_QUALITY_WINS',
        resolution: `Claim A preferred: source quality score (${qualityScoreA}) significantly exceeds Claim B (${qualityScoreB}). Claim B discounted as lower-authority source.`,
        confidence: Math.min(qualityScoreA, 85),
      };
    }
    if (qualityScoreB - qualityScoreA >= 15) {
      return {
        resolved: true,
        strategy: 'SOURCE_QUALITY_WINS',
        resolution: `Claim B preferred: source quality score (${qualityScoreB}) significantly exceeds Claim A (${qualityScoreA}). Claim A discounted as lower-authority source.`,
        confidence: Math.min(qualityScoreB, 85),
      };
    }
    return {
      resolved: false,
      strategy: 'PRESERVED_UNCERTAINTY',
      resolution: `Unable to resolve: both claims have comparable source quality (A: ${qualityScoreA}, B: ${qualityScoreB}) and no corroborating evidence is available. Uncertainty preserved in final brief.`,
      confidence: 40,
    };
  }
}

export class ConflictResolutionEngine {
  /**
   * Attempt to resolve each detected contradiction.
   * Returns ResolutionOutcome for each contradiction.
   */
  async resolveContradictions(
    investigation: InvestigationModel,
    contradictions: ContradictionModel[],
    claimsMap: Map<string, ClaimModel>,
    evidenceMap: Map<string, EvidenceModel>
  ): Promise<ResolutionOutcome[]> {
    const outcomes: ResolutionOutcome[] = [];

    for (const contradiction of contradictions) {
      if (contradiction.status === 'RESOLVED') {
        // Already resolved (e.g. apparent conflicts)
        outcomes.push({
          contradictionId: contradiction.id,
          resolved: true,
          strategy: contradiction.resolutionStrategy || 'SCOPE_CLARIFIED',
          resolution: contradiction.resolution || 'Previously resolved.',
          confidenceDelta: 0,
        });
        continue;
      }

      // Get the two conflicting claims
      const claimIds = contradiction.claimIds || [];
      const claimA = claimIds[0] ? claimsMap.get(claimIds[0]) : undefined;
      const claimB = claimIds[1] ? claimsMap.get(claimIds[1]) : undefined;

      if (!claimA || !claimB) {
        // Fallback: no claim model data — preserve uncertainty
        await dbRepository.updateContradiction(contradiction.id, {
          status: 'RESOLVED',
          resolutionStrategy: 'PRESERVED_UNCERTAINTY',
          resolution: 'Conflicting claims could not be matched to normalized models. Uncertainty preserved.',
          confidenceDelta: -5,
          resolvedAt: new Date().toISOString(),
        });
        outcomes.push({
          contradictionId: contradiction.id,
          resolved: false,
          strategy: 'PRESERVED_UNCERTAINTY',
          resolution: 'Uncertainty preserved — insufficient claim model data.',
          confidenceDelta: -5,
          preservedUncertainty: `Conflicting claims detected around topic "${contradiction.claims[0]?.substring(0, 60)}..." — resolution inconclusive.`,
        });
        continue;
      }

      // ── Step 1: Temporal resolution (non-conflicting progression)
      const temporalWinner = resolveByTemporalPriority(claimA, claimB, evidenceMap);
      if (temporalWinner) {
        const explanation = `Temporal priority: "${temporalWinner.statement}" is from a more recent source and supersedes the earlier claim on this dynamic topic.`;
        await dbRepository.updateContradiction(contradiction.id, {
          status: 'RESOLVED',
          resolutionStrategy: 'TEMPORAL_WINS',
          resolution: explanation,
          confidenceDelta: 5,
          resolvedAt: new Date().toISOString(),
        });
        await dbRepository.updateClaim(claimA.id, {
          status: temporalWinner.id === claimA.id ? 'SUPPORTED' : 'PARTIALLY_SUPPORTED',
        });
        await dbRepository.updateClaim(claimB.id, {
          status: temporalWinner.id === claimB.id ? 'SUPPORTED' : 'PARTIALLY_SUPPORTED',
        });
        outcomes.push({
          contradictionId: contradiction.id,
          resolved: true,
          strategy: 'TEMPORAL_WINS',
          resolution: explanation,
          confidenceDelta: 5,
        });
        continue;
      }

      // ── Step 2: Source quality resolution
      const { winner: qualityWinner, scoreA, scoreB } = resolveBySourceQuality(claimA, claimB, evidenceMap);
      if (qualityWinner) {
        const loser = qualityWinner.id === claimA.id ? claimB : claimA;
        const explanation = `Source quality resolution: "${qualityWinner.statement}" supported by higher-authority source (score: ${qualityWinner.id === claimA.id ? scoreA : scoreB}/100). "${loser.statement}" discounted (score: ${loser.id === claimA.id ? scoreA : scoreB}/100).`;
        await dbRepository.updateContradiction(contradiction.id, {
          status: 'RESOLVED',
          resolutionStrategy: 'SOURCE_QUALITY_WINS',
          resolution: explanation,
          confidenceDelta: 8,
          resolvedAt: new Date().toISOString(),
        });
        await dbRepository.updateClaim(qualityWinner.id, { status: 'SUPPORTED' });
        await dbRepository.updateClaim(loser.id, { status: 'CONTRADICTED' });
        outcomes.push({
          contradictionId: contradiction.id,
          resolved: true,
          strategy: 'SOURCE_QUALITY_WINS',
          resolution: explanation,
          confidenceDelta: 8,
        });
        continue;
      }

      // ── Step 3: Corroboration search
      const corroboration = await searchCorroboration(investigation, contradiction, claimA, claimB);

      // ── Step 4: LLM-powered full resolution reasoning
      const evA = claimA.evidenceIds[0] ? evidenceMap.get(claimA.evidenceIds[0]) : undefined;
      const evB = claimB.evidenceIds[0] ? evidenceMap.get(claimB.evidenceIds[0]) : undefined;

      const llmResult = await resolveWithLLM(
        contradiction, claimA, claimB, evA, evB, corroboration, scoreA, scoreB
      );

      const finalStrategy = corroboration && llmResult.strategy !== 'PRESERVED_UNCERTAINTY'
        ? 'CORROBORATION'
        : llmResult.strategy;

      const confidenceDelta = llmResult.resolved ? 5 : -10;

      await dbRepository.updateContradiction(contradiction.id, {
        status: 'RESOLVED',
        resolutionStrategy: finalStrategy,
        resolution: llmResult.resolution,
        confidenceDelta,
        resolvedAt: new Date().toISOString(),
      });

      if (llmResult.resolved) {
        await dbRepository.updateClaim(claimA.id, { status: 'PARTIALLY_SUPPORTED' });
        await dbRepository.updateClaim(claimB.id, { status: 'PARTIALLY_SUPPORTED' });
      }
      // If NOT resolved — claims remain CONTRADICTED with uncertainty preserved

      outcomes.push({
        contradictionId: contradiction.id,
        resolved: llmResult.resolved,
        strategy: finalStrategy,
        resolution: llmResult.resolution,
        confidenceDelta,
        corroborationEvidenceId: corroboration?.id,
        preservedUncertainty: !llmResult.resolved
          ? `UNRESOLVED CONFLICT: Both claims about "${claimA.topic}" carry comparable evidence weight. The brief presents both perspectives.`
          : undefined,
      });
    }

    return outcomes;
  }
}

export const defaultConflictResolutionEngine = new ConflictResolutionEngine();
