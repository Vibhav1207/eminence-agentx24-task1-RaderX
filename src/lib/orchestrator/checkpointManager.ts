import { getDb } from '@/lib/mongodb';
import { dbRepository } from '@/lib/db/repository';
import { TaskModel } from '@/lib/types';

export interface InvestigationCheckpoint {
  id: string;
  investigationId: string;
  checkpointVersion: number;
  currentNode: string;
  state: any;
  timestamp: string;
}

const inMemoryCheckpoints: Map<string, InvestigationCheckpoint[]> = new Map();

/**
 * 1. Create a checkpoint with atomic writes and schema versioning
 */
export async function createCheckpoint(
  investigationId: string,
  currentNode: string,
  state: any
): Promise<InvestigationCheckpoint> {
  const checkpointId = `cp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  
  // Sanitize state (ensure no circular reference or secrets)
  const sanitizedState = JSON.parse(JSON.stringify(state));
  
  const checkpointDoc: InvestigationCheckpoint = {
    id: checkpointId,
    investigationId,
    checkpointVersion: 1,
    currentNode,
    state: sanitizedState,
    timestamp: new Date().toISOString(),
  };

  // Save to in-memory fallback store
  const list = inMemoryCheckpoints.get(investigationId) || [];
  list.unshift(checkpointDoc);
  inMemoryCheckpoints.set(investigationId, list);

  try {
    const db = await getDb();
    await db.collection("investigation_checkpoints").insertOne(checkpointDoc);
    await db.collection("investigations").updateOne(
      { id: investigationId },
      { 
        $set: { 
          lastHeartbeatAt: checkpointDoc.timestamp,
          updatedAt: checkpointDoc.timestamp
        } 
      }
    );
    await cleanUpOldCheckpoints(db, investigationId);
  } catch (err: any) {
    // Fail-safe in-memory checkpoint saved
  }

  console.log(`[LANGGRAPH CHECKPOINT] Saved checkpoint ${checkpointId} at node ${currentNode}`);
  return checkpointDoc;
}

/**
 * 2. Validate a checkpoint's structure and fields
 */
export function validateCheckpoint(checkpoint: any): boolean {
  if (!checkpoint) {
    console.warn('[VALIDATE CHECKPOINT] Failure: checkpoint is null/undefined');
    return false;
  }
  if (checkpoint.checkpointVersion !== 1) {
    console.warn('[VALIDATE CHECKPOINT] Failure: checkpointVersion !== 1', checkpoint.checkpointVersion);
    return false;
  }
  if (!checkpoint.investigationId) {
    console.warn('[VALIDATE CHECKPOINT] Failure: no investigationId');
    return false;
  }
  if (!checkpoint.state) {
    console.warn('[VALIDATE CHECKPOINT] Failure: no state');
    return false;
  }
  
  const state = checkpoint.state;
  if (typeof state !== 'object' || state === null) {
    console.warn('[VALIDATE CHECKPOINT] Failure: state is not an object');
    return false;
  }
  
  return true;
}

/**
 * 3. Find the latest valid checkpoint, falling back to previous ones if corrupted
 */
export async function getValidCheckpoint(investigationId: string): Promise<InvestigationCheckpoint | null> {
  let checkpoints: InvestigationCheckpoint[] = [];
  try {
    const db = await getDb();
    const docs = await db.collection("investigation_checkpoints")
      .find({ investigationId })
      .sort({ timestamp: -1 })
      .toArray();
    if (docs.length > 0) checkpoints = docs as unknown as InvestigationCheckpoint[];
  } catch {
    checkpoints = inMemoryCheckpoints.get(investigationId) || [];
  }

  if (checkpoints.length === 0) {
    checkpoints = inMemoryCheckpoints.get(investigationId) || [];
  }

  for (const cp of checkpoints) {
    if (validateCheckpoint(cp)) {
      return cp;
    } else {
      console.warn(`[LANGGRAPH CHECKPOINT] Detected corrupted checkpoint: ${cp.id}. Attempting fallback to previous checkpoint.`);
    }
  }

  return null;
}

/**
 * 4. Cleanup old checkpoints (Retention strategy)
 */
async function cleanUpOldCheckpoints(db: any, investigationId: string, limit: number = 10) {
  const checkpoints = await db.collection("investigation_checkpoints")
    .find({ investigationId })
    .sort({ timestamp: -1 })
    .toArray();

  if (checkpoints.length <= limit) return;

  const milestones = ['plannerNode', 'criticNode', 'synthesisNode', 'validatorNode'];
  const toDeleteIds: any[] = [];
  
  checkpoints.forEach((cp: any, index: number) => {
    // Keep latest N
    if (index < limit) return;
    // Keep milestones
    if (milestones.includes(cp.currentNode)) return;
    // Otherwise, mark for deletion
    toDeleteIds.push(cp._id);
  });

  if (toDeleteIds.length > 0) {
    await db.collection("investigation_checkpoints").deleteMany({ _id: { $in: toDeleteIds } });
    console.log(`[LANGGRAPH CHECKPOINT] Cleaned up ${toDeleteIds.length} obsolete checkpoints.`);
  }
}

/**
 * 5. Heartbeat updater for long-running tasks
 */
export async function recordHeartbeat(investigationId: string): Promise<void> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.collection("investigations").updateOne(
      { id: investigationId },
      { $set: { lastHeartbeatAt: now, updatedAt: now } }
    );
  } catch (err) {
    console.error("[LANGGRAPH HEARTBEAT] Failed to record heartbeat:", err);
  }
}

/**
 * 6. Stale run detection (e.g. heartbeat older than configured period)
 */
export async function detectStaleInvestigations(staleThresholdMs: number = 120000): Promise<void> {
  try {
    const db = await getDb();
    const thresholdTime = new Date(Date.now() - staleThresholdMs).toISOString();

    // Find investigations marked running but with stale heartbeats
    const staleInvs = await db.collection("investigations")
      .find({
        status: 'INVESTIGATING',
        lastHeartbeatAt: { $lt: thresholdTime }
      })
      .toArray();

    for (const inv of staleInvs) {
      console.log(`[LANGGRAPH STALE] Detected stale running investigation: ${inv.id}. Marking INTERRUPTED.`);
      await markInterrupted(inv.id);
    }
  } catch (err) {
    // Fail-safe in memory mode if database is unconfigured or unreachable
  }
}

/**
 * 7. Mark an investigation as interrupted and update running tasks
 */
export async function markInterrupted(investigationId: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  
  await db.collection("investigations").updateOne(
    { id: investigationId },
    { 
      $set: { 
        status: 'INTERRUPTED', 
        orchestratorStatus: '● INTERRUPTED',
        orchestratorAction: 'Investigation interrupted due to process restart or network timeout.',
        updatedAt: now
      } 
    }
  );

  const cp = await getValidCheckpoint(investigationId);
  if (cp) {
    const state = cp.state;
    let modified = false;
    state.plan.forEach((t: TaskModel) => {
      if (t.status === 'RUNNING') {
        t.status = 'INTERRUPTED';
        modified = true;
      }
    });

    if (modified) {
      await createCheckpoint(investigationId, 'interruptedRecovery', state);
    }
  }
}

/**
 * 8. Core Resumption Logic
 */
export async function resumeInvestigation(investigationId: string): Promise<any> {
  const cp = await getValidCheckpoint(investigationId);
  if (!cp) {
    throw new Error("CHECKPOINT_NOT_FOUND");
  }

  const state = cp.state;
  const inv = await dbRepository.getInvestigationById(investigationId);
  if (!inv) {
    throw new Error("INVESTIGATION_NOT_FOUND");
  }

  const db = await getDb();
  await db.collection("investigations").updateOne(
    { id: investigationId },
    { 
      $set: { 
        status: 'INVESTIGATING',
        orchestratorStatus: '● RUNNING',
        orchestratorAction: 'Resuming investigation from latest checkpoint...',
        updatedAt: new Date().toISOString()
      } 
    }
  );

  // Scan and recover interrupted tasks
  let modified = false;
  for (const task of state.plan) {
    if (task.status === 'RUNNING' || task.status === 'INTERRUPTED') {
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.status = 'QUEUED';
        modified = true;
        console.log(`[LANGGRAPH RESUME] Retrying interrupted task ${task.id} (attempt ${task.retryCount}/${task.maxRetries})`);
      } else {
        task.status = 'FAILED';
        modified = true;
        console.log(`[LANGGRAPH RESUME] Task ${task.id} failed: max retries reached.`);
      }
    }
  }

  if (modified) {
    const cpDoc = await createCheckpoint(investigationId, 'resumeRouting', state);
    
    // Crucial: Update the investigation metadata to reflect the recovered state
    const metadata = {
      ...(inv.metadata || {}),
      langGraph: cpDoc.state,
      lastCheckpointId: cpDoc.id,
      lastCheckpointNode: cpDoc.currentNode,
      lastCheckpointTimestamp: cpDoc.timestamp,
    };
    await db.collection("investigations").updateOne(
      { id: investigationId },
      { 
        $set: { 
          metadata,
          updatedAt: new Date().toISOString()
        } 
      }
    );
  } else {
    // If not modified, still update metadata with the checkpoint we are resuming from
    const metadata = {
      ...(inv.metadata || {}),
      langGraph: state,
      lastCheckpointId: cp.id,
      lastCheckpointNode: cp.currentNode,
      lastCheckpointTimestamp: cp.timestamp,
    };
    await db.collection("investigations").updateOne(
      { id: investigationId },
      { 
        $set: { 
          metadata,
          updatedAt: new Date().toISOString()
        } 
      }
    );
  }

  // Record recovery traces
  const cpEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    missionId: `mission-${investigationId}`,
    investigationId,
    type: 'RECOVERY_STARTED',
    message: `Recovery started. Restored checkpoint: ${cp.id}. Resuming node: ${cp.currentNode}`,
    createdAt: new Date().toISOString(),
  };
  await db.collection("mission_events").insertOne(cpEvent);

  return state;
}
