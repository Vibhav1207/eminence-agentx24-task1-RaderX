import { NextRequest } from 'next/server';
import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, owner, notes } = body;

    const updated = await dbRepository.updateRecommendationStatus(id, status, { owner, notes });
    if (!updated) return apiError('Recommendation not found', 'NOT_FOUND', 404);

    // Audit log recording
    await dbRepository.saveDecisionAuditEvent({
      investigationId: updated.investigationId,
      recommendationId: id,
      action: `RECOMMENDATION_STATUS_${status}`,
      performedBy: owner || 'Executive User',
      details: { status, notes },
    });

    return apiSuccess(updated);
  } catch (error: any) {
    return apiError(error.message || 'Failed to update recommendation', 'RECOMMENDATION_UPDATE_ERROR', 500);
  }
}
