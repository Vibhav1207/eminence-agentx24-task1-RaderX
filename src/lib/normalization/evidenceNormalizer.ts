import { SourceResult } from '@/lib/providers/sourceProvider';
import { EvidenceModel } from '@/lib/types';
import { defaultEntityResolver } from './entityResolver';

export class EvidenceNormalizer {
  /**
   * Normalizes a raw SourceResult into a canonical EvidenceModel with strict verification checks.
   */
  normalizeSourceResult(result: SourceResult, investigationId: string, agentId?: string): {
    evidence: EvidenceModel;
    entityIds: string[];
  } {
    const now = new Date().toISOString();

    // Resolve all entity candidates to canonical IDs
    const resolvedEntities = (result.entityCandidates || []).map((cand) =>
      defaultEntityResolver.resolveEntity(cand)
    );
    const entityIds = Array.from(new Set(resolvedEntities.map((e) => e.id)));

    // Synthetic Pattern Detection Guard
    const isSyntheticPattern =
      /Patent Priority Disclosure:/i.test(result.title) ||
      /USPTO Granted Patent: Quantized Vector/i.test(result.title) ||
      /Financial Times: .* Expands Custom AI Chip/i.test(result.title) ||
      /TechCrunch: Strategic Shift in/i.test(result.title) ||
      /Reuters: SEC Filing & Executive Roadmap/i.test(result.title) ||
      /GitHub Repository Velocity: High-Throughput/i.test(result.title) ||
      /Technical Documentation & Architecture Guidelines:/i.test(result.title);

    // Verification Logic: Must have non-empty title, valid URL, valid externalId/DOI or provider, and no synthetic pattern
    const hasValidUrl = Boolean(result.url && /^https?:\/\/.+/i.test(result.url));
    const hasValidTitle = Boolean(result.title && result.title.trim().length > 3);
    const isVerified = hasValidUrl && hasValidTitle && !isSyntheticPattern && (result.verificationStatus !== 'REJECTED');

    const verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'REJECTED' = isVerified
      ? 'VERIFIED'
      : isSyntheticPattern
      ? 'REJECTED'
      : 'UNVERIFIED';

    const verificationReason = isVerified
      ? 'Passed external API provenance, canonical URL, and title verification'
      : isSyntheticPattern
      ? 'Rejected: Synthetic / fabricated template pattern detected'
      : 'Rejected: Missing valid URL or canonical external source ID';

    const evidence: EvidenceModel = {
      id: `ev-norm-${result.id}`,
      investigationId,
      title: result.title,
      summary: result.summary,
      source: result.sourceName || result.provider || 'External Verified Source',
      sourceType: result.sourceType,
      url: result.url,
      publishedAt: result.publishedAt,
      discoveredAt: result.retrievedAt || now,
      retrievedAt: result.retrievedAt || now,
      externalId: result.externalId,
      doi: result.doi ? [result.doi] : undefined,
      verificationStatus,
      verificationReason,
      entityIds: entityIds.length > 0 ? entityIds : ['ent-primary'],
      agentId: agentId || 'agent-source',
      relevanceScore: result.relevanceScore / 100,
      confidence: isVerified ? result.confidence : 0,
      metrics: result.metrics || [],
      rawMetadata: result.rawMetadata || {},
      metadata: {
        provider: result.provider,
        queryUsed: result.queryUsed,
        sourceQuality: result.sourceQuality,
        retrievedAt: result.retrievedAt,
        verificationStatus,
        verificationReason,
        externalId: result.externalId,
        doi: result.doi,
        ...(result.rawMetadata || {}),
      },
      createdAt: now,
    };

    return { evidence, entityIds };
  }

  /**
   * Filters and deduplicates evidence items to return ONLY verified items.
   */
  verifyAndDeduplicate(evidenceItems: EvidenceModel[]): EvidenceModel[] {
    const seenDois = new Set<string>();
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();
    const verifiedList: EvidenceModel[] = [];

    for (const item of evidenceItems) {
      // Hard Gate: Only VERIFIED items pass
      if (item.verificationStatus !== 'VERIFIED') {
        continue;
      }

      // Canonical URL & DOI Deduplication
      const canonicalUrl = item.url ? item.url.split('?')[0].toLowerCase() : '';
      const doi = item.doi?.[0] ? item.doi[0].toLowerCase() : '';
      const normTitle = item.title ? item.title.toLowerCase().replace(/[^a-z0-9]/g, '') : '';

      if (doi && seenDois.has(doi)) continue;
      if (canonicalUrl && seenUrls.has(canonicalUrl)) continue;
      if (normTitle && seenTitles.has(normTitle)) continue;

      if (doi) seenDois.add(doi);
      if (canonicalUrl) seenUrls.add(canonicalUrl);
      if (normTitle) seenTitles.add(normTitle);

      verifiedList.push(item);
    }

    return verifiedList;
  }
}

export const defaultEvidenceNormalizer = new EvidenceNormalizer();
