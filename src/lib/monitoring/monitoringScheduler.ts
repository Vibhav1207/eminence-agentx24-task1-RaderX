import { WatchlistModel, MonitoringRunModel } from '@/lib/types';
import { dbRepository } from '@/lib/db/repository';
import { orchestratorService } from '@/lib/orchestrator/orchestratorService';
import { defaultChangeDetector } from './changeDetector';
import { defaultAlertEngine } from './alertEngine';

export class MonitoringScheduler {
  private activeJobLocks: Set<string> = new Set();

  /**
   * Identifies watchlists due for execution based on nextRunAt.
   */
  async getDueWatchlists(): Promise<WatchlistModel[]> {
    const watchlists = await dbRepository.getWatchlists();
    const now = new Date().toISOString();

    return watchlists.filter((w) => {
      if (w.status === 'PAUSED') return false;
      if (this.activeJobLocks.has(w.id)) return false;
      if (!w.nextRunAt) return true;
      return w.nextRunAt <= now;
    });
  }

  /**
   * Acquires a concurrency lock to prevent duplicate simultaneous executions.
   */
  acquireLock(watchlistId: string): boolean {
    if (this.activeJobLocks.has(watchlistId)) return false;
    this.activeJobLocks.add(watchlistId);
    return true;
  }

  /**
   * Releases concurrency lock and updates nextRunAt based on schedule.
   */
  async releaseLock(watchlist: WatchlistModel): Promise<void> {
    this.activeJobLocks.delete(watchlist.id);

    const now = new Date();
    let nextMs = 24 * 60 * 60 * 1000; // default DAILY

    switch (watchlist.schedule) {
      case 'HOURLY':
        nextMs = 60 * 60 * 1000;
        break;
      case 'EVERY_6_HOURS':
        nextMs = 6 * 60 * 60 * 1000;
        break;
      case 'WEEKLY':
        nextMs = 7 * 24 * 60 * 60 * 1000;
        break;
      case 'DAILY':
      default:
        nextMs = 24 * 60 * 60 * 1000;
        break;
    }

    const nextRunAt = new Date(now.getTime() + nextMs).toISOString();
    await dbRepository.updateWatchlist(watchlist.id, {
      status: 'ACTIVE',
      lastRunAt: now.toISOString(),
      lastCheckedAt: now.toISOString(),
      nextRunAt,
    });
  }

  /**
   * Recovers jobs stuck in RUNNING for over 15 minutes.
   */
  async recoverStuckJobs(): Promise<void> {
    const watchlists = await dbRepository.getWatchlists();
    const now = Date.now();
    const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

    for (const w of watchlists) {
      if (w.status === 'INVESTIGATING' || w.status === 'RUNNING') {
        const lastRun = w.lastRunAt ? new Date(w.lastRunAt).getTime() : 0;
        if (now - lastRun > TIMEOUT_MS) {
          console.warn(`[MonitoringScheduler] Recovering stuck job for watchlist "${w.name}" (${w.id})`);
          this.activeJobLocks.delete(w.id);
          await dbRepository.updateWatchlist(w.id, { status: 'ACTIVE' });
        }
      }
    }
  }

  /**
   * Triggers a continuous monitoring run for a watchlist using the Master Orchestrator.
   */
  async triggerMonitoringRun(watchlistId: string): Promise<MonitoringRunModel> {
    const watchlist = await dbRepository.getWatchlistById(watchlistId);
    if (!watchlist) {
      throw new Error(`Watchlist ${watchlistId} not found`);
    }

    if (!this.acquireLock(watchlistId)) {
      throw new Error(`Watchlist ${watchlistId} is already running in another job`);
    }

    // 1. Create MonitoringRun record
    const run = await dbRepository.createMonitoringRun({
      watchlistId,
      status: 'RUNNING',
    });

    await dbRepository.updateWatchlist(watchlistId, { status: 'INVESTIGATING' });

    try {
      // 2. Find or Create Investigation associated with Watchlist
      let inv = watchlist.investigationId
        ? await dbRepository.getInvestigationById(watchlist.investigationId)
        : undefined;

      if (!inv) {
        inv = await dbRepository.createInvestigation({
          title: `${watchlist.organization} × ${watchlist.technology} Watchlist Run`,
          objective: watchlist.objective || `Continuous background monitoring for ${watchlist.organization}`,
          priority: 'HIGH',
          timeHorizon: 'Last 7 days',
          primaryEntities: [watchlist.organization, watchlist.technology],
        });
        await dbRepository.updateWatchlist(watchlistId, { investigationId: inv.id });
      }

      // 3. Dispatch to Master Orchestrator
      const mission = await orchestratorService.startMission(inv.id);

      // Wait for Orchestrator mission completion
      let attempts = 0;
      while (attempts < 15) {
        await new Promise((r) => setTimeout(r, 600));
        const mState = orchestratorService.getMissionState(inv.id);
        if (mState?.status === 'COMPLETED' || mState?.status === 'FAILED') {
          break;
        }
        attempts++;
      }

      // 4. Retrieve Evidence & Signals from Database
      const incomingEvidence = await dbRepository.getEvidenceByInvestigationId(inv.id);
      const currentSignals = await dbRepository.getSignalsByInvestigationId(inv.id);

      // 5. Delta Detection & Fingerprinting
      const changeSet = await defaultChangeDetector.detectChanges(incomingEvidence);

      // 6. Evaluate Signals & Generate Intelligent Alerts
      const newAlerts = await defaultAlertEngine.evaluateAndAlert(
        watchlist,
        changeSet,
        currentSignals,
        run.id
      );

      // Determine Source Coverage from actual evidence
      const sourceCoverage: MonitoringRunModel['sourceCoverage'] = {
        RESEARCH: incomingEvidence.some((e) => e.sourceType === 'RESEARCH') ? 'AVAILABLE' : 'UNAVAILABLE',
        PATENT: incomingEvidence.some((e) => e.sourceType === 'PATENT') ? 'AVAILABLE' : 'UNAVAILABLE',
        NEWS: incomingEvidence.some((e) => e.sourceType === 'NEWS') ? 'AVAILABLE' : 'UNAVAILABLE',
        COMPETITOR: incomingEvidence.some((e) => e.sourceType === 'COMPETITOR') ? 'AVAILABLE' : 'UNAVAILABLE',
        WEB: incomingEvidence.some((e) => e.sourceType === 'WEB') ? 'AVAILABLE' : 'UNAVAILABLE',
      };

      const hasPartialFailures = Object.values(sourceCoverage).includes('UNAVAILABLE');

      // 7. Update MonitoringRun Record
      const updatedRun = await dbRepository.updateMonitoringRun(run.id, {
        completedAt: new Date().toISOString(),
        status: hasPartialFailures ? 'PARTIAL' : 'COMPLETED',
        newEvidenceIds: changeSet.newEvidence.map((e) => e.id),
        changedEvidenceIds: changeSet.changedEvidence.map((e) => e.id),
        signalIds: currentSignals.map((s) => s.id),
        alertIds: newAlerts.map((a) => a.id),
        sourceCoverage,
      });

      await this.releaseLock(watchlist);
      return updatedRun || run;
    } catch (error: any) {
      console.error(`[MonitoringScheduler] Run failed for watchlist ${watchlistId}:`, error);
      await dbRepository.updateMonitoringRun(run.id, {
        completedAt: new Date().toISOString(),
        status: 'FAILED',
        errors: [error.message || 'Unknown orchestration error'],
      });
      await this.releaseLock(watchlist);
      throw error;
    }
  }
}

export const defaultMonitoringScheduler = new MonitoringScheduler();
