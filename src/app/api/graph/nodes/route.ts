import { NextRequest } from 'next/server';
import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const investigationId = searchParams.get('investigationId') || undefined;
    const nodes = await dbRepository.getGraphNodes(investigationId);
    return apiSuccess(nodes);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch graph nodes', 'NODES_FETCH_ERROR', 500);
  }
}
