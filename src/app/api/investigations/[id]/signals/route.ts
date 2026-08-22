import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const signals = await dbRepository.getSignalsByInvestigationId(id);
    return apiSuccess(signals);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch signals', 'FETCH_ERROR', 500);
  }
}
