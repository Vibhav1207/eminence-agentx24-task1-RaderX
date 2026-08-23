import { SourceResult } from '@/lib/providers/sourceProvider';
import { EvidenceModel } from '@/lib/types';
import { defaultEntityResolver } from './entityResolver';
import { defaultRelevanceScorer } from './relevanceScorer';
import { InvestigationContext } from '@/lib/intelligence/investigationContext';

export class EvidenceNormalizer {
  /**
   * Normalizes a raw SourceResult into a canonical EvidenceModel with strict relevance gating.
   */
  normalizeSourceResult(
    result: SourceResult,
    investigationId: string,
    agentId?: string,
    context?: InvestigationContext
  ): {
    evidence: EvidenceModel;
    entityIds: string[];
  } {
    const now = new Date().toISOString();

    // Resolve entity candidates
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

    // Requirement 2 & 3: Evaluate Relevance Gate
    const defaultCtx: InvestigationContext = context || {
      objective: result.queryUsed || result.title,
      entities: result.entityCandidates || ['Target Entity'],
      domain: 'Technology & Strategy',
      subtopics: ['competition', 'platform', 'strategy'],
      comparisonTargets: [],
      requiredEvidenceTypes: ['RESEARCH', 'PATENT', 'NEWS', 'WEB'],
      excludedTopics: [],
      timeRange: 'Last 30 days',
    };

    const relevanceEval = defaultRelevanceScorer.evaluateRelevance(result, defaultCtx);

    const hasValidUrl = Boolean(result.url && /^https?:\/\/.+/i.test(result.url));
    const hasValidTitle = Boolean(result.title && result.title.trim().length > 3);

    const isVerified =
      hasValidUrl &&
      hasValidTitle &&
      !isSyntheticPattern &&
      relevanceEval.passed &&
      result.verificationStatus !== 'REJECTED';

    const verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'REJECTED' = isVerified
      ? 'VERIFIED'
      : isSyntheticPattern || !relevanceEval.passed
      ? 'REJECTED'
      : 'UNVERIFIED';

    const verificationReason = isVerified
      ? `Passed provenance, canonical URL, and relevance gate (Score: ${relevanceEval.score})`
      : isSyntheticPattern
      ? 'Rejected: Synthetic / fabricated template pattern detected'
      : relevanceEval.rejectionReason || 'Rejected: Below relevance threshold 0.70';

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
      relevanceScore: relevanceEval.score,
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
        relevanceScore: relevanceEval.score,
        ...(result.rawMetadata || {}),
      },
      createdAt: now,
    };

    return { evidence, entityIds };
  }

  /**
   * Requirement 11 & 16: Filters and deduplicates evidence items to return ONLY verified items.
   */
  verifyAndDeduplicate(evidenceItems: EvidenceModel[]): EvidenceModel[] {
    const seenDois = new Set<string>();
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();
    const seenExternalIds = new Set<string>();
    const verifiedList: EvidenceModel[] = [];

    for (const item of evidenceItems) {
      // Hard Gate: Only VERIFIED items with relevanceScore >= 0.70 pass
      if (item.verificationStatus !== 'VERIFIED' || (item.relevanceScore || 0) < 0.70) {
        continue;
      }

      // Canonical URL, DOI, and External ID Deduplication
      const canonicalUrl = item.url ? item.url.split('?')[0].toLowerCase() : '';
      const doi = item.doi?.[0] ? item.doi[0].toLowerCase() : '';
      const extId = item.externalId ? item.externalId.toLowerCase() : '';
      const normTitle = item.title ? item.title.toLowerCase().replace(/[^a-z0-9]/g, '') : '';

      if (doi && seenDois.has(doi)) continue;
      if (canonicalUrl && seenUrls.has(canonicalUrl)) continue;
      if (extId && seenExternalIds.has(extId)) continue;
      if (normTitle && seenTitles.has(normTitle)) continue;

      if (doi) seenDois.add(doi);
      if (canonicalUrl) seenUrls.add(canonicalUrl);
      if (extId) seenExternalIds.add(extId);
      if (normTitle) seenTitles.add(normTitle);

      verifiedList.push(item);
    }

    return verifiedList;
  }
}

export const defaultEvidenceNormalizer = new EvidenceNormalizer();
