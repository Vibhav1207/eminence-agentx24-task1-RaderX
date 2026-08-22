import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invs = await dbRepository.getAllInvestigations();
    let foundSignal = null;

    for (const inv of invs) {
      const sig = (inv.signals || []).find((s: any) => s.id === id);
      if (sig) {
        foundSignal = sig;
        break;
      }
    }

    if (!foundSignal) {
      return apiError(`Signal ${id} not found`, 'NOT_FOUND', 404);
    }

    return apiSuccess(foundSignal);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch signal', 'FETCH_ERROR', 500);
  }
}
