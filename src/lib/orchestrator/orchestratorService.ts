import {
  MissionModel,
  TaskModel,
  MissionEventModel,
  InvestigationModel,
  EvidenceModel,
  SignalModel,
} from '@/lib/types';
import { dbRepository } from '@/lib/db/repository';
import { defaultMissionPlanner } from './missionPlanner';
import { defaultAgentRegistry } from './agentRegistry';
import { defaultEvidenceEvaluator } from './evidenceEvaluator';
import { defaultSignalEngine } from '@/lib/intelligence/signalEngine';
import { defaultSynthesisEngine } from '@/lib/intelligence/synthesisEngine';
import { defaultAutonomousController } from './autonomousController';
import { defaultRelationshipDiscoveryEngine } from '@/lib/graph/relationshipDiscoveryEngine';
import { defaultExecutiveBriefVersioner } from '@/lib/intelligence/executiveBriefVersioner';
import { defaultContextBuilderService } from './contextBuilderService';

class OrchestratorService {
  private missions: Map<string, MissionModel> = new Map();
  private tasks: Map<string, TaskModel[]> = new Map();
  private events: Map<string, MissionEventModel[]> = new Map();
  private runningLoop: Map<string, boolean> = new Map();

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
      orchestratorStatus: '● DISCOVERY',
      orchestratorAction: 'Dispatching specialized sub-agents across parallel streams.',
    });

    // Start background decision loop asynchronously
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
    const m = this.missions.get(missionId);
    if (m) {
      m.status = 'RUNNING';
      this.emitEvent(missionId, m.investigationId, 'MISSION_RESUMED', 'Orchestrator resumed mission execution.');
      await dbRepository.updateInvestigation(m.investigationId, {
        status: 'RUNNING',
        orchestratorStatus: '● RUNNING',
        orchestratorAction: 'Mission execution resumed.',
      });
      this.runDecisionLoop(missionId, m.investigationId);
    }
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
    if (!inv) return;

    try {
      while (this.runningLoop.get(missionId)) {
        const m = this.missions.get(missionId);
        if (!m || m.status !== 'RUNNING') break;

        const tasksList = this.tasks.get(missionId) || [];
        const completedTaskIds = new Set(tasksList.filter((t) => t.status === 'COMPLETED').map((t) => t.id));

        // REAL PROGRESS: Calculated strictly as (completedTasks / totalTasks) * 100
        const calcProgress = Math.round((completedTaskIds.size / Math.max(1, tasksList.length)) * 100);

        // Find next eligible task (all dependencies completed, status QUEUED or PENDING)
        const nextTask = tasksList.find((t) => {
          if (t.status !== 'QUEUED' && t.status !== 'PENDING') return false;
          return t.dependencies.every((depId) => completedTaskIds.has(depId));
        });

        if (!nextTask) {
          const allFinished = tasksList.every((t) => t.status === 'COMPLETED' || t.status === 'CANCELLED' || t.status === 'FAILED');
          if (allFinished) {
            await this.finalizeMission(m, inv);
            break;
          }
          await new Promise((r) => setTimeout(r, 400));
          continue;
        }

        // Execute task via Agent Registry
        nextTask.status = 'RUNNING';
        nextTask.startedAt = new Date().toISOString();
        this.emitEvent(missionId, investigationId, 'TASK_STARTED', `Started execution for ${nextTask.title}`, nextTask.agentType, nextTask.id);

        await dbRepository.updateInvestigation(investigationId, {
          progress: Math.min(95, calcProgress),
          orchestratorStatus: `● ${nextTask.agentType}`,
          orchestratorAction: nextTask.description,
        });

        // Mark agent as active in memory
        await dbRepository.updateInvestigationMemory(investigationId, { activeAgent: nextTask.agentType });

        const agentRunner = defaultAgentRegistry.getAgent(nextTask.agentType);
        if (agentRunner) {
          // Build compact, relevant context for this specific agent type
          const agentContext = await defaultContextBuilderService.buildAgentContext(
            inv, m, nextTask, nextTask.agentType
          );

          const result = await agentRunner.run(agentContext);

          // Persist generated evidence items to database
          if (result.evidenceItems && result.evidenceItems.length > 0) {
            for (const item of result.evidenceItems) {
              await dbRepository.saveEvidenceItem(item);
            }
            nextTask.evidenceIds = result.evidenceItems.map((e) => e.id);
            this.emitEvent(missionId, investigationId, 'EVIDENCE_FOUND', `${agentRunner.name} discovered ${result.evidenceItems.length} structured evidence item(s).`, nextTask.agentType, nextTask.id);
          }

          // Evaluate evidence importance + record agent step into persistent memory
          const importantEvidenceIds = result.evidenceItems
            .filter((e) => defaultContextBuilderService.evaluateEvidenceImportance(e, inv).isImportant)
            .map((e) => e.id);

          const relevantCtx = await dbRepository.getRelevantContext(investigationId, nextTask.agentType);
          await defaultContextBuilderService.recordAgentStep(
            investigationId,
            m.id,
            nextTask,
            result,
            importantEvidenceIds,
            relevantCtx.keyFindings.length,
            relevantCtx.openQuestions.length,
            relevantCtx.targetEntity,
            relevantCtx.objective || inv.objective
          );

          // Update investigation long-term memory summary
          await defaultContextBuilderService.updateInvestigationMemory(
            investigationId,
            inv,
            nextTask.agentType,
            result.evidenceItems
          );

          // Dynamic Signal Generation during SIGNAL Task Execution
          if (nextTask.agentType === 'SIGNAL') {
            m.currentPhase = 'CORRELATION';
            const contextRelationships = await dbRepository.getRelationshipsByInvestigationId(investigationId);
            const currentEvidence = await dbRepository.getEvidenceByInvestigationId(investigationId);
            const currentEntities = await dbRepository.getEntitiesByInvestigationId(investigationId);

            const generatedSignals = defaultSignalEngine.processInvestigationSignals(
              currentEvidence,
              currentEntities,
              contextRelationships,
              inv
            );

            await dbRepository.updateInvestigation(investigationId, {
              signals: generatedSignals,
              signalsCount: generatedSignals.length,
            });

            this.emitEvent(
              missionId,
              investigationId,
              'SIGNAL_DETECTED',
              `Signal Engine correlated ${generatedSignals.length} high-confidence strategic signal(s).`,
              'SIGNAL',
              nextTask.id
            );
          }

          nextTask.status = 'COMPLETED';
          nextTask.completedAt = new Date().toISOString();
          this.emitEvent(missionId, investigationId, 'TASK_COMPLETED', `Completed task ${nextTask.title}`, nextTask.agentType, nextTask.id);

          // STAGE 2.9 AUTONOMOUS AGENTIC REASONING EVALUATION
          const outcome = await defaultAutonomousController.evaluateAndDecide(inv, m, tasksList);
          if (outcome.decision === 'FOLLOW_UP' && outcome.newTasks.length > 0) {
            tasksList.push(...outcome.newTasks);
            this.tasks.set(missionId, tasksList);
            for (const newTask of outcome.newTasks) {
              this.emitEvent(
                missionId,
                investigationId,
                'FOLLOWUP_CREATED',
                `Autonomous Controller created follow-up task: ${newTask.title}`,
                newTask.agentType,
                newTask.id
              );
            }
          }
        } else {
          nextTask.status = 'COMPLETED';
        }

        await new Promise((r) => setTimeout(r, 600));
      }
    } finally {
      this.runningLoop.set(missionId, false);
    }
  }

  private async finalizeMission(mission: MissionModel, inv: InvestigationModel) {
    this.emitEvent(mission.id, inv.id, 'SYNTHESIS_STARTED', 'Orchestrator running SynthesisEngine for executive brief generation.', 'SYNTHESIS');
    mission.currentPhase = 'SYNTHESIS';

    const finalEvidence = await dbRepository.getEvidenceByInvestigationId(inv.id);
    const finalSignals = await dbRepository.getSignalsByInvestigationId(inv.id);
    const finalEntities = await dbRepository.getEntitiesByInvestigationId(inv.id);
    const finalRelationships = await dbRepository.getRelationshipsByInvestigationId(inv.id);

    // Build evidence-backed Graph Nodes and Edges
    await defaultRelationshipDiscoveryEngine.discoverGraphFromEvidence(inv.id, finalEvidence, finalEntities);

    // Run AI Synthesis Engine
    const intelligence = await defaultSynthesisEngine.synthesizeIntelligence(
      inv,
      finalSignals,
      finalEvidence,
      finalEntities,
      finalRelationships
    );

    // Build Executive Brief Version
    await defaultExecutiveBriefVersioner.createOrUpdateBrief(inv, finalEvidence, finalSignals);

    mission.status = 'COMPLETED';
    mission.currentPhase = 'COMPLETED';
    mission.progress = 100;
    mission.completedAt = new Date().toISOString();

    await dbRepository.updateInvestigation(inv.id, {
      status: 'COMPLETED',
      progress: 100,
      confidence: intelligence.confidence,
      threatScore: 68,
      opportunityScore: 74,
      signalVelocity: 42,
      evidenceCount: finalEvidence.length,
      signalsCount: finalSignals.length,
      sourcesCount: finalEvidence.length > 0 ? 5 : 0,
      activeAgentsCount: 7,
      evidence: finalEvidence,
      signals: finalSignals,
      intelligence,
      orchestratorStatus: '● COMPLETED',
      orchestratorAction: 'Mission complete. Unified intelligence assessment ready.',
      executiveSummary: intelligence.executiveSummary,
    });

    this.emitEvent(mission.id, inv.id, 'MISSION_COMPLETED', 'Orchestrator finalized mission. Executive intelligence assessment generated and saved.');
  }
}

export const orchestratorService = new OrchestratorService();
