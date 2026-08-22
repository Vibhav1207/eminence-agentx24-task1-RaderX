import { EvidenceModel, ClaimModel, ClaimStatus, SourceType, SourceQuality } from '@/lib/types';
import { dbRepository } from '@/lib/db/repository';
import { defaultLLMProvider } from '@/lib/orchestrator/llmProvider';

// ==================================================
// SOURCE QUALITY SCORER
// Produces a 0–100 quality score for each evidence item
// based on source type, peer-review status, and provenance.
// This score influences claim confidence computation.
// ==================================================

export type SourceQualityTier =
  | 'PATENT_RECORD'          // Legally filed patent — highest authority for IP claims
  | 'PEER_REVIEWED'          // Academic journal with DOI
  | 'OFFICIAL_ANNOUNCEMENT'  // Company IR page, SEC filing, official press release
  | 'REPUTABLE_SECONDARY'    // FT, Reuters, Bloomberg, TechCrunch
  | 'TRADE_PUBLICATION'      // Industry analyst, trade press
  | 'AGGREGATOR'             // Aggregator or news compilation site
  | 'UNKNOWN';               // No provenance information

const SOURCE_QUALITY_SCORES: Record<SourceQualityTier, number> = {
  PATENT_RECORD: 96,
  PEER_REVIEWED: 93,
  OFFICIAL_ANNOUNCEMENT: 90,
  REPUTABLE_SECONDARY: 78,
  TRADE_PUBLICATION: 68,
  AGGREGATOR: 50,
  UNKNOWN: 35,
};

const REPUTABLE_DOMAINS = [
  'ft.com', 'reuters.com', 'bloomberg.com', 'wsj.com',
  'economist.com', 'nature.com', 'science.org', 'arxiv.org',
  'techcrunch.com', 'theverge.com', 'wired.com', 'arstechnica.com',
];

export function scoreSourceQuality(evidence: EvidenceModel): number {
  // 1. Explicit provenance takes priority
  if (evidence.provenance) {
    const p = evidence.provenance;
    if (p.primaryOrSecondary === 'PRIMARY') {
      if (evidence.sourceType === 'PATENT') return SOURCE_QUALITY_SCORES.PATENT_RECORD;
      if (p.peerReviewed) return SOURCE_QUALITY_SCORES.PEER_REVIEWED;
      if (p.officialAnnouncement) return SOURCE_QUALITY_SCORES.OFFICIAL_ANNOUNCEMENT;
    }
  }

  // 2. SourceType heuristic
  const typeMap: Partial<Record<SourceType, SourceQualityTier>> = {
    PATENT: 'PATENT_RECORD',
    RESEARCH: 'PEER_REVIEWED',
    COMPANY: 'OFFICIAL_ANNOUNCEMENT',
    REGULATORY: 'OFFICIAL_ANNOUNCEMENT',
    NEWS: 'REPUTABLE_SECONDARY',
    COMPETITOR: 'TRADE_PUBLICATION',
    WEB: 'AGGREGATOR',
    PUBLIC_DATA: 'TRADE_PUBLICATION',
  };
  let tier: SourceQualityTier = typeMap[evidence.sourceType] || 'UNKNOWN';

  // 3. Domain reputation override for NEWS/WEB
  if ((evidence.sourceType === 'NEWS' || evidence.sourceType === 'WEB') && evidence.url) {
    const urlLower = evidence.url.toLowerCase();
    const isReputable = REPUTABLE_DOMAINS.some((d) => urlLower.includes(d));
    if (isReputable) tier = 'REPUTABLE_SECONDARY';
    else if (tier === 'REPUTABLE_SECONDARY') tier = 'TRADE_PUBLICATION';
  }

  // 4. SourceQuality field on the evidence itself
  if (evidence.sourceQuality === 'PRIMARY') {
    return Math.max(SOURCE_QUALITY_SCORES[tier], SOURCE_QUALITY_SCORES.OFFICIAL_ANNOUNCEMENT);
  }

  return SOURCE_QUALITY_SCORES[tier];
}

// ==================================================
// CLAIM EXTRACTION ENGINE
// Extracts normalized claim statements from evidence
// using Gemini semantic reasoning when a key is available,
// falling back to a deterministic rule-based extractor.
// ==================================================

export interface ExtractedClaim {
  statement: string;
  topic: string;
  entities: string[];
  temporalScope?: string;
  scopeNote?: string;
  confidence: number;
}

