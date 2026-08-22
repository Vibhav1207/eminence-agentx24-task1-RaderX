import {
  MissionModel,
  TaskModel,
  MissionEventModel,
  InvestigationModel,
  EvidenceModel,
  SignalModel,
} from '../types';
import { dbRepository } from '../db/repository';
import { defaultMissionPlanner } from './missionPlanner';
import { defaultAgentRegistry } from './agentRegistry';
import { defaultEvidenceEvaluator } from './evidenceEvaluator';
import { defaultSignalEngine } from '../intelligence/signalEngine';
import { defaultSynthesisEngine } from '../intelligence/synthesisEngine';
import { defaultAutonomousController } from './autonomousController';
import { defaultRelationshipDiscoveryEngine } from '../graph/relationshipDiscoveryEngine';
import { defaultExecutiveBriefVersioner } from '../intelligence/executiveBriefVersioner';
import { defaultContextBuilderService } from './contextBuilderService';
import { langGraphOrchestrator, graphEventEmitter, graphStateSync } from './langGraphOrchestrator';

class OrchestratorService {
  private missions: Map<string, MissionModel> = new Map();
  private tasks: Map<string, TaskModel[]> = new Map();
  private events: Map<string, MissionEventModel[]> = new Map();
  private runningLoop: Map<string, boolean> = new Map();

  constructor() {
    // Connect LangGraph events and state updates to local in-memory arrays
    graphEventEmitter.emit = (missionId, investigationId, type, message, agentType, taskId) => {
      this.emitEvent(missionId, investigationId, type, message, agentType, taskId);
    };

    graphEventEmitter.isPaused = (missionId) => {
      const m = this.missions.get(missionId);
      return m?.status === 'PAUSED';
    };

    graphEventEmitter.isCancelled = (missionId) => {
      const m = this.missions.get(missionId);
      return m?.status === 'CANCELLED';
    };

    graphStateSync.sync = (missionId, plan) => {
      this.tasks.set(missionId, plan);
    };

    // Background stale run checker (Requirement 22 & 23)
    if (typeof window === 'undefined') {
      setInterval(async () => {
        try {
          const { detectStaleInvestigations } = require('./checkpointManager');
          await detectStaleInvestigations(120000); // 2 minutes stale threshold
        } catch (err) {
          console.error("[STALE CHECKER] Failed to run stale check:", err);
        }
      }, 60000); // Every 60 seconds
    }
  }

  async startMission(investigationId: string): Promise<MissionModel> {
    const inv = await dbRepository.getInvestigationById(investigationId);
    if (!inv) throw new Error(`Investigation ${investigationId} not found`);

    // Idempotency check: Return existing mission if running/planning
    const existing = this.getMissionState(investigationId);
    if (existing && (existing.status === 'RUNNING' || existing.status === 'PLANNING')) {
      return existing;
    }

    const mission = defaultMissionPlanner.createMission(inv);
    const initialTasks = defaultMissionPlanner.planInitialTasks(mission, inv);

    this.missions.set(mission.id, mission);
    this.tasks.set(mission.id, initialTasks);
    this.events.set(mission.id, []);

    this.emitEvent(mission.id, inv.id, 'MISSION_CREATED', 'Orchestrator created execution mission.');
    this.emitEvent(mission.id, inv.id, 'PLAN_CREATED', `Planner generated ${initialTasks.length} initial tasks with dependency tracking.`);

    // Initialize investigation memory for context tracking
    await dbRepository.createInvestigationMemory({
      investigationId: inv.id,
      objective: inv.objective,
      targetEntity: inv.primaryEntities?.[0] || inv.organization || inv.title,
      technology: inv.technology || '',
      timeHorizon: inv.timeHorizon,
      status: 'RUNNING',
      keyEntities: inv.primaryEntities || [],
    });

    // Transition mission to RUNNING
    mission.status = 'RUNNING';
    mission.currentPhase = 'DISCOVERY';
    await dbRepository.updateInvestigation(inv.id, {
      status: 'RUNNING',
      orchestratorStatus: '● RUNNING',
      orchestratorAction: 'LangGraph workflow initiated. Running parallel agents.',
    });

    // Start background decision loop asynchronously (runs the LangGraph flow)
    this.runDecisionLoop(mission.id, inv.id);

    return mission;
  }

  getMissionState(investigationId: string): MissionModel | undefined {
    return Array.from(this.missions.values()).find((m) => m.investigationId === investigationId);
  }

  getMissionTasks(missionId: string): TaskModel[] {
    return this.tasks.get(missionId) || [];
  }

  getMissionEvents(missionId: string): MissionEventModel[] {
    return this.events.get(missionId) || [];
  }

  async pauseMission(missionId: string): Promise<MissionModel | undefined> {
    const m = this.missions.get(missionId);
    if (m) {
      m.status = 'PAUSED';
      this.emitEvent(missionId, m.investigationId, 'MISSION_PAUSED', 'Orchestrator paused mission execution.');
      await dbRepository.updateInvestigation(m.investigationId, {
        status: 'PAUSED',
        orchestratorStatus: '● PAUSED',
        orchestratorAction: 'Mission execution paused by user.',
      });
    }
    return m;
  }

