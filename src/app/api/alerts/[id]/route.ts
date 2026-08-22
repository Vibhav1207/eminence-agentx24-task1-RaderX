import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';
import { PatchAlertApiSchema } from '@/lib/schemas';
import { AlertModel, AlertStatusState } from '@/lib/types';

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

    const { read, status, ...updates } = parseResult.data;
    const updateData: Partial<AlertModel> = { ...updates };
    
    if (read !== undefined) {
      updateData.read = read;
      // Automatically sync status with read state
      if (read && !status) {
        updateData.status = 'READ';
      } else if (!read && !status) {
        updateData.status = 'UNREAD';
      }
    }
    if (status) {
      updateData.status = status as AlertStatusState;
    }

    const updated = await dbRepository.updateAlert(id, updateData);
    if (!updated) {
      return apiError(`Alert with ID ${id} not found`, 'NOT_FOUND', 404);
    }

    return apiSuccess(updated);
  } catch (error: any) {
    return apiError(error.message || 'Failed to update alert', 'UPDATE_ERROR', 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Mark as dismissed instead of deleting
    const updated = await dbRepository.updateAlert(id, { status: 'DISMISSED', read: true });
    
    if (!updated) {
      return apiError(`Alert with ID ${id} not found`, 'NOT_FOUND', 404);
    }

    return apiSuccess({ dismissed: true });
  } catch (error: any) {
    return apiError(error.message || 'Failed to dismiss alert', 'DELETE_ERROR', 500);
  }
}