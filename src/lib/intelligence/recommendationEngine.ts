import {
  InvestigationModel,
  SignalModel,
  EvidenceModel,
  ExecutiveThreat,
  ExecutiveOpportunity,
  ExecutiveRecommendationModel,
} from '@/lib/types';
import { dbRepository } from '@/lib/db/repository';

export class RecommendationEngine {
  async generateRecommendations(
    investigation: InvestigationModel,
    signals: SignalModel[],
    threats: ExecutiveThreat[],
    opportunities: ExecutiveOpportunity[],
    evidence: EvidenceModel[]
  ): Promise<ExecutiveRecommendationModel[]> {
    const recommendations: ExecutiveRecommendationModel[] = [];

    // 1. Generate recommendation from top threats
    for (const threat of threats) {
      const rec = await dbRepository.saveExecutiveRecommendation({
        investigationId: investigation.id,
        title: `Mitigate Threat: ${threat.title}`,
        action: threat.recommendedResponse || `Formulate strategic counter-measure against ${threat.title}.`,
        reason: `High-impact competitive move detected across ${threat.evidenceIds.length} primary source evidence item(s).`,
        priority: threat.impact === 'CRITICAL' || threat.impact === 'HIGH' ? 'CRITICAL' : 'HIGH',
        impact: threat.impact,
        confidence: threat.confidence,
        timeHorizon: 'IMMEDIATE',
        evidenceIds: threat.evidenceIds,
        signalIds: signals.map((s) => s.id),
        entityIds: threat.competitorEntities,
        status: 'RECOMMENDED',
      });
      recommendations.push(rec);
    }

    // 2. Generate recommendation from top opportunities
    for (const opp of opportunities) {
      const rec = await dbRepository.saveExecutiveRecommendation({
        investigationId: investigation.id,
        title: `Capitalize on Opportunity: ${opp.title}`,
        action: opp.recommendedAction || `Accelerate R&D investments in ${investigation.technology || 'target technology'}.`,
        reason: `Emerging technical shift corroborated across academic & patent disclosures.`,
        priority: 'HIGH',
        impact: opp.potentialImpact,
        confidence: opp.confidence,
        timeHorizon: opp.timeHorizon || 'SHORT_TERM',
        evidenceIds: opp.evidenceIds,
        signalIds: signals.map((s) => s.id),
        entityIds: opp.entities,
        status: 'RECOMMENDED',
      });
      recommendations.push(rec);
    }

    return recommendations;
  }
}

export const defaultRecommendationEngine = new RecommendationEngine();
