import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/evaluation/[id] — get a single evaluation run by ID
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const run = await dbRepository.getEvaluationRunById(id);
    if (!run) {
      return apiError(`Evaluation run ${id} not found`, 'NOT_FOUND', 404);
    }
    return apiSuccess(run);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch evaluation run', 'FETCH_ERROR', 500);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/evaluation/[id] — delete an evaluation run
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await dbRepository.getEvaluationRunById(id);
    if (!existing) {
      return apiError(`Evaluation run ${id} not found`, 'NOT_FOUND', 404);
    }
    await dbRepository.deleteEvaluationRun(id);
    return apiSuccess({ deleted: true, id });
  } catch (error: any) {
    return apiError(error.message || 'Failed to delete evaluation run', 'DELETE_ERROR', 500);
  }
}
