import {
  ExecutiveBriefModel,
  InvestigationModel,
  EvidenceModel,
  SignalModel,
  ChangeItemModel,
  ProviderExecutionModel,
} from '@/lib/types';
import { dbRepository } from '@/lib/db/repository';
import { defaultRecommendationEngine } from './recommendationEngine';
import { normalizeConfidence } from '@/lib/utils/confidence';

export class ExecutiveBriefVersioner {
  async createOrUpdateBrief(
    investigation: InvestigationModel,
    evidence: EvidenceModel[],
    signals: SignalModel[],
    providerExecutions: ProviderExecutionModel[] = []
  ): Promise<ExecutiveBriefModel> {
    const existingVersions = await dbRepository.getExecutiveBriefVersions(investigation.id);
    const nextVersion = existingVersions.length > 0 ? existingVersions[0].version + 1 : 1;

    // Build Material Changes
    const changes: ChangeItemModel[] = evidence.slice(0, 5).map((ev, idx) => ({
      id: `change-${idx + 1}`,
      investigationId: investigation.id,
      title: `Material Discovery: ${ev.title.substring(0, 45)}...`,
      description: ev.summary,
      changeType: ev.sourceType === 'PATENT' ? 'STRATEGIC_SHIFT' : ev.sourceType === 'RESEARCH' ? 'EMERGING' : 'COMPETITIVE_MOVE',
      magnitude: ev.relevanceScore > 0.8 ? 'HIGH' : 'MEDIUM',
      confidence: Math.round(normalizeConfidence(ev.confidence)),
      evidenceIds: [ev.id],
      entityIds: ev.entityIds,
      detectedAt: ev.discoveredAt,
    }));

    // Extract threats & opportunities from synthesis intelligence
    const threats = investigation.intelligence?.threats || [];
    const opportunities = investigation.intelligence?.opportunities || [];

    // Generate recommendations
    const recommendations = await defaultRecommendationEngine.generateRecommendations(
      investigation,
      signals,
      threats,
      opportunities,
      evidence
    );

    // Calculate source coverage based on actual provider executions
    const sourceCoverage = this.calculateSourceCoverage(providerExecutions, evidence);

    const brief = await dbRepository.saveExecutiveBrief({
      investigationId: investigation.id,
      version: nextVersion,
      title: `RADARX EXECUTIVE BRIEF v${nextVersion} • ${investigation.title}`,
      executiveSummary: investigation.executiveSummary || `Executive intelligence assessment synthesized from ${evidence.length} primary source evidence items and ${signals.length} correlated signals.`,
      keyChanges: changes,
      strategicImplications: [
        {
          topic: investigation.technology || 'Technology Acceleration',
          implication: 'Increased primary source activity across academic preprints and patent filings indicates rapid technical evolution.',
          evidenceIds: evidence.slice(0, 3).map((e) => e.id),
        },
      ],
      threats,
      opportunities,
      recommendedActions: recommendations,
      watchItems: investigation.intelligence?.watchItems || [],
      confidence: normalizeConfidence(investigation.confidenceScore ?? investigation.confidence ?? 90),
      sourceCoverage,
      providerExecutions,
      evidenceIds: evidence.map((e) => e.id),
      signalIds: signals.map((s) => s.id),
      entityIds: investigation.primaryEntities,
    });

    return brief;
  }

  private calculateSourceCoverage(
    providerExecutions: ProviderExecutionModel[],
    evidence: EvidenceModel[]
  ): ExecutiveBriefModel['sourceCoverage'] {
    const categories: Array<'RESEARCH' | 'PATENT' | 'NEWS' | 'COMPETITOR' | 'WEB'> = [
      'RESEARCH', 'PATENT', 'NEWS', 'COMPETITOR', 'WEB'
    ];

    const coverage: ExecutiveBriefModel['sourceCoverage'] = {
      RESEARCH: 'NO_EVIDENCE',
      PATENT: 'NO_EVIDENCE',
      NEWS: 'NO_EVIDENCE',
      COMPETITOR: 'NO_EVIDENCE',
      WEB: 'NO_EVIDENCE',
    };

    for (const category of categories) {
      const executions = providerExecutions.filter(e => e.category === category);
      const categoryEvidence = evidence.filter(e => e.sourceType === category);

      if (executions.length === 0) {
        coverage[category] = 'UNAVAILABLE';
        continue;
      }

      const hasSuccessful = executions.some(e => e.status === 'SUCCESS');
      const hasPartial = executions.some(e => e.status === 'PARTIAL');
      const totalResults = executions.reduce((sum, e) => sum + e.resultCount, 0);
      const hasEvidence = categoryEvidence.length > 0;

      if (!hasSuccessful && !hasPartial) {
        coverage[category] = 'UNAVAILABLE';
      } else if (hasSuccessful && totalResults > 0 && hasEvidence) {
        coverage[category] = 'AVAILABLE';
      } else if (hasPartial || (hasSuccessful && totalResults === 0)) {
        coverage[category] = 'PARTIAL';
      } else if (hasSuccessful && totalResults === 0 && !hasEvidence) {
        coverage[category] = 'NO_EVIDENCE';
      } else {
        coverage[category] = 'PARTIAL';
      }
    }

    return coverage;
  }
}

export const defaultExecutiveBriefVersioner = new ExecutiveBriefVersioner();