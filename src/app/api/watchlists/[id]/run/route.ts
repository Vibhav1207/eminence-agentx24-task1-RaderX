import { defaultMonitoringScheduler } from '@/lib/monitoring/monitoringScheduler';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const run = await defaultMonitoringScheduler.triggerMonitoringRun(id);
    return apiSuccess({ run, message: 'Monitoring run completed successfully.' });
  } catch (error: any) {
    return apiError(error.message || 'Failed to trigger monitoring run', 'MONITORING_RUN_ERROR', 500);
  }
}
