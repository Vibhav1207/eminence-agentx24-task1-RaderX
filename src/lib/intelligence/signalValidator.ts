import { SignalModel, EvidenceModel, SignalStatus } from '@/lib/types';

export class SignalValidator {
  validateSignal(signal: SignalModel, evidenceList: EvidenceModel[]): SignalModel {
    const now = new Date().toISOString();
    const relatedEv = evidenceList.filter((e) => signal.evidenceIds.includes(e.id));

    // Check evidence traceability
    const traceability = relatedEv.map((e) => ({
      evidenceId: e.id,
      title: e.title,
      sourceType: e.sourceType,
      url: e.url,
    }));

    // Detect contradictions (e.g. research indicates acceleration vs news indicates decline)
    let status: SignalStatus = 'VALIDATED';
    let contradictionNote: string | undefined = undefined;

    const hasResearch = relatedEv.some((e) => e.sourceType === 'RESEARCH');
    const hasNews = relatedEv.some((e) => e.sourceType === 'NEWS');

    if (relatedEv.length < 2) {
      status = 'WEAK';
    } else if (hasResearch && hasNews && signal.confidence < 70) {
      status = 'CONFLICTING_EVIDENCE';
      contradictionNote = 'Research preprints indicate technology acceleration whereas recent news disclosures show mixed adoption speed.';
    }

    // Build structured explanation matrix
    const explanationMatrix = {
      what: signal.title,
      why: signal.summary,
      evidence: `${relatedEv.length} cross-source items across ${signal.sourceTypes.join(', ')}`,
      impact: `${signal.impact} strategic relevance`,
      confidence: `${signal.confidence}% cross-stream support`,
      momentum: `+${signal.momentum}% temporal velocity`,
      entities: signal.entityIds,
      timeframe: 'Last 30 days',
    };

    return {
      ...signal,
      status,
      validatedAt: status === 'VALIDATED' ? now : undefined,
      lastUpdatedAt: now,
      contradictionNote,
      explanationMatrix,
      traceability,
    };
  }
}

export const defaultSignalValidator = new SignalValidator();
