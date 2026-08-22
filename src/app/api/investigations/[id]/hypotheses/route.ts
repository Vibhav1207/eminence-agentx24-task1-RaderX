import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const hypotheses = await dbRepository.getHypothesesByInvestigationId(id);
    return apiSuccess(hypotheses);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch hypotheses', 'FETCH_ERROR', 500);
  }
}
