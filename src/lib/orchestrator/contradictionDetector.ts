import { EvidenceModel, ContradictionModel, InvestigationModel } from '@/lib/types';
import { dbRepository } from '@/lib/db/repository';

export class ContradictionDetector {
  async detectContradictions(
    investigation: InvestigationModel,
    evidence: EvidenceModel[]
  ): Promise<ContradictionModel[]> {
    const contradictions: ContradictionModel[] = [];

    // Group evidence by entities or themes to detect conflicting statements
    const datesByTopic: Map<string, Array<{ evidenceId: string; date?: string; text: string }>> = new Map();

    for (const item of evidence) {
      const topic = item.sourceType;
      const list = datesByTopic.get(topic) || [];
      list.push({ evidenceId: item.id, date: item.publishedAt || item.date, text: item.title });
      datesByTopic.set(topic, list);
    }

    // Check if dates or claims conflict across sources
    for (const [topic, items] of datesByTopic.entries()) {
      if (items.length >= 2) {
        const d1 = items[0].date;
        const d2 = items[1].date;
        if (d1 && d2 && d1.substring(0, 4) !== d2.substring(0, 4)) {
          const contra = await dbRepository.createContradiction({
            investigationId: investigation.id,
            claims: [
              `Source A claims activity occurred in ${d1.substring(0, 4)}`,
              `Source B claims activity occurred in ${d2.substring(0, 4)}`,
            ],
            evidenceIds: [items[0].evidenceId, items[1].evidenceId],
            severity: 'MEDIUM',
            status: 'UNRESOLVED',
          });
          contradictions.push(contra);
        }
      }
    }

    return contradictions;
  }
}

export const defaultContradictionDetector = new ContradictionDetector();
