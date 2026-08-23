import { NextRequest, NextResponse } from 'next/server';
import { traceService } from '@/lib/tracing/traceService';
import { dbRepository } from '@/lib/db/repository';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const traceId = searchParams.get('traceId');
    const eventId = searchParams.get('eventId');
    const limit = parseInt(searchParams.get('limit') || '200');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (eventId) {
      // Get specific event - would need to search across all traces
      // For now return from the trace if we have traceId
      if (traceId) {
        const events = traceService.getEvents(traceId);
        const event = events.find(e => e.eventId === eventId);
        if (!event) {
          return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: event });
      }
      return NextResponse.json({ success: false, error: 'traceId required for eventId lookup' }, { status: 400 });
    }

    if (traceId) {
      const events = traceService.getEvents(traceId);
      const paginated = events.slice(offset, offset + limit);
      return NextResponse.json({ 
        success: true, 
        data: paginated,
        total: events.length,
        limit,
        offset
      });
    }

    return NextResponse.json({ success: false, error: 'traceId required' }, { status: 400 });
  } catch (error) {
    console.error('GET /api/traces/events error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { traceId, event, events: eventArray } = body;

    if (!traceId) {
      return NextResponse.json({ success: false, error: 'traceId required' }, { status: 400 });
    }

    if (eventArray && Array.isArray(eventArray)) {
      // Batch add events
      eventArray.forEach((e: any) => traceService.addEvent(e));
      await traceService.persistTrace(traceId);
      return NextResponse.json({ success: true, data: { added: eventArray.length } });
    }

    if (event) {
      traceService.addEvent(event);
      await traceService.persistTrace(traceId);
      return NextResponse.json({ success: true, data: event });
    }

    return NextResponse.json({ success: false, error: 'event or events array required' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/traces/events error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}