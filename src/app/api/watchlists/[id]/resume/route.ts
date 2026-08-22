import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const now = new Date();
    const nextRunAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const updated = await dbRepository.updateWatchlist(id, {
      status: 'ACTIVE',
      nextRunAt,
      updatedAt: now.toISOString(),
    });
    if (!updated) return apiError('Watchlist not found', 'NOT_FOUND', 404);
    return apiSuccess(updated);
  } catch (error: any) {
    return apiError(error.message || 'Failed to resume watchlist', 'RESUME_ERROR', 500);
  }
}
