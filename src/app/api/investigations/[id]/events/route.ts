import { getDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { AgentEvent } from "@/lib/agent/events";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: "Invalid investigation ID" }, { status: 400 });
    }

    const db = await getDb();
    
    // Check if investigation exists first to return proper 404
    const investigation = await db.collection("investigations").findOne({ id });
    if (!investigation) {
      return NextResponse.json({ error: "Investigation not found" }, { status: 404 });
    }
    
    // Fetch events sorted by timestamp ascending
    const events = await db
      .collection<AgentEvent>("agent_events")
      .find({ investigationId: id })
      .sort({ timestamp: 1 })
      .toArray();

    return NextResponse.json({ events });
  } catch (error: unknown) {
    console.error("Failed to fetch investigation events:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
