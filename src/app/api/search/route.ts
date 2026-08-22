import { NextRequest } from 'next/server';
import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim().toLowerCase();

    if (!query) {
      return apiSuccess({
        investigations: [],
        entities: [],
        evidence: [],
        signals: [],
        total: 0,
      });
    }

    const allInvs = await dbRepository.getInvestigations();
    const matchingInvs = allInvs.filter(
      (i) => i.title.toLowerCase().includes(query) || i.objective.toLowerCase().includes(query)
    );

    const allProfiles = await dbRepository.getEntityProfiles();
    const matchingEntities = allProfiles.filter(
      (e) => e.name.toLowerCase().includes(query) || e.description.toLowerCase().includes(query)
    );

    const allNodes = await dbRepository.getGraphNodes();
    const matchingNodes = allNodes.filter(
      (n) => n.label.toLowerCase().includes(query) || n.description.toLowerCase().includes(query)
    );

    return apiSuccess({
      query,
      investigations: matchingInvs.map((i) => ({ id: i.id, title: i.title, type: 'INVESTIGATION' })),
      entities: matchingEntities.map((e) => ({ id: e.id, name: e.name, type: e.type })),
      nodes: matchingNodes.map((n) => ({ id: n.id, label: n.label, type: n.type })),
      total: matchingInvs.length + matchingEntities.length + matchingNodes.length,
    });
  } catch (error: any) {
    return apiError(error.message || 'Search failed', 'SEARCH_ERROR', 500);
  }
}
