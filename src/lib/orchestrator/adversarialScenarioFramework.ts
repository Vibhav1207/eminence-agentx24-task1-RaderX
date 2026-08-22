import { InvestigationModel } from '@/lib/types';

export type AdversarialScenarioId =
  | 'TOOL_FAILURE_AND_FALLBACK'
  | 'CONFLICT_AND_VERIFICATION'
  | 'RESOURCE_EXHAUSTION_AND_DEGRADATION'
  | 'DEADLOCK_AND_RECOVERY'
  | 'LOOP_AND_STRATEGY_CHANGE'
  | 'CHECKPOINT_AND_CRASH_RESUME';

export interface AdversarialScenarioDefinition {
  id: AdversarialScenarioId;
  name: string;
  description: string;
  expectedBehavior: string;
  metadataOverrides: Record<string, any>;
}

export class AdversarialScenarioFramework {
  private scenarios: Map<AdversarialScenarioId, AdversarialScenarioDefinition> = new Map();

  constructor() {
    this.scenarios.set('TOOL_FAILURE_AND_FALLBACK', {
      id: 'TOOL_FAILURE_AND_FALLBACK',
      name: 'Primary Tool Outage & Fallback',
      description: 'Forces Crossref and USPTO API timeouts. Verifies circuit breaker and Web fallback routing.',
      expectedBehavior: 'Agent detects provider timeout, triggers circuit breaker, switches to Web fallback stream.',
      metadataOverrides: { forceResearchFail: true, forcePatentTimeout: true },
    });

    this.scenarios.set('CONFLICT_AND_VERIFICATION', {
      id: 'CONFLICT_AND_VERIFICATION',
      name: 'Contradictory Evidence & Corroboration',
      description: 'Injects opposing market share claims. Verifies Conflict Resolver and corroboration task generation.',
      expectedBehavior: 'Conflict Resolver detects direct contradiction, applies source quality scoring, preserves uncertainty if tied.',
      metadataOverrides: { injectConflictingEvidence: true },
    });

    this.scenarios.set('RESOURCE_EXHAUSTION_AND_DEGRADATION', {
      id: 'RESOURCE_EXHAUSTION_AND_DEGRADATION',
      name: 'Resource Budget Limit & Graceful Degradation',
      description: 'Sets tight tool call budget (2 tool calls remaining). Verifies low-value task skipping.',
      expectedBehavior: 'Planner skips minor enrichment tasks, logs TASK_SKIPPED, and finalizes with degraded mode note.',
      metadataOverrides: { forceLowBudget: true },
    });

    this.scenarios.set('DEADLOCK_AND_RECOVERY', {
      id: 'DEADLOCK_AND_RECOVERY',
      name: 'Dependency Cycle & Deadlock Recovery',
      description: 'Injects cyclic task dependency (Task A -> Task B -> Task A). Verifies cycle relaxation.',
      expectedBehavior: 'Deadlock detector catches dependency cycle, relaxes lowest-value edge, logs DEADLOCK_DETECTED.',
      metadataOverrides: { forceDependencyCycle: true },
    });

    this.scenarios.set('LOOP_AND_STRATEGY_CHANGE', {
      id: 'LOOP_AND_STRATEGY_CHANGE',
      name: 'Stagnant Loop Detection & Strategy Change',
      description: 'Simulates zero confidence progress over 3 iterations. Verifies loop detection.',
      expectedBehavior: 'Loop detector emits STAGNATION_DETECTED, switches research strategy, or stops at iteration limit.',
      metadataOverrides: { forceLowConfidence: true },
    });

    this.scenarios.set('CHECKPOINT_AND_CRASH_RESUME', {
      id: 'CHECKPOINT_AND_CRASH_RESUME',
      name: 'Process Interruption & State Recovery',
      description: 'Saves checkpoint at critic node and marks state INTERRUPTED. Verifies resume capability.',
      expectedBehavior: 'Resume handler reads latest valid checkpoint and continues graph execution from critic node.',
      metadataOverrides: { forceInterruption: true },
    });
  }

  getScenario(id: AdversarialScenarioId): AdversarialScenarioDefinition | undefined {
    return this.scenarios.get(id);
  }

  listScenarios(): AdversarialScenarioDefinition[] {
    return Array.from(this.scenarios.values());
  }

  /**
   * Applies scenario configuration to investigation metadata for testing purposes only.
   */
  applyScenarioToInvestigation(
    investigation: InvestigationModel,
    scenarioId: AdversarialScenarioId
  ): InvestigationModel {
    const def = this.getScenario(scenarioId);
    if (!def) return investigation;

    return {
      ...investigation,
      metadata: {
        ...(investigation.metadata || {}),
        testScenario: scenarioId,
        ...def.metadataOverrides,
      },
    };
  }
}

export const defaultAdversarialScenarioFramework = new AdversarialScenarioFramework();
