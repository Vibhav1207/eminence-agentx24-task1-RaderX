import { NextRequest, NextResponse } from 'next/server';
import { dbRepository } from '@/lib/db/repository';
import { orchestratorService } from '@/lib/orchestrator/orchestratorService';
import { defaultAdversarialScenarioFramework, AdversarialScenarioId } from '@/lib/orchestrator/adversarialScenarioFramework';
import { InvestigationModel } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const scenarioId: AdversarialScenarioId = body.scenarioId || 'TOOL_FAILURE_AND_FALLBACK';
    const targetEntity = body.targetEntity || 'Company Quantum';
    const strategicQuestion = body.strategicQuestion || `Assess whether ${targetEntity} is expanding custom AI chip packaging under adversarial conditions.`;

    const scenarioDef = defaultAdversarialScenarioFramework.getScenario(scenarioId);

    // 1. Create a new investigation record
    const baseInv: Partial<InvestigationModel> = {
      title: `Adversarial Test: ${scenarioDef?.name || scenarioId} (${targetEntity})`,
      objective: strategicQuestion,
      strategicQuestion,
      primaryEntities: [targetEntity],
      status: 'RUNNING',
      priority: 'HIGH',
      timeHorizon: '2026-Q3',
      progress: 10,
      metadata: {
        isAdversarialTest: true,
        testScenario: scenarioId,
        ...(scenarioDef?.metadataOverrides || {}),
      },
    };

    const inv = await dbRepository.createInvestigation(baseInv);

    // 2. Execute master LangGraph pipeline via orchestratorService
    orchestratorService.startMission(inv.id).catch((err: any) => {
      console.error('[AdversarialTestAPI] Orchestrator error:', err);
    });

    return NextResponse.json({
      success: true,
      investigationId: inv.id,
      scenario: scenarioDef,
      message: `Adversarial live test launched successfully for ${scenarioDef?.name || scenarioId}.`,
    });
  } catch (error: any) {
    console.error('[AdversarialTestAPI] Exception:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to start adversarial test' },
      { status: 500 }
    );
  }
}
