import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invs = await dbRepository.getAllInvestigations();
    let foundSignal: any = null;
    let invId = '';

    for (const inv of invs) {
      const sig = (inv.signals || []).find((s: any) => s.id === id);
      if (sig) {
        foundSignal = sig;
        invId = inv.id;
        break;
      }
    }

    if (!foundSignal) {
      return apiSuccess([]);
    }

    const allEv = await dbRepository.getEvidenceByInvestigationId(invId);
    const relatedEv = allEv.filter((e) => foundSignal?.evidenceIds?.includes(e.id));
    return apiSuccess(relatedEv);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch signal evidence', 'FETCH_ERROR', 500);
  }
}
