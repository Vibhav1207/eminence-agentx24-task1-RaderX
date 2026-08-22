import {
  ExecutiveBriefModel,
  InvestigationModel,
  EvidenceModel,
  SignalModel,
  ChangeItemModel,
} from '@/lib/types';
import { dbRepository } from '@/lib/db/repository';
import { defaultRecommendationEngine } from './recommendationEngine';

export class ExecutiveBriefVersioner {
  async createOrUpdateBrief(
    investigation: InvestigationModel,
    evidence: EvidenceModel[],
    signals: SignalModel[]
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
      confidence: Math.round(ev.confidence * 100),
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
      confidence: investigation.confidenceScore ?? investigation.confidence ?? 90,
      sourceCoverage: {
        RESEARCH: 'AVAILABLE',
        PATENT: 'AVAILABLE',
        NEWS: 'AVAILABLE',
        COMPETITOR: 'AVAILABLE',
        WEB: 'AVAILABLE',
      },
      evidenceIds: evidence.map((e) => e.id),
      signalIds: signals.map((s) => s.id),
      entityIds: investigation.primaryEntities,
    });

    return brief;
  }
}

export const defaultExecutiveBriefVersioner = new ExecutiveBriefVersioner();
