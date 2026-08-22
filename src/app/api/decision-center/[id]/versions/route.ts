import { NextRequest } from 'next/server';
import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const versions = await dbRepository.getExecutiveBriefVersions(id);
    return apiSuccess(versions);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch brief versions', 'VERSIONS_FETCH_ERROR', 500);
  }
}
