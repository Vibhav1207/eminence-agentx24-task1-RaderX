import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updated = await dbRepository.updateWatchlist(id, { status: 'PAUSED' });
    if (!updated) return apiError('Watchlist not found', 'NOT_FOUND', 404);
    return apiSuccess(updated);
  } catch (error: any) {
    return apiError(error.message || 'Failed to pause watchlist', 'PAUSE_ERROR', 500);
  }
}
