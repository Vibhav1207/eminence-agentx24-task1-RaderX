import { NextRequest } from 'next/server';
import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(request: NextRequest) {
  try {
    const profiles = await dbRepository.getEntityProfiles();
    return apiSuccess(profiles);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch entity profiles', 'ENTITIES_FETCH_ERROR', 500);
  }
}
