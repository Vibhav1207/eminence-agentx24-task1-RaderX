import { dbRepository } from "@/lib/db/repository";
import { orchestratorService } from "@/lib/orchestrator/orchestratorService";
import { apiSuccess, apiError } from "@/lib/api/response";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return apiError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const watchlists = await dbRepository.getWatchlists();
    const activeWatchlists = watchlists.filter((w) => w.status === "ACTIVE" || w.status === "INVESTIGATING");
    const results = [];

    for (const watch of activeWatchlists) {
      try {
        const inv = await dbRepository.createInvestigation({
          title: `${watch.organization} × ${watch.technology} Automated Watch`,
          objective: watch.objective || `Continuous background monitoring for ${watch.organization}`,
          priority: "HIGH",
          timeHorizon: "Last 7 days",
          primaryEntities: [watch.organization, watch.technology],
        });

        await orchestratorService.startMission(inv.id);
        await dbRepository.updateWatchlist(watch.id, { lastCheckedAt: new Date().toISOString() });
        results.push({ watchlistId: watch.id, investigationId: inv.id, status: "DISPATCHED" });
      } catch (err: any) {
        results.push({ watchlistId: watch.id, status: "FAILED", error: err.message });
      }
    }

    return apiSuccess({ message: "Cron scan execution complete", results });
  } catch (error: any) {
    return apiError(error.message || "Cron execution failed", "CRON_ERROR", 500);
  }
}
