import { NextRequest, NextResponse } from 'next/server';
import { traceService } from '@/lib/tracing/traceService';
import { dbRepository } from '@/lib/db/repository';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const comparisonId = searchParams.get('comparisonId');
    const runId = searchParams.get('runId');
    const investigationId = searchParams.get('investigationId');

    if (comparisonId) {
      const comparison = traceService.getComparison(comparisonId) || await dbRepository.getTraceComparisonById(comparisonId);
      if (!comparison) {
        return NextResponse.json({ success: false, error: 'Comparison not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: comparison });
    }

    if (runId) {
      const comparisons = await dbRepository.getTraceComparisonsByRunId(runId);
      return NextResponse.json({ success: true, data: comparisons });
    }

    if (investigationId) {
      const comparisons = await dbRepository.getTraceComparisonsByInvestigationId(investigationId);
      return NextResponse.json({ success: true, data: comparisons });
    }

    // Get all comparisons
    const comparisons = traceService.getAllComparisons();
    return NextResponse.json({ success: true, data: comparisons });
  } catch (error) {
    console.error('GET /api/traces/comparisons error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, baselineTraceId, optimizedTraceId, optimizationApplied } = body;

    if (action === 'create') {
      if (!baselineTraceId || !optimizedTraceId) {
        return NextResponse.json({ success: false, error: 'baselineTraceId and optimizedTraceId required' }, { status: 400 });
      }

      const baseline = traceService.getTrace(baselineTraceId);
      const optimized = traceService.getTrace(optimizedTraceId);
      
      if (!baseline || !optimized) {
        return NextResponse.json({ success: false, error: 'One or both traces not found' }, { status: 404 });
      }
      
      const { createComparison } = await import('@/lib/tracing/traceService');
      const comparison = createComparison(
        baselineTraceId,
        optimizedTraceId,
        baseline.runId,
        baseline.investigationId,
        optimizationApplied || 'Manual optimization'
      );
      
      if (!comparison) {
        return NextResponse.json({ success: false, error: 'Failed to create comparison' }, { status: 500 });
      }
      
      await traceService.persistComparison(comparison);
      return NextResponse.json({ success: true, data: comparison });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/traces/comparisons error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}