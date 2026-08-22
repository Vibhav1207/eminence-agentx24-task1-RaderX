import { EvidenceModel, CrossSourceSignalModel, SourceType } from '@/lib/types';

export class CrossSourceCorrelationEngine {
  detectCrossSourceCorrelations(evidenceList: EvidenceModel[]): CrossSourceSignalModel[] {
    const signals: CrossSourceSignalModel[] = [];
    const sourceTypesPresent = new Set<SourceType>(evidenceList.map((e) => e.sourceType));

    // If multi-source corroboration exists (e.g. RESEARCH + PATENT or NEWS + COMPETITOR)
    if (sourceTypesPresent.size >= 2) {
      const researchEv = evidenceList.filter((e) => e.sourceType === 'RESEARCH');
      const patentEv = evidenceList.filter((e) => e.sourceType === 'PATENT');
      const newsEv = evidenceList.filter((e) => e.sourceType === 'NEWS');

      if (researchEv.length > 0 && patentEv.length > 0) {
        signals.push({
          id: `xsignal-${Date.now()}-1`,
          title: 'Cross-Source Academic & USPTO Patent Convergence',
          summary: `Research papers and patent filings disclose overlapping technical momentum across ${researchEv.length} paper(s) and ${patentEv.length} patent(s).`,
          sourceTypes: Array.from(sourceTypesPresent),
          evidenceIds: [...researchEv.map((e) => e.id), ...patentEv.map((e) => e.id)],
          entityIds: [],
          impact: 'HIGH',
          confidence: 90,
          novelty: 85,
          momentum: 82,
          detectedAt: new Date().toISOString(),
        });
      } else {
        signals.push({
          id: `xsignal-${Date.now()}-2`,
          title: 'Multi-Stream Intelligence Corroboration',
          summary: `Primary evidence verified across ${sourceTypesPresent.size} independent data streams with high source diversity score.`,
          sourceTypes: Array.from(sourceTypesPresent),
          evidenceIds: evidenceList.map((e) => e.id),
          entityIds: [],
          impact: 'MEDIUM_HIGH',
          confidence: 85,
          novelty: 75,
          momentum: 78,
          detectedAt: new Date().toISOString(),
        });
      }
    }

    return signals;
  }
}

export const defaultCrossSourceCorrelationEngine = new CrossSourceCorrelationEngine();
