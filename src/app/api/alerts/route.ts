import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const userId = searchParams.get('userId') || undefined;

    const alerts = await dbRepository.getAlerts({ category, unreadOnly, userId });
    const unreadCount = await dbRepository.getUnreadCount(userId);

    return apiSuccess({ alerts, unreadCount });
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch alerts', 'FETCH_ERROR', 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'markAllRead') {
      const userId = searchParams.get('userId') || undefined;
      const alerts = await dbRepository.getAlerts({ unreadOnly: true, userId });
      
      for (const alert of alerts) {
        await dbRepository.updateAlert(alert.id, { read: true, status: 'READ' });
      }

      return apiSuccess({ markedRead: alerts.length });
    }

    return apiError('Invalid action', 'INVALID_ACTION', 400);
  } catch (error: any) {
    return apiError(error.message || 'Failed to update alerts', 'UPDATE_ERROR', 500);
  }
}
