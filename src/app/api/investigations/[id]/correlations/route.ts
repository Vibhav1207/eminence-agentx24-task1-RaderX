import { dbRepository } from '@/lib/db/repository';
import { defaultCorrelationEngine } from '@/lib/intelligence/correlationEngine';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const inv = await dbRepository.getInvestigationById(id);
    if (!inv) return apiError('Investigation not found', 'NOT_FOUND', 404);

    const evidence = await dbRepository.getEvidenceByInvestigationId(id);
    const entities = await dbRepository.getEntitiesByInvestigationId(id);
    const relationships = await dbRepository.getRelationshipsByInvestigationId(id);

    const correlation = defaultCorrelationEngine.correlate(evidence, entities, relationships, inv);
    return apiSuccess(correlation);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch correlations', 'FETCH_ERROR', 500);
  }
}
