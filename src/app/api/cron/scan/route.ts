import { getDb } from "@/lib/mongodb";
import { runInvestigationAgent } from "@/lib/agent/agent";
import { WatchConfig, Investigation } from "@/lib/schemas";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const watches = await db
      .collection<WatchConfig>("watches")
      .find({ status: "active" })
      .toArray();

    const results = [];

    for (const watch of watches) {
      console.log(`Running scan for watch: ${watch.id}`);
      try {
        const investigationId = randomUUID();
        const report = await runInvestigationAgent(
          investigationId,
          watch.organization,
          watch.technology,
          watch.competitors,
          watch.timeRange,
          watch.strategicQuestion
        );

        // Fetch previous investigation for this watch to find new signals
        const previousInv = await db
          .collection("investigations")
          .findOne(
            { watchId: watch.id },
            { sort: { createdAt: -1 } }
          ) as unknown as Investigation | null;
        
        let newSignalsCount = 0;

        if (previousInv?.report) {
          const oldTitles = new Set(previousInv.report.signals.map((s: any) => s.title));
          const newSignals = report.signals.filter((s: any) => !oldTitles.has(s.title));
          newSignalsCount = newSignals.length;
        } else {
          newSignalsCount = report.signals.length;
        }

        const now = new Date().toISOString();
        const investigation = {
          id: investigationId,
          watchId: watch.id,
          organization: watch.organization,
          technology: watch.technology,
          competitors: watch.competitors,
          timeRange: watch.timeRange,
          strategicQuestion: watch.strategicQuestion,
          status: "completed" as const,
          report,
          createdAt: now,
          updatedAt: now,
        };

        // Save investigation
        await db.collection("investigations").insertOne({
          ...investigation,
          _id: investigation.id as any,
        });

        // Update watch last scan
        await db.collection("watches").updateOne(
          { _id: watch._id as any },
          { $set: { lastScan: now } }
        );

        results.push({ watchId: watch.id, newSignalsCount, success: true });
      } catch (err: unknown) {
        console.error(`Failed to scan watch ${watch.id}:`, err);
        results.push({ watchId: watch.id, success: false });
      }
    }

    return NextResponse.json({ message: "Scan complete", results });
  } catch (error: unknown) {
    console.error("Cron execution failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
