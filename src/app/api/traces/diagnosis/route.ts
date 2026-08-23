import { NextRequest, NextResponse } from 'next/server';
import { traceService } from '@/lib/tracing/traceService';
import { traceDiagnosisEngine } from '@/lib/tracing/diagnosisEngine';
import { dbRepository } from '@/lib/db/repository';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const traceId = searchParams.get('traceId');
    const diagnosisId = searchParams.get('diagnosisId');
    const investigationId = searchParams.get('investigationId');

    if (diagnosisId) {
      // Need to search in diagnoses map by diagnosisId
      let diagnosis: any = undefined;
      // Check in-memory first
      for (const d of (traceService as any).diagnoses?.values() || []) {
        if (d.diagnosisId === diagnosisId) {
          diagnosis = d;
          break;
        }
      }
      // Check DB
      if (!diagnosis) {
        diagnosis = await dbRepository.getTraceDiagnosisById(diagnosisId);
      }
      if (!diagnosis) {
        return NextResponse.json({ success: false, error: 'Diagnosis not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: diagnosis });
    }

    if (traceId) {
      const diagnosis = traceService.getDiagnosisByTraceId(traceId) || await dbRepository.getTraceDiagnosisByTraceId(traceId);
      if (!diagnosis) {
        return NextResponse.json({ success: false, error: 'No diagnosis found for trace' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: diagnosis });
    }

    if (investigationId) {
      const diagnoses = await dbRepository.getTraceDiagnosesByInvestigationId(investigationId);
      return NextResponse.json({ success: true, data: diagnoses });
    }

    return NextResponse.json({ success: false, error: 'traceId or diagnosisId required' }, { status: 400 });
  } catch (error) {
    console.error('GET /api/traces/diagnosis error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, traceId } = body;

    if (action === 'analyze') {
      if (!traceId) {
        return NextResponse.json({ success: false, error: 'traceId required for analysis' }, { status: 400 });
      }
      
      // Use the diagnosis engine for comprehensive analysis
      // First check in-memory trace service
      const trace = traceService.getTrace(traceId);
      if (!trace) {
        return NextResponse.json({ success: false, error: 'Trace not found' }, { status: 404 });
      }
      
      const diagnosis = await traceDiagnosisEngine.analyzeTrace(traceId);
      
      if (!diagnosis) {
        return NextResponse.json({ success: false, error: 'Trace not found or analysis failed' }, { status: 404 });
      }
      
      // Persist the diagnosis
      traceService.addDiagnosis(diagnosis);
      await traceService.persistDiagnosis(diagnosis);
      
      return NextResponse.json({ success: true, data: diagnosis });
    }

    if (action === 'detect-patterns') {
      const diagnoses = await traceDiagnosisEngine.detectPatterns(body.investigationId);
      return NextResponse.json({ success: true, data: diagnoses });
    }

    if (action === 'generate-optimizations') {
      const diagnoses = await traceDiagnosisEngine.detectPatterns(body.investigationId);
      const optimizations = await traceDiagnosisEngine.generateOptimizations(diagnoses);
      return NextResponse.json({ success: true, data: optimizations });
    }

    if (action === 'detect-bottlenecks') {
      if (!traceId) {
        return NextResponse.json({ success: false, error: 'traceId required for bottleneck detection' }, { status: 400 });
      }
      const bottlenecks = await traceDiagnosisEngine.detectBottlenecks(traceId);
      return NextResponse.json({ success: true, data: bottlenecks });
    }

    if (action === 'compare') {
      const { baselineTraceId, optimizedTraceId } = body;
      if (!baselineTraceId || !optimizedTraceId) {
        return NextResponse.json({ success: false, error: 'baselineTraceId and optimizedTraceId required' }, { status: 400 });
      }
      const comparison = await traceDiagnosisEngine.compareTraces(baselineTraceId, optimizedTraceId);
      return NextResponse.json({ success: true, data: comparison });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/traces/diagnosis error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}