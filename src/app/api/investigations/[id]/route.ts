import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';
import { PatchInvestigationApiSchema } from '@/lib/schemas';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`[API] GET /api/investigations/${id}`);
    const inv = await dbRepository.getInvestigationById(id);
    if (!inv) {
      console.log(`[API] Investigation ${id} not found in database`);
      return apiError(`Investigation with ID ${id} not found`, 'INVESTIGATION_NOT_FOUND', 404);
    }
    console.log(`[API] Found investigation ${id}: ${inv.title}`);
    return apiSuccess(inv);
  } catch (error: any) {
    console.error(`[API] Error fetching investigation:`, error);
    return apiError(error.message || 'Failed to fetch investigation', 'FETCH_ERROR', 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parseResult = PatchInvestigationApiSchema.safeParse(body);

    if (!parseResult.success) {
      return apiError('Invalid patch payload', 'VALIDATION_ERROR', 400, parseResult.error.flatten());
    }

    const updated = await dbRepository.updateInvestigation(id, parseResult.data);
    if (!updated) {
      return apiError(`Investigation with ID ${id} not found`, 'NOT_FOUND', 404);
    }

    return apiSuccess(updated);
  } catch (error: any) {
    return apiError(error.message || 'Failed to update investigation', 'UPDATE_ERROR', 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbRepository.deleteInvestigation(id);
    return apiSuccess({ deleted: true, id });
  } catch (error: any) {
    return apiError(error.message || 'Failed to delete investigation', 'DELETE_ERROR', 500);
  }
}
