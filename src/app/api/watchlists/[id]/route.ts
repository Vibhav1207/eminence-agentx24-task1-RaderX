import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';
import { PatchWatchlistApiSchema } from '@/lib/schemas';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const watchlist = await dbRepository.getWatchlistById(id);
    if (!watchlist) {
      return apiError(`Watchlist with ID ${id} not found`, 'NOT_FOUND', 404);
    }
    return apiSuccess(watchlist);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch watchlist', 'FETCH_ERROR', 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parseResult = PatchWatchlistApiSchema.safeParse(body);

    if (!parseResult.success) {
      return apiError('Invalid patch payload for watchlist', 'VALIDATION_ERROR', 400, parseResult.error.flatten());
    }

    const updated = await dbRepository.updateWatchlist(id, parseResult.data);
    if (!updated) {
      return apiError(`Watchlist with ID ${id} not found`, 'NOT_FOUND', 404);
    }

    return apiSuccess(updated);
  } catch (error: any) {
    return apiError(error.message || 'Failed to update watchlist', 'UPDATE_ERROR', 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbRepository.deleteWatchlist(id);
    return apiSuccess({ deleted: true, id });
  } catch (error: any) {
    return apiError(error.message || 'Failed to delete watchlist', 'DELETE_ERROR', 500);
  }
}