  async resumeMission(missionId: string): Promise<MissionModel | undefined> {
    let m = this.missions.get(missionId);
    const investigationId = missionId.replace('mission-', '');
    
    const inv = await dbRepository.getInvestigationById(investigationId);
    if (!inv) return undefined;

    // Load checkpoint to verify it exists
    const { getValidCheckpoint, resumeInvestigation } = require('./checkpointManager');
    const cp = await getValidCheckpoint(investigationId);
    if (!cp) {
      console.warn(`[ORCHESTRATOR RESUME] No checkpoint found for ${investigationId}. Cannot resume.`);
      return undefined;
    }

    if (!m) {
      // Recreate mission in-memory after server restart
      m = {
        id: missionId,
        investigationId: inv.id,
        objective: inv.objective,
        status: 'RUNNING',
        currentPhase: 'DISCOVERY',
        progress: inv.progress || 0,
        maxIterations: 5,
        iterationCount: 0,
        priority: inv.priority || 'HIGH',
        createdBy: 'system',
        createdAt: inv.createdAt,
        startedAt: inv.createdAt,
      };
      this.missions.set(missionId, m);
      this.tasks.set(missionId, cp?.state?.plan || []);
      this.events.set(missionId, []);
    }

    m.status = 'RUNNING';
    this.emitEvent(missionId, inv.id, 'MISSION_RESUMED', 'Orchestrator resumed mission execution from latest valid checkpoint.');
    
    // Call resumeInvestigation to clean and prepare state in MongoDB
    const recoveredState = await resumeInvestigation(investigationId);
    this.tasks.set(missionId, recoveredState.plan);

    // Run execution loop
    this.runDecisionLoop(missionId, inv.id);
    return m;
  }

  async cancelMission(missionId: string): Promise<MissionModel | undefined> {
    const m = this.missions.get(missionId);
    if (m) {
      m.status = 'CANCELLED';
      const tasksList = this.tasks.get(missionId) || [];
      tasksList.forEach((t) => {
        if (t.status === 'PENDING' || t.status === 'QUEUED') t.status = 'CANCELLED';
      });
      this.emitEvent(missionId, m.investigationId, 'MISSION_CANCELLED', 'Orchestrator cancelled mission.');
      await dbRepository.updateInvestigation(m.investigationId, {
        status: 'FAILED',
        orchestratorStatus: '● CANCELLED',
        orchestratorAction: 'Mission cancelled.',
      });
    }
    return m;
  }

  private emitEvent(
    missionId: string,
    investigationId: string,
    type: MissionEventModel['type'],
    message: string,
    agentType?: MissionEventModel['agentType'],
    taskId?: string
  ) {
    const list = this.events.get(missionId) || [];
    const evt: MissionEventModel = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      missionId,
      investigationId,
      type,
      agentType,
      taskId,
      message,
      createdAt: new Date().toISOString(),
    };
    list.unshift(evt);
    this.events.set(missionId, list);
    console.log(`[ORCHESTRATOR EVENT]: [${type}] ${message}`);
  }

  private async runDecisionLoop(missionId: string, investigationId: string) {
    if (this.runningLoop.get(missionId)) return;
    this.runningLoop.set(missionId, true);

    const inv = await dbRepository.getInvestigationById(investigationId);
    if (!inv) {
      this.runningLoop.set(missionId, false);
      return;
    }

    try {
      // 1. Set up initial LangGraph state
      const initialTasks = this.tasks.get(missionId) || [];
      const initialState = {
        investigationId,
        userObjective: inv.objective,
        targetEntity: inv.primaryEntities?.[0] || inv.title,
        topic: inv.technology || '',
        constraints: [],
        plan: initialTasks,
        completedTasks: [],
        pendingTasks: initialTasks,
        activeAgents: [],
        agentResults: [],
        evidence: [],
        hypotheses: [],
        verifiedHypotheses: {},
        conflictingEvidence: [],
        toolHistory: [],
        toolFailures: [],
        retryCounts: {},
        resourceBudget: {
          maxIterations: 5,
          iterationCount: 0,
          maxToolCalls: 15,
          toolCallCount: 0,
          maxRetries: 2,
          totalRetries: 0,
          executionTimeMs: 0,
          maxConcurrentAgents: 3,
        },
        confidence: 75,
        uncertainty: 'Low',
        finalFindings: [],
        recommendations: [],
        errors: [],
        openQuestions: [],
        executionStatus: 'PLANNING' as const,
        startedAt: new Date().toISOString(),
      };

      // Check if a saved checkpoint exists in MongoDB to resume from it
      let stateToUse = initialState;
      if (inv.metadata?.langGraph) {
        stateToUse = { ...initialState, ...inv.metadata.langGraph };
      }

      // Sync tasks map before running the state graph
      this.tasks.set(missionId, stateToUse.plan);

      // 2. Invoke the compiled LangGraph workflow
      const finalState = await langGraphOrchestrator.invoke(stateToUse);

      // 3. Sync tasks and mission state on completion
      this.tasks.set(missionId, finalState.plan);
      const m = this.missions.get(missionId);
      if (m) {
        m.status = finalState.executionStatus === 'COMPLETED' ? 'COMPLETED' : 'FAILED';
        m.progress = 100;
        m.completedAt = new Date().toISOString();
      }
    } catch (err: any) {
      console.error("[ORCHESTRATOR ERROR] LangGraph execution failed:", err);
      this.emitEvent(missionId, investigationId, 'TASK_FAILED', `LangGraph loop exception: ${err.message || err}`);
    } finally {
      this.runningLoop.set(missionId, false);
    }
  }
}

export const orchestratorService = new OrchestratorService();
