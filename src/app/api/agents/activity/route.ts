import { apiSuccess, apiError } from '@/lib/api/response';
import { agentRegistry } from '@/lib/agents/agentRegistry';

export async function GET() {
  try {
    const agents = await agentRegistry.getAllAgents();
    const activities = agents
      .filter((agent) => agent.enabled !== false)
      .sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime())
      .map((agent) => ({
        id: `agent-activity-${agent.id}`,
        time: agent.lastActive,
        agentName: agent.name,
        action: `${agent.status}: ${agent.currentTask || 'No task assigned'}${agent.evidenceProcessed ? ` (${agent.evidenceProcessed} evidence items)` : ''}`,
      }));
    return apiSuccess(activities);
  } catch (error: unknown) {
    return apiError(error instanceof Error ? error.message : 'Failed to fetch agent activity', 'DATABASE_UNAVAILABLE', 503);
  }
}
