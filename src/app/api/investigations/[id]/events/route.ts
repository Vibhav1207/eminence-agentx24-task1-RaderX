import { orchestratorService } from '@/lib/orchestrator/orchestratorService';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getDb } from "@/lib/mongodb";
import { AgentEvent } from "@/lib/agent/events";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return apiError('Invalid investigation ID', 'INVALID_ID', 400);
    }

    const mission = orchestratorService.getMissionState(id);
    if (mission) {
      const events = orchestratorService.getMissionEvents(mission.id);
      return apiSuccess(events);
    }

    const db = await getDb();
    const investigation = await db.collection("investigations").findOne({ id });
    if (!investigation) {
      return apiSuccess([]);
    }

    const events = await db
      .collection<AgentEvent>("agent_events")
      .find({ investigationId: id })
      .sort({ timestamp: 1 })
      .toArray();

    return apiSuccess(events);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch mission events', 'FETCH_ERROR', 500);
  }
}
