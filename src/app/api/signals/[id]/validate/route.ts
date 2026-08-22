import { dbRepository } from '@/lib/db/repository';
import { defaultSignalValidator } from '@/lib/intelligence/signalValidator';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function POST(
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

    if (!foundSignal) return apiError('Signal not found', 'NOT_FOUND', 404);

    const allEv = await dbRepository.getEvidenceByInvestigationId(invId);
    const validated = defaultSignalValidator.validateSignal(foundSignal, allEv);
    return apiSuccess(validated);
  } catch (error: any) {
    return apiError(error.message || 'Failed to validate signal', 'VALIDATION_ERROR', 500);
  }
}
