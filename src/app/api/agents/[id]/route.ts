import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agent = await dbRepository.getAgentById(id);
    if (!agent) {
      return apiError(`Agent with ID ${id} not found`, 'NOT_FOUND', 404);
    }
    return apiSuccess(agent);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch agent', 'FETCH_ERROR', 500);
  }
}
