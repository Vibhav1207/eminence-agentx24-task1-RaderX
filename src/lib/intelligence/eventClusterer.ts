import { EvidenceModel, EventClusterModel, SourceType } from '@/lib/types';

export class EventClusterer {
  clusterEvents(evidenceList: EvidenceModel[]): EventClusterModel[] {
    const clusters: EventClusterModel[] = [];
    const processedIds = new Set<string>();

    for (let i = 0; i < evidenceList.length; i++) {
      const primary = evidenceList[i];
      if (processedIds.has(primary.id)) continue;

      const matched: EvidenceModel[] = [primary];
      processedIds.add(primary.id);

      const normTitle = primary.title.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Find related evidence sharing title similarity, entity overlap, or canonical URL
      for (let j = i + 1; j < evidenceList.length; j++) {
        const candidate = evidenceList[j];
        if (processedIds.has(candidate.id)) continue;

        const candNormTitle = candidate.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        const sharedEntities = primary.entityIds.filter((id) => candidate.entityIds.includes(id));

        const isTitleSimilar = normTitle.includes(candNormTitle.slice(0, 15)) || candNormTitle.includes(normTitle.slice(0, 15));
        const isSameUrl = primary.url && candidate.url && primary.url === candidate.url;

        if (isSameUrl || (isTitleSimilar && sharedEntities.length > 0)) {
          matched.push(candidate);
          processedIds.add(candidate.id);
        }
      }

      const sourceTypes = Array.from(new Set(matched.map((e) => e.sourceType)));
      const allEntities = Array.from(new Set(matched.flatMap((e) => e.entityIds)));

      let eventType: EventClusterModel['eventType'] = 'MARKET_SHIFT';
      if (sourceTypes.includes('PATENT')) eventType = 'PATENT_ACTIVITY';
      else if (sourceTypes.includes('RESEARCH')) eventType = 'RESEARCH_BREAKTHROUGH';
      else if (sourceTypes.includes('COMPETITOR')) eventType = 'COMPETITOR_MOVE';
      else if (sourceTypes.includes('NEWS')) eventType = 'PARTNERSHIP';

      clusters.push({
        id: `cluster-${Date.now()}-${i}`,
        title: primary.title,
        eventType,
        dateRange: primary.publishedAt || primary.discoveredAt,
        entityIds: allEntities,
        evidenceIds: matched.map((e) => e.id),
        sourceCount: matched.length,
        sourceDiversity: sourceTypes.length,
        confidence: Math.min(95, 80 + matched.length * 3),
      });
    }

    return clusters;
  }
}

export const defaultEventClusterer = new EventClusterer();
