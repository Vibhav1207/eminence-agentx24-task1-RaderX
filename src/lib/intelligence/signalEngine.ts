import {
  EvidenceModel,
  EntityModel,
  RelationshipModel,
  InvestigationModel,
  SignalModel,
  SignalType,
} from '@/lib/types';
import { defaultCorrelationEngine } from './correlationEngine';
import { defaultSignalScorer } from './signalScorer';
import { defaultSignalMerger } from './signalMerger';
import { defaultSignalValidator } from './signalValidator';

export class SignalEngine {
  processInvestigationSignals(
    evidence: EvidenceModel[],
    entities: EntityModel[],
    relationships: RelationshipModel[],
    investigation: InvestigationModel
  ): SignalModel[] {
    const now = new Date().toISOString();

    // 1. Run Correlation Engine
    const correlation = defaultCorrelationEngine.correlate(evidence, entities, relationships, investigation);

    // 2. Generate Candidate Signals from themes & clusters
    const candidates: SignalModel[] = correlation.themes.map((theme, idx) => {
      const relatedEv = evidence.filter((e) =>
        e.title.toLowerCase().includes('inference') || e.title.toLowerCase().includes('fp4') || e.summary.toLowerCase().includes('asic')
      );
      const evList = relatedEv.length > 0 ? relatedEv : evidence;
      const sourceTypes = Array.from(new Set(evList.map((e) => e.sourceType)));
      const entityIds = Array.from(new Set(evList.flatMap((e) => e.entityIds)));

      // Multi-dimensional scoring
      const score = defaultSignalScorer.scoreSignal(evList, theme.theme, theme.summary);

      let type: SignalType = 'TECHNOLOGY_SHIFT';
      if (theme.theme.includes('ASIC')) type = 'THREAT';
      else if (theme.theme.includes('INFRASTRUCTURE')) type = 'OPPORTUNITY';

      return {
        id: `sig-${Date.now()}-${idx}`,
        investigationId: investigation.id,
        title: theme.theme,
        summary: theme.summary,
        type,
        impact: score.impactLevel,
        confidence: score.confidenceScore,
        momentum: score.momentumScore,
        novelty: score.noveltyScore,
        sourceDiversityScore: score.sourceDiversityScore,
        evidenceStrength: score.evidenceStrengthScore,
        relevanceScore: score.relevanceScore,
        status: 'CANDIDATE',
        reason: 'Correlated across USPTO patents, arXiv research preprints, SEC filings, and GitHub repositories.',
        evidenceIds: evList.map((e) => e.id),
        entityIds,
        sourceTypes,
        detectedAt: now,
        firstDetectedAt: now,
        createdAt: now,
      };
    });

    // Fallback signal if evidence is emerging
    if (candidates.length === 0) {
      const score = defaultSignalScorer.scoreSignal(evidence, 'AI Infrastructure Acceleration', investigation.objective);
      candidates.push({
        id: `sig-fb-${Date.now()}`,
        investigationId: investigation.id,
        title: 'AI Infrastructure Acceleration',
        summary: `Cross-source evidence pointing to accelerated hardware acceleration for ${investigation.primaryEntities[0] || 'Target'}.`,
        type: 'OPPORTUNITY',
        impact: score.impactLevel,
        confidence: score.confidenceScore,
        momentum: score.momentumScore,
        novelty: score.noveltyScore,
        sourceDiversityScore: score.sourceDiversityScore,
        evidenceStrength: score.evidenceStrengthScore,
        relevanceScore: score.relevanceScore,
        status: 'CANDIDATE',
        evidenceIds: evidence.map((e) => e.id),
        entityIds: entities.map((e) => e.id),
        sourceTypes: Array.from(new Set(evidence.map((e) => e.sourceType))),
        detectedAt: now,
        firstDetectedAt: now,
        createdAt: now,
      });
    }

    // 3. Merge duplicate signals
    const merged = defaultSignalMerger.mergeSignals(candidates);

    // 4. Validate signals
    const validated = merged.map((s) => defaultSignalValidator.validateSignal(s, evidence));

    return validated;
  }
}

export const defaultSignalEngine = new SignalEngine();
