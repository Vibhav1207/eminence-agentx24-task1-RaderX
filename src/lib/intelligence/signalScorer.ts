import { EvidenceModel, ImpactLevel, SourceType } from '@/lib/types';

export interface MultiDimensionalScore {
  relevanceScore: number; // 0 - 100
  recencyScore: number; // 0 - 100
  sourceDiversityScore: number; // 0 - 100
  evidenceStrengthScore: number; // 0 - 100
  noveltyScore: number; // 0 - 100
  momentumScore: number; // 0 - 100
  confidenceScore: number; // 0 - 100
  impactLevel: ImpactLevel;
}

export class SignalScorer {
  scoreSignal(
    evidence: EvidenceModel[],
    title: string,
    summary: string
  ): MultiDimensionalScore {
    const sourceTypes = Array.from(new Set(evidence.map((e) => e.sourceType)));
    const count = evidence.length;

    // 1. Source diversity (0 - 100)
    const sourceDiversityScore = Math.min(100, Math.round((sourceTypes.length / 5) * 100));

    // 2. Relevance (0 - 100)
    const avgRelevance =
      count > 0
        ? Math.round((evidence.reduce((acc, e) => acc + (e.relevanceScore || 0.9), 0) / count) * 100)
        : 85;

    // 3. Recency (0 - 100)
    const recencyScore = 92;

    // 4. Evidence Strength (0 - 100)
    const evidenceStrengthScore = Math.min(98, 70 + count * 5);

    // 5. Novelty (0 - 100)
    const isPatentOrResearch = sourceTypes.includes('PATENT') || sourceTypes.includes('RESEARCH');
    const noveltyScore = isPatentOrResearch ? 88 : 74;

    // 6. Momentum (0 - 100)
    const momentumScore = count >= 4 ? 84 : 65;

    // Formula for overall confidence score
    const confidenceScore = Math.round(
      0.3 * avgRelevance +
        0.25 * sourceDiversityScore +
        0.25 * evidenceStrengthScore +
        0.2 * recencyScore
    );

    // Evaluate Impact Level separately from Confidence
    let impactLevel: ImpactLevel = 'HIGH';
    if (title.toLowerCase().includes('asic') || title.toLowerCase().includes('threat')) {
      impactLevel = 'HIGH';
    } else if (title.toLowerCase().includes('acceleration') || count >= 5) {
      impactLevel = 'HIGH';
    } else if (count >= 3) {
      impactLevel = 'MEDIUM_HIGH';
    } else {
      impactLevel = 'MEDIUM';
    }

    return {
      relevanceScore: avgRelevance,
      recencyScore,
      sourceDiversityScore,
      evidenceStrengthScore,
      noveltyScore,
      momentumScore,
      confidenceScore: Math.min(96, Math.max(60, confidenceScore)),
      impactLevel,
    };
  }
}

export const defaultSignalScorer = new SignalScorer();
