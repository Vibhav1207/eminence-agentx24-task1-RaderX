import { NextRequest } from 'next/server';
import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const decisions = await dbRepository.getDecisionLogsByInvestigationId(id);
    return apiSuccess(decisions);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch decision logs', 'DECISION_FETCH_ERROR', 500);
  }
}
