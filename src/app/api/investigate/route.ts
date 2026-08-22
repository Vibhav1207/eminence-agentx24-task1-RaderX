export const maxDuration = 60; // Allow Vercel functions up to 60 seconds

import { CreateInvestigationSchema } from "@/lib/schemas";
import { getDb } from "@/lib/mongodb";
import { randomUUID } from "crypto";
import { runInvestigationAgent } from "@/lib/agent/agent";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("[Pipeline Debug] -> Request received for /api/investigate:", JSON.stringify(body).slice(0, 200));
    const parsed = CreateInvestigationSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { organization, technology, competitors, timeRange, strategicQuestion } =
      parsed.data;

    const now = new Date().toISOString();
    const investigationId = randomUUID();
    
    // Run the agent synchronously for now, as the frontend awaits the fetch call
    const report = await runInvestigationAgent(
      investigationId,
      organization,
      technology,
      competitors.split(",").map(c => c.trim()),
      timeRange,
      strategicQuestion,
      (event) => console.log(`[Agent Event]: ${event}`)
    );

    const investigation = {
      id: investigationId,
      organization,
      technology,
      competitors: competitors.split(",").map((c) => c.trim()).filter(Boolean),
      timeRange,
      strategicQuestion,
      status: "completed" as const,
      report,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDb();
    await db.collection("investigations").insertOne({ ...investigation, _id: investigation.id as unknown as import("mongodb").ObjectId });

    console.log("[Pipeline Debug] -> Response returned successfully (201). Investigation ID:", investigation.id);
    return Response.json({ investigation }, { status: 201 });
  } catch (error: unknown) {
    console.error("Agent execution failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
