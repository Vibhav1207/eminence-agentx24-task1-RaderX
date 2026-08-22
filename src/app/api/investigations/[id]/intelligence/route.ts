import { dbRepository } from '@/lib/db/repository';
import { defaultSynthesisEngine } from '@/lib/intelligence/synthesisEngine';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const inv = await dbRepository.getInvestigationById(id);
    if (!inv) return apiError('Investigation not found', 'NOT_FOUND', 404);

    if (inv.intelligence) {
      return apiSuccess(inv.intelligence);
    }

    const evidence = await dbRepository.getEvidenceByInvestigationId(id);
    const signals = await dbRepository.getSignalsByInvestigationId(id);
    const entities = await dbRepository.getEntitiesByInvestigationId(id);
    const relationships = await dbRepository.getRelationshipsByInvestigationId(id);

    const intelligence = await defaultSynthesisEngine.synthesizeIntelligence(
      inv,
      signals,
      evidence,
      entities,
      relationships
    );

    await dbRepository.updateInvestigation(id, { intelligence });
    return apiSuccess(intelligence);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch intelligence', 'FETCH_ERROR', 500);
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const inv = await dbRepository.getInvestigationById(id);
    if (!inv) return apiError('Investigation not found', 'NOT_FOUND', 404);

    const evidence = await dbRepository.getEvidenceByInvestigationId(id);
    const signals = await dbRepository.getSignalsByInvestigationId(id);
    const entities = await dbRepository.getEntitiesByInvestigationId(id);
    const relationships = await dbRepository.getRelationshipsByInvestigationId(id);

    const intelligence = await defaultSynthesisEngine.synthesizeIntelligence(
      inv,
      signals,
      evidence,
      entities,
      relationships
    );

    await dbRepository.updateInvestigation(id, { intelligence });
    return apiSuccess({
      version: Date.now(),
      intelligence,
      regeneratedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return apiError(error.message || 'Failed to regenerate intelligence', 'REGENERATE_ERROR', 500);
  }
}
