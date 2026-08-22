import { EvidenceModel, ChangeSetModel } from '@/lib/types';
import { dbRepository } from '@/lib/db/repository';

export class ChangeDetector {
  /**
   * Generates a deterministic normalized fingerprint hash for an evidence item.
   */
  generateFingerprint(evidence: EvidenceModel): string {
    const rawUrl = (evidence.url || '').split('?')[0].toLowerCase();
    const cleanTitle = (evidence.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const source = (evidence.source || 'provider').toLowerCase();
    const doi = (evidence.doi?.[0] || '').toLowerCase();
    const patent = (evidence.patentNumber?.[0] || '').toLowerCase();

    const identityKey = doi || patent || rawUrl || cleanTitle;
    return `${source}:${identityKey}`;
  }

  /**
   * Compares incoming evidence against persistent evidence fingerprints to isolate net-new items.
   */
  async detectChanges(
    incomingEvidence: EvidenceModel[],
    existingEvidence: EvidenceModel[] = []
  ): Promise<ChangeSetModel> {
    const now = new Date().toISOString();
    const newEvidence: EvidenceModel[] = [];
    const changedEvidence: EvidenceModel[] = [];
    const seenHashes = new Set<string>();

    for (const item of incomingEvidence) {
      const hash = this.generateFingerprint(item);

      // Check if hash is seen in database or current run
      const isAlreadySeen = (await dbRepository.isEvidenceSeen(hash)) || seenHashes.has(hash);

      if (!isAlreadySeen) {
        newEvidence.push(item);
        seenHashes.add(hash);
        // Save fingerprint persistently
        await dbRepository.saveEvidenceFingerprint({
          hash,
          source: item.source,
          canonicalUrl: item.url || '',
          title: item.title,
          firstSeenAt: now,
          lastSeenAt: now,
        });
      } else {
        // Evidence was seen before
        changedEvidence.push(item);
      }
    }

    const totalCount = incomingEvidence.length || 1;
    const deltaMomentum = Math.round((newEvidence.length / totalCount) * 100);

    // Extract accelerated technical & strategic themes
    const acceleratedThemes = Array.from(
      new Set(
        newEvidence
          .map((e) => e.title.split(' ').filter((w) => w.length > 5))
          .flat()
          .slice(0, 5)
      )
    );

    return {
      newEvidence,
      changedEvidence,
      acceleratedThemes,
      deltaMomentum,
    };
  }
}

export const defaultChangeDetector = new ChangeDetector();
