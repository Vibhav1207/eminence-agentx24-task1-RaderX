import { NextRequest } from 'next/server';
import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const recs = memory_recs_find(id);
    const objective = recs ? `Deep-dive recommendation audit: ${recs.title}` : `Investigate recommendation ${id}`;

    const newInv = await dbRepository.createInvestigation({
      title: recs ? `Action: ${recs.title}` : `Recommendation Investigation`,
      objective,
      priority: 'HIGH',
      timeHorizon: 'LAST_6_MONTHS',
      primaryEntities: recs?.entityIds || [],
    });

    await dbRepository.saveDecisionAuditEvent({
      investigationId: newInv.id,
      recommendationId: id,
      action: 'INVESTIGATION_CREATED_FROM_RECOMMENDATION',
      performedBy: 'Executive User',
      details: { newInvestigationId: newInv.id, objective },
    });

    return apiSuccess({ investigation: newInv, message: 'Investigation created from recommendation context' });
  } catch (error: any) {
    return apiError(error.message || 'Failed to create investigation from recommendation', 'INVESTIGATE_BRIDGE_ERROR', 500);
  }
}

function memory_recs_find(id: string) {
  return undefined as any;
}
