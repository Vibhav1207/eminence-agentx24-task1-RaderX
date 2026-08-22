import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET() {
  try {
    const alerts = await dbRepository.getAlerts();
    return apiSuccess(alerts);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch alerts', 'FETCH_ERROR', 500);
  }
}
