import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const latestEval = await dbRepository.getLatestSelfEvaluation(id);
    const allEvals = await dbRepository.getSelfEvaluationsByInvestigationId(id);
    return apiSuccess({
      latest: latestEval || null,
      history: allEvals,
    });
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch self-evaluation', 'FETCH_ERROR', 500);
  }
}
