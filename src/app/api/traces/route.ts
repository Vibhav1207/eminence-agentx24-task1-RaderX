import { NextRequest, NextResponse } from 'next/server';
import { traceService } from '@/lib/tracing/traceService';
import { dbRepository } from '@/lib/db/repository';
import { getAllTraces, getDiagnosisByTraceId, getComparison } from '@/lib/tracing/traceService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const traceId = searchParams.get('traceId');
    const runId = searchParams.get('runId');
    const investigationId = searchParams.get('investigationId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (traceId) {
      const trace = traceService.getTrace(traceId) || await dbRepository.getTraceById(traceId);
      if (!trace) {
        return NextResponse.json({ success: false, error: 'Trace not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: trace });
    }

    if (runId) {
      const trace = traceService.getTraceByRunId(runId) || await dbRepository.getTraceByRunId(runId);
      if (!trace) {
        return NextResponse.json({ success: false, error: 'Trace not found for run' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: trace });
    }

    if (investigationId) {
      const traces = await dbRepository.getTracesByInvestigationId(investigationId);
      return NextResponse.json({ success: true, data: traces });
    }

    // Get all traces
    const traces = await getAllTraces();
    const paginated = traces.slice(offset, offset + limit);
    
    return NextResponse.json({ 
      success: true, 
      data: paginated,
      total: traces.length,
      limit,
      offset
    });
  } catch (error) {
    console.error('GET /api/traces error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, traceId, ...data } = body;

    switch (action) {
      case 'diagnose': {
        if (!traceId) {
          return NextResponse.json({ success: false, error: 'traceId required for diagnose' }, { status: 400 });
        }
        const { diagnoseTrace } = await import('@/lib/tracing/traceService');
        const diagnosis = await diagnoseTrace(traceId);
        return NextResponse.json({ success: true, data: diagnosis });
      }
      
      case 'compare': {
        const { baselineTraceId, optimizedTraceId, optimizationApplied } = data;
        if (!baselineTraceId || !optimizedTraceId) {
          return NextResponse.json({ success: false, error: 'baselineTraceId and optimizedTraceId required' }, { status: 400 });
        }
        const { createComparison } = await import('@/lib/tracing/traceService');
        const baseline = traceService.getTrace(baselineTraceId);
        const optimized = traceService.getTrace(optimizedTraceId);
        
        if (!baseline || !optimized) {
          return NextResponse.json({ success: false, error: 'One or both traces not found' }, { status: 404 });
        }
        
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
      
      case 'create': {
        const { runId, investigationId } = data;
        if (!runId || !investigationId) {
          return NextResponse.json({ success: false, error: 'runId and investigationId required' }, { status: 400 });
        }
        const trace = traceService.createTrace(runId, investigationId);
        return NextResponse.json({ success: true, data: trace });
      }
      
      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('POST /api/traces error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { traceId, updates } = body;
    
    if (!traceId || !updates) {
      return NextResponse.json({ success: false, error: 'traceId and updates required' }, { status: 400 });
    }

    const trace = traceService.updateTrace(traceId, updates);
    if (!trace) {
      return NextResponse.json({ success: false, error: 'Trace not found' }, { status: 404 });
    }

    // Persist to database
    await traceService.persistTrace(traceId);
    
    return NextResponse.json({ success: true, data: trace });
  } catch (error) {
    console.error('PATCH /api/traces error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}