// Deterministic claim extractor — parses the title + summary
// for positive/negative sentiment signals and temporal markers.
function deterministicExtract(evidence: EvidenceModel, investigationEntities: string[]): ExtractedClaim {
  const text = `${evidence.title}. ${evidence.summary}`.toLowerCase();

  // Extract year references from text
  const yearMatches = text.match(/\b(20\d\d)\b/g) || [];
  const temporalScope = yearMatches.length > 0
    ? [...new Set(yearMatches)].join(' / ')
    : undefined;

  // Quarter references
  const qtrMatches = text.match(/\b(q[1-4]\s?20\d\d)\b/gi) || [];
  const scopeNote = qtrMatches.length > 0 ? `Period: ${qtrMatches[0]}` : undefined;

  // Normalize key financial/strategic verbs
  const positiveVerbs = ['increased', 'expanded', 'accelerated', 'raised', 'grew', 'launched', 'announced', 'filed'];
  const negativeVerbs = ['reduced', 'cut', 'declined', 'decreased', 'withdrew', 'halted', 'paused', 'cancelled'];

  let sentiment = 'neutral';
  if (positiveVerbs.some((v) => text.includes(v))) sentiment = 'positive';
  else if (negativeVerbs.some((v) => text.includes(v))) sentiment = 'negative';

  // Build clean statement from title
  const statement = evidence.title.replace(/\s+/g, ' ').trim();

  // Extract entities from investigation context or evidence metadata
  const entities = investigationEntities.filter(
    (e) => text.includes(e.toLowerCase())
  );

  return {
    statement,
    topic: investigationEntities[0] || 'Strategic Analysis',
    entities: entities.length > 0 ? entities : [investigationEntities[0] || 'Unknown'],
    temporalScope,
    scopeNote,
    confidence: scoreSourceQuality(evidence),
  };
}

// LLM-powered extractor that uses Gemini to produce a semantic claim
async function llmExtract(
  evidence: EvidenceModel,
  investigationEntities: string[]
): Promise<ExtractedClaim> {
  const prompt = `You are an intelligence analyst. Given the following evidence item, extract a single normalized claim.

Evidence Title: ${evidence.title}
Evidence Summary: ${evidence.summary}
Source: ${evidence.source} (${evidence.sourceType})
Published: ${evidence.publishedAt || evidence.date || 'unknown date'}
URL: ${evidence.url || 'N/A'}
Known Investigation Entities: ${investigationEntities.join(', ')}

Output ONLY valid JSON matching this schema:
{
  "statement": "A single concise factual claim in the format: [Entity] [verb phrase] [object/metric] [optional qualifier]",
  "topic": "The primary topic/entity this claim is about",
  "entities": ["array", "of", "entities", "mentioned"],
  "temporalScope": "Year or quarter period (e.g. '2026-Q1') or null",
  "scopeNote": "Any geographic or segment qualifier (e.g. 'North America enterprise') or null"
}`;

  try {
    const raw = await defaultLLMProvider.complete({
      prompt,
      systemPrompt: 'You are a structured intelligence data extractor. Output only valid JSON, no markdown code fences.',
      temperature: 0.1,
      maxTokens: 400,
    });

    // Strip markdown fences if present
    const cleaned = raw.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      statement: parsed.statement || evidence.title,
      topic: parsed.topic || investigationEntities[0] || 'Strategic Analysis',
      entities: Array.isArray(parsed.entities) ? parsed.entities : [investigationEntities[0]],
      temporalScope: parsed.temporalScope || undefined,
      scopeNote: parsed.scopeNote || undefined,
      confidence: scoreSourceQuality(evidence),
    };
  } catch {
    // Fallback to deterministic
    return deterministicExtract(evidence, investigationEntities);
  }
}

export class ClaimExtractionEngine {
  /**
   * Extract normalized claims from a list of evidence items.
   * Saves each claim to the DB and annotates the evidence with claim IDs.
   */
  async extractClaims(
    investigationId: string,
    evidenceItems: EvidenceModel[],
    investigationEntities: string[],
    useLLM: boolean = true
  ): Promise<ClaimModel[]> {
    const claims: ClaimModel[] = [];

    for (const ev of evidenceItems) {
      // Skip evidence without meaningful title/summary
      if (!ev.title || !ev.summary) continue;

      const extracted = useLLM
        ? await llmExtract(ev, investigationEntities)
        : deterministicExtract(ev, investigationEntities);

      const claim = await dbRepository.createClaim({
        investigationId,
        statement: extracted.statement,
        topic: extracted.topic,
        entities: extracted.entities,
        evidenceIds: [ev.id],
        supportingEvidenceIds: [ev.id],
        contradictingEvidenceIds: [],
        confidence: extracted.confidence,
        status: 'INSUFFICIENT_EVIDENCE',
        temporalScope: extracted.temporalScope,
        scopeNote: extracted.scopeNote,
        sourceQualityScore: extracted.confidence,
      });

      claims.push(claim);
    }

    return claims;
  }
}

export const defaultClaimExtractionEngine = new ClaimExtractionEngine();
