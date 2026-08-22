import { CreateInvestigationSchema } from "@/lib/schemas";
import { getDb } from "@/lib/mongodb";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
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
    const investigation = {
      id: randomUUID(),
      organization,
      technology,
      competitors: competitors.split(",").map((c) => c.trim()).filter(Boolean),
      timeRange,
      strategicQuestion,
      status: "pending" as const,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const db = await getDb();
      await db.collection("investigations").insertOne({ ...investigation, _id: investigation.id as unknown as import("mongodb").ObjectId });
    } catch {
      // If MongoDB is not configured, return the investigation without persisting
    }

    return Response.json({ investigation }, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
