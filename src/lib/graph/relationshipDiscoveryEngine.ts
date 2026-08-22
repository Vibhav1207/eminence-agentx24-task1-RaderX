import {
  EvidenceModel,
  EntityModel,
  GraphNodeModel,
  GraphEdgeModel,
  GraphRelationshipType,
  GraphNodeType,
} from '@/lib/types';
import { dbRepository } from '@/lib/db/repository';
import { defaultEntityResolver } from './entityResolver';

export class RelationshipDiscoveryEngine {
  async discoverGraphFromEvidence(
    investigationId: string,
    evidenceList: EvidenceModel[],
    entityList: EntityModel[]
  ): Promise<{ nodes: GraphNodeModel[]; edges: GraphEdgeModel[] }> {
    let activeEntities: EntityModel[] = [...entityList];

    // Ensure investigation primaryEntities are included in graph
    const inv = await dbRepository.getInvestigationById(investigationId);
    if (inv && inv.primaryEntities && inv.primaryEntities.length > 0) {
      for (const pEnt of inv.primaryEntities) {
        if (!activeEntities.some((e) => e.name.toLowerCase() === pEnt.toLowerCase())) {
          activeEntities.push({
            id: `ent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            investigationId,
            name: pEnt,
            type: 'COMPANY',
            description: `${pEnt} primary strategic entity.`,
            confidence: 85,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    // 1. Resolve entities into canonical profiles
    const profiles = await defaultEntityResolver.resolveAndSyncEntities(activeEntities);
    const nodeMap: Map<string, GraphNodeModel> = new Map();
    const createdEdges: GraphEdgeModel[] = [];

    // Create graph nodes for canonical entities
    for (const prof of profiles) {
      const nodeType: GraphNodeType = (prof.type as GraphNodeType) || 'COMPANY';
      const node = await dbRepository.createGraphNode({
        investigationId,
        entityId: prof.id,
        type: nodeType,
        label: prof.name,
        description: prof.description,
        importance: prof.importance,
        confidence: prof.confidence,
      });
      nodeMap.set(prof.name.toLowerCase(), node);
    }

    // 2. Discover evidence-backed nodes & edges from evidence items
    for (const ev of evidenceList) {
      let evNodeType: GraphNodeType = 'NEWS';
      if (ev.sourceType === 'RESEARCH') evNodeType = 'RESEARCH';
      else if (ev.sourceType === 'PATENT') evNodeType = 'PATENT';
      else if (ev.sourceType === 'WEB') evNodeType = 'PRODUCT';

      const evNode = await dbRepository.createGraphNode({
        investigationId,
        type: evNodeType,
        label: ev.title.substring(0, 45) + (ev.title.length > 45 ? '...' : ''),
        description: ev.summary,
        importance: Math.round(ev.relevanceScore * 100),
        confidence: Math.round(ev.confidence * 100),
        metadata: { url: ev.url, source: ev.source, sourceType: ev.sourceType },
      });

      // Link evidence node to active entities with supporting evidenceIds
      for (const ent of activeEntities) {
        const canonical = defaultEntityResolver.canonicalizeName(ent.name).toLowerCase();
        const targetNode = nodeMap.get(canonical);

        if (targetNode) {
          let relType: GraphRelationshipType = 'MENTIONS';
          if (ev.sourceType === 'RESEARCH') relType = 'CITES';
          else if (ev.sourceType === 'PATENT') relType = 'ASSIGNED_TO';
          else if (ev.sourceType === 'NEWS' || ev.sourceType === 'COMPETITOR') relType = 'DEVELOPS';

          const edge = await dbRepository.createGraphEdge({
            investigationId,
            sourceNodeId: evNode.id,
            targetNodeId: targetNode.id,
            relationshipType: relType,
            direction: 'DIRECTED',
            confidence: Math.round(ev.confidence * 100),
            importance: Math.round(ev.relevanceScore * 100),
            evidenceIds: [ev.id],
          });
          createdEdges.push(edge);
        }
      }
    }

    // 3. Discover Entity-to-Entity Relationships (e.g. COMPETES_WITH between entities in same investigation)
    const entityNodes = Array.from(nodeMap.values());
    for (let i = 0; i < entityNodes.length; i++) {
      for (let j = i + 1; j < entityNodes.length; j++) {
        const n1 = entityNodes[i];
        const n2 = entityNodes[j];
        const sharedEvidence = evidenceList.filter(
          (e) => e.entityIds.includes(n1.entityId || '') && e.entityIds.includes(n2.entityId || '')
        );

        const edge = await dbRepository.createGraphEdge({
          investigationId,
          sourceNodeId: n1.id,
          targetNodeId: n2.id,
          relationshipType: 'COMPETES_WITH',
          direction: 'UNDIRECTED',
          confidence: 85,
          importance: 80,
          evidenceIds: sharedEvidence.length > 0 ? sharedEvidence.map((e) => e.id) : [evidenceList[0]?.id || 'ev-default'],
        });
        createdEdges.push(edge);
      }
    }

    const allNodes = await dbRepository.getGraphNodes(investigationId);
    const allEdges = await dbRepository.getGraphEdges(investigationId);
    return { nodes: allNodes, edges: allEdges };
  }
}

export const defaultRelationshipDiscoveryEngine = new RelationshipDiscoveryEngine();
