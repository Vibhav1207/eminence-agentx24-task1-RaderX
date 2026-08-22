import { NextRequest } from 'next/server';
import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const inv = await dbRepository.getInvestigationById(id);
    if (!inv) return apiError('Investigation not found', 'NOT_FOUND', 404);

    const brief = await dbRepository.getExecutiveBriefByInvestigationId(id);
    const recommendations = await dbRepository.getExecRecommendationsByInvestigationId(id);
    const evidence = await dbRepository.getEvidenceByInvestigationId(id);
    const signals = await dbRepository.getSignalsByInvestigationId(id);

    return apiSuccess({
      investigation: inv,
      brief,
      recommendations,
      evidenceCount: evidence.length,
      signalsCount: signals.length,
    });
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch decision center intelligence', 'DECISION_CENTER_ERROR', 500);
  }
}
