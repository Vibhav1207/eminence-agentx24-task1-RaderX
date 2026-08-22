import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';
import { PatchAlertApiSchema } from '@/lib/schemas';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parseResult = PatchAlertApiSchema.safeParse(body);

    if (!parseResult.success) {
      return apiError('Invalid patch payload for alert', 'VALIDATION_ERROR', 400, parseResult.error.flatten());
    }

    const updated = await dbRepository.updateAlert(id, parseResult.data);
    if (!updated) {
      return apiError(`Alert with ID ${id} not found`, 'NOT_FOUND', 404);
    }

    return apiSuccess(updated);
  } catch (error: any) {
    return apiError(error.message || 'Failed to update alert', 'UPDATE_ERROR', 500);
  }
}
