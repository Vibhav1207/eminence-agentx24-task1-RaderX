import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';
import { CreateInvestigationApiSchema } from '@/lib/schemas';
import { agentRegistry } from '@/lib/agents/agentRegistry';

export async function GET() {
  try {
    const investigations = await dbRepository.getInvestigations();
    return apiSuccess(investigations);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch investigations', 'FETCH_ERROR', 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = CreateInvestigationApiSchema.safeParse(body);

    if (!parseResult.success) {
      return apiError(
        'Validation failed for investigation payload',
        'VALIDATION_ERROR',
        400,
        parseResult.error.flatten()
      );
    }

    const { organization, technology, strategicQuestion, priority, timeHorizon, primaryEntities } = parseResult.data;

    const newInv = await dbRepository.createInvestigation({
      title: `${organization} × ${technology}`,
      objective: strategicQuestion,
      priority,
      timeHorizon,
      primaryEntities: primaryEntities.length > 0 ? primaryEntities : [organization, technology],
    });

    // Initialize agent registry for this investigation
    await agentRegistry.initialize();

    console.log(`[API] Created investigation ${newInv.id} via POST /api/investigations`);
    return apiSuccess(newInv, 201);
  } catch (error: any) {
    console.error(`[API] Error creating investigation:`, error);
    return apiError(error.message || 'Failed to create investigation', 'CREATE_ERROR', 500);
  }
}
