import {
  InvestigationModel,
  MissionModel,
  TaskModel,
  DecisionType,
  DecisionLogModel,
  KnowledgeGapModel,
} from '@/lib/types';
import { dbRepository } from '@/lib/db/repository';
import { defaultKnowledgeGapDetector } from './knowledgeGapDetector';
import { defaultContradictionDetector } from './contradictionDetector';

export interface AutonomousControllerState {
  iteration: number;
  maxIterations: number;
  maxTasks: number;
  confidence: number;
  stopCriteriaMet: boolean;
  activeGaps: KnowledgeGapModel[];
  lastDecision?: DecisionType;
}

export class AutonomousInvestigationController {
  private readonly MAX_ITERATIONS = 5;
  private readonly MAX_TASKS = 12;

  async evaluateAndDecide(
    investigation: InvestigationModel,
    mission: MissionModel,
    currentTasks: TaskModel[]
  ): Promise<{ decision: DecisionType; reason: string; newTasks: TaskModel[] }> {
    const currentEvidence = await dbRepository.getEvidenceByInvestigationId(investigation.id);
    const iteration = mission.iterationCount || 1;

    // 1. Detect knowledge gaps
    const gaps = await defaultKnowledgeGapDetector.detectAndSyncGaps(investigation, currentEvidence);
    const openGaps = gaps.filter((g) => g.status === 'OPEN');

    // 2. Detect contradictions
    const contradictions = await defaultContradictionDetector.detectContradictions(investigation, currentEvidence);

    // 3. Evaluate stop criteria
    const completedTasks = currentTasks.filter((t) => t.status === 'COMPLETED').length;
    const isBudgetExhausted = iteration >= this.MAX_ITERATIONS || currentTasks.length >= this.MAX_TASKS;

    // Calculate current confidence
    let confidence = 50 + currentEvidence.length * 5;
    if (openGaps.length === 0 && currentEvidence.length >= 4) confidence += 25;
    confidence = Math.min(95, confidence);

    // Stop decision logic
    if (confidence >= 85 || isBudgetExhausted || (openGaps.length === 0 && completedTasks >= 4)) {
      const decision: DecisionType = 'STOP';
      const reason = isBudgetExhausted
        ? `Investigation budget reached (${completedTasks} tasks, ${iteration} iterations). Finalizing intelligence.`
        : `Sufficient evidence acquired (${currentEvidence.length} items, confidence: ${confidence}%). Resolving synthesis.`;

      await dbRepository.saveDecisionLog({
        investigationId: investigation.id,
        decision,
        reason,
        trigger: 'STOP_CRITERIA_EVALUATION',
        createdTaskIds: [],
        resolvedGapIds: gaps.filter((g) => g.status === 'RESOLVED').map((g) => g.id),
      });

      return { decision, reason, newTasks: [] };
    }

    // Follow-up decision logic if open gaps exist
    if (openGaps.length > 0) {
      const newTasks: TaskModel[] = [];
      const resolvedGapIds: string[] = [];

      for (const gap of openGaps) {
        if (currentTasks.length + newTasks.length >= this.MAX_TASKS) break;
        const task = defaultKnowledgeGapDetector.generateFollowupTaskForGap(
          gap,
          mission.id,
          investigation.id,
          currentTasks.length + newTasks.length
        );
        if (task) {
          newTasks.push(task);
          await dbRepository.updateKnowledgeGap(gap.id, { status: 'INVESTIGATING' });
        }
      }

      if (newTasks.length > 0) {
        const decision: DecisionType = 'FOLLOW_UP';
        const reason = `Detected ${openGaps.length} open knowledge gap(s). Autonomous Controller created ${newTasks.length} follow-up task(s).`;

        await dbRepository.saveDecisionLog({
          investigationId: investigation.id,
          decision,
          reason,
          trigger: 'KNOWLEDGE_GAP_DETECTION',
          createdTaskIds: newTasks.map((t) => t.id),
          resolvedGapIds,
        });

        return { decision, reason, newTasks };
      }
    }

    // Default continue decision
    const decision: DecisionType = 'CONTINUE';
    const reason = `Executing planned task sequence (Iteration ${iteration}/${this.MAX_ITERATIONS}).`;

    await dbRepository.saveDecisionLog({
      investigationId: investigation.id,
      decision,
      reason,
      trigger: 'ROUTINE_ITERATION',
      createdTaskIds: [],
      resolvedGapIds: [],
    });

    return { decision, reason, newTasks: [] };
  }
}

export const defaultAutonomousController = new AutonomousInvestigationController();
