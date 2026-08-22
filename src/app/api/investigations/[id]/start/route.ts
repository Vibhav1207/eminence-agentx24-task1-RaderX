import { orchestratorService } from '@/lib/orchestrator/orchestratorService';
import { apiSuccess, apiError } from '@/lib/api/response';
import { agentRegistry } from '@/lib/agents/agentRegistry';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Ensure agent registry is initialized before starting mission
    await agentRegistry.initialize();
    
    const mission = await orchestratorService.startMission(id);
    return apiSuccess(mission);
  } catch (error: any) {
    return apiError(error.message || 'Failed to start orchestrator mission', 'ORCHESTRATOR_ERROR', 500);
  }
}
