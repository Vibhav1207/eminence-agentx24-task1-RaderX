import { NextRequest } from 'next/server';
import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const brief = await dbRepository.getExecutiveBriefByInvestigationId(id);
    return apiSuccess(brief?.keyChanges || []);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch material changes', 'CHANGES_FETCH_ERROR', 500);
  }
}
