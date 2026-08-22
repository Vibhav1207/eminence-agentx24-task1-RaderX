import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET() {
  try {
    const agents = await dbRepository.getAgents();
    return apiSuccess(agents);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch agents', 'FETCH_ERROR', 500);
  }
}
