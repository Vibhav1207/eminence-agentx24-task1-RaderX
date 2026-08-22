import { NextRequest } from 'next/server';
import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = await dbRepository.getEntityProfileById(id);
    if (!profile) return apiError('Entity profile not found', 'NOT_FOUND', 404);

    return apiSuccess(profile);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch entity profile', 'ENTITY_FETCH_ERROR', 500);
  }
}
