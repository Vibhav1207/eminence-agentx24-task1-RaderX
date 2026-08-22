import { agentRegistry } from '@/lib/agents/agentRegistry';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET() {
  try {
    await agentRegistry.initialize();
    const counts = await agentRegistry.getAgentCounts();
    return apiSuccess(counts);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch agent counts', 'FETCH_ERROR', 500);
  }
}