import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const graph = await dbRepository.getGraphByInvestigationId(id);
    return apiSuccess(graph);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch intelligence graph', 'FETCH_ERROR', 500);
  }
}
