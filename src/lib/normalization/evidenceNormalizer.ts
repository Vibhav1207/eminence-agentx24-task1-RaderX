import { SourceResult } from '@/lib/providers/sourceProvider';
import { EvidenceModel } from '@/lib/types';
import { defaultEntityResolver } from './entityResolver';

export class EvidenceNormalizer {
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

    const evidence: EvidenceModel = {
      id: `ev-norm-${result.id}`,
      investigationId,
      title: result.title,
      summary: result.summary,
      source: `${result.provider} (${result.authors?.slice(0, 2).join(', ') || 'Source'})`,
      sourceType: result.sourceType,
      url: result.url,
      publishedAt: result.publishedAt,
      discoveredAt: result.retrievedAt || now,
      entityIds: entityIds.length > 0 ? entityIds : ['ent-nvda'],
      agentId: agentId || 'agent-source',
      relevanceScore: result.relevanceScore / 100,
      confidence: result.confidence,
      metrics: result.metrics || [],
      metadata: {
        provider: result.provider,
        queryUsed: result.queryUsed,
        sourceQuality: result.sourceQuality,
        retrievedAt: result.retrievedAt,
        ...(result.rawMetadata || {}),
      },
      createdAt: now,
    };

    return { evidence, entityIds };
  }
}

export const defaultEvidenceNormalizer = new EvidenceNormalizer();
