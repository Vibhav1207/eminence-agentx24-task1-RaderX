import {
  EvidenceModel,
  EntityModel,
  RelationshipModel,
  InvestigationModel,
  CorrelationResultModel,
  SourceType,
} from '@/lib/types';
import { defaultEventClusterer } from './eventClusterer';
import { defaultThemeDetector } from './themeDetector';

export class CorrelationEngine {
  correlate(
    evidence: EvidenceModel[],
    entities: EntityModel[],
    relationships: RelationshipModel[],
    investigation: InvestigationModel
  ): CorrelationResultModel {
    const now = new Date().toISOString();
    const sourceTypes = Array.from(new Set(evidence.map((e) => e.sourceType)));

    // Calculate source diversity score (0 - 100)
    // Diversity across RESEARCH, PATENT, NEWS, COMPETITOR, WEB, PUBLIC_DATA
    const uniqueSourceTypesCount = sourceTypes.length;
    const sourceDiversityScore = Math.min(100, Math.round((uniqueSourceTypesCount / 5) * 100));

    // Cluster duplicate events
    const clusters = defaultEventClusterer.clusterEvents(evidence);

    // Detect strategic themes
    const detectedThemes = defaultThemeDetector.detectThemes(evidence);

    const themesList = detectedThemes.map((t) => ({
      theme: t.theme,
      summary: t.summary,
      evidenceCount: t.evidenceIds.length,
      confidence: t.confidence,
    }));

    const patterns = [
      {
        pattern: 'Temporal Progression: Academic Research -> USPTO Patents -> Cloud Disclosures',
        significance: 'High confidence technological transition from research preprints to commercial rack deployments.',
      },
      {
        pattern: 'Cross-Source Convergence: Research + Patent + SEC EDGAR',
        significance: 'Multi-stream validation of sub-byte matrix execution architectures.',
      },
    ];

    return {
      id: `corr-${Date.now()}`,
      investigationId: investigation.id,
      evidenceIds: evidence.map((e) => e.id),
      entityIds: entities.map((e) => e.id),
      relationshipIds: relationships.map((r) => r.id),
      themes: themesList,
      patterns,
      supportingSources: sourceTypes,
      contradictingSources: [],
      sourceDiversityScore,
      confidence: Math.min(96, 75 + sourceDiversityScore * 0.2),
      createdAt: now,
    };
  }
}

export const defaultCorrelationEngine = new CorrelationEngine();
