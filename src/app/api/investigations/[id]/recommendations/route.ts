import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const recommendations = await dbRepository.getRecommendationsByInvestigationId(id);
    return apiSuccess(recommendations);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch recommendations', 'FETCH_ERROR', 500);
  }
}
