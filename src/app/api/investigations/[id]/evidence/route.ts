import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const evidence = await dbRepository.getEvidenceByInvestigationId(id);
    return apiSuccess(evidence);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch evidence', 'FETCH_ERROR', 500);
  }
}
