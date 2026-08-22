import { NextRequest, NextResponse } from 'next/server';
import { dbRepository } from '@/lib/db/repository';

/**
 * GET /api/investigations/[id]/memory
 * Returns the live investigation memory including agent steps, key findings,
 * open questions, and context status — all from real MongoDB/in-memory backend.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Investigation ID required' }, { status: 400 });
    }

    // Verify investigation exists
    const investigation = await dbRepository.getInvestigationById(id);
    if (!investigation) {
      return NextResponse.json({ success: false, error: 'Investigation not found' }, { status: 404 });
    }

    // Load the memory model
    const memory = await dbRepository.getInvestigationMemory(id);

    // Load agent steps (they may be embedded in memory.agentSteps or in agent_step_memory collection)
    const agentSteps = memory?.agentSteps?.length
      ? memory.agentSteps
      : await dbRepository.getAgentStepsByInvestigationId(id);

    // If no memory exists yet, return a scaffold so UI can still render
    if (!memory) {
      const evidence = await dbRepository.getEvidenceByInvestigationId(id);
      return NextResponse.json({
        success: true,
        data: {
          memory: {
            id: `mem-scaffold-${id}`,
            investigationId: id,
            version: 0,
            objective: investigation.objective,
            targetEntity: investigation.primaryEntities?.[0] || investigation.organization || investigation.title,
            technology: investigation.technology || '',
            timeHorizon: investigation.timeHorizon,
            status: investigation.status,
            agentSteps: [],
            keyEntities: investigation.primaryEntities || [],
            keyFindings: [],
            openQuestions: [],
            importantEvidenceIds: [],
            totalEvidenceCount: evidence.length,
            totalAgentSteps: 0,
            completedAgents: [],
            activeAgent: undefined,
            contextStatus: 'BUILDING',
            createdAt: investigation.createdAt,
            updatedAt: investigation.updatedAt,
          },
          agentSteps: [],
          contextStatus: 'BUILDING' as const,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        memory: {
          ...memory,
          // Always embed agentSteps in response even if they live in separate collection
          agentSteps,
          totalAgentSteps: agentSteps.length,
        },
        agentSteps,
        contextStatus: memory.contextStatus,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[MEMORY API] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load investigation memory', details: String(err) },
      { status: 500 }
    );
  }
}
