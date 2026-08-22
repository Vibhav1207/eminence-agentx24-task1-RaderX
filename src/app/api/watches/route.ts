import { getDb } from "@/lib/mongodb";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { WatchConfigSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // We expect the body to be a subset of WatchConfig that doesn't have id/createdAt
    const watch = {
      id: randomUUID(),
      organization: body.organization,
      technology: body.technology,
      competitors: body.competitors,
      timeRange: body.timeRange,
      strategicQuestion: body.strategicQuestion,
      frequency: body.frequency || "weekly",
      status: "active",
      createdAt: new Date().toISOString(),
    };

    const parsed = WatchConfigSchema.safeParse(watch);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid watch config", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    try {
      const db = await getDb();
      await db.collection("watches").insertOne({ ...parsed.data, _id: parsed.data.id as any });
    } catch {
      // If DB fails, just return error
      return NextResponse.json({ error: "Failed to save watch to database" }, { status: 500 });
    }

    return NextResponse.json({ watch: parsed.data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = await getDb();
    const watches = await db.collection("watches").find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ watches });
  } catch {
    return NextResponse.json({ watches: [] });
  }
}
