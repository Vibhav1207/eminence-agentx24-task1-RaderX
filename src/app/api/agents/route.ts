import { agentRegistry } from '@/lib/agents/agentRegistry';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET() {
  try {
    await agentRegistry.initialize();
    const agents = await agentRegistry.getAllAgents();
    return apiSuccess(agents);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch agents';
    return apiError(message, 'DATABASE_UNAVAILABLE', 503);
  }
}
