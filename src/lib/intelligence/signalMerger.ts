import { SignalModel } from '@/lib/types';

export class SignalMerger {
  mergeSignals(signals: SignalModel[]): SignalModel[] {
    const merged: SignalModel[] = [];
    const processedIds = new Set<string>();

    for (let i = 0; i < signals.length; i++) {
      const primary = signals[i];
      if (processedIds.has(primary.id)) continue;

      let current = { ...primary };
      processedIds.add(primary.id);

      const normTitle = primary.title.toLowerCase().replace(/[^a-z0-9]/g, '');

      for (let j = i + 1; j < signals.length; j++) {
        const candidate = signals[j];
        if (processedIds.has(candidate.id)) continue;

        const candNormTitle = candidate.title.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (normTitle.includes(candNormTitle.slice(0, 12)) || candNormTitle.includes(normTitle.slice(0, 12))) {
          // Merge candidate evidence & entities into current signal
          const combinedEvidence = Array.from(new Set([...current.evidenceIds, ...candidate.evidenceIds]));
          const combinedEntities = Array.from(new Set([...current.entityIds, ...candidate.entityIds]));
          const combinedSources = Array.from(new Set([...current.sourceTypes, ...candidate.sourceTypes]));

          current = {
            ...current,
            evidenceIds: combinedEvidence,
            entityIds: combinedEntities,
            sourceTypes: combinedSources,
            confidence: Math.max(current.confidence, candidate.confidence),
            momentum: Math.max(current.momentum, candidate.momentum),
          };
          processedIds.add(candidate.id);
        }
      }

      merged.push(current);
    }

    return merged;
  }
}

export const defaultSignalMerger = new SignalMerger();
