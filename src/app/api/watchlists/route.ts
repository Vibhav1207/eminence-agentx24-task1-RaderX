import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';
import { CreateWatchlistApiSchema } from '@/lib/schemas';

export async function GET() {
  try {
    const watchlists = await dbRepository.getWatchlists();
    return apiSuccess(watchlists);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch watchlists', 'FETCH_ERROR', 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = CreateWatchlistApiSchema.safeParse(body);

    if (!parseResult.success) {
      return apiError(
        'Validation failed for watchlist payload',
        'VALIDATION_ERROR',
        400,
        parseResult.error.flatten()
      );
    }

    const { name, organization, technology, objective, investigationId, monitoringMode } = parseResult.data;

    const newWatchlist = await dbRepository.createWatchlist({
      name,
      title: name,
      organization: organization || name,
      technology: technology || 'Core Technology',
      objective: objective || 'Autonomous continuous background monitoring',
      investigationId,
      monitoringMode,
    });

    return apiSuccess(newWatchlist, 201);
  } catch (error: any) {
    return apiError(error.message || 'Failed to create watchlist', 'CREATE_ERROR', 500);
  }
}
