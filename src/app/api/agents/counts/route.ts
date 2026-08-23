import { agentRegistry } from '@/lib/agents/agentRegistry';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET() {
  try {
    await agentRegistry.initialize();
    const counts = await agentRegistry.getAgentCounts();
    return apiSuccess(counts);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch agent counts';
    return apiError(message, 'DATABASE_UNAVAILABLE', 503);
  }
}
