import { NextRequest } from 'next/server';
import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const nodes = await dbRepository.getGraphNodes(id);
    const edges = await dbRepository.getGraphEdges(id);
    return apiSuccess({ investigationId: id, nodes, edges, totalNodes: nodes.length, totalEdges: edges.length });
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch investigation graph', 'INVESTIGATION_GRAPH_ERROR', 500);
  }
}
