import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const versions = await dbRepository.getConclusionVersionsByInvestigationId(id);
    return apiSuccess(versions);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch conclusion versions', 'FETCH_ERROR', 500);
  }
}
