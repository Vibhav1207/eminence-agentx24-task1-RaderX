import {
  WatchlistModel,
  ChangeSetModel,
  SignalModel,
  AlertModel,
  AlertSeverity,
  ImpactLevel,
} from '@/lib/types';
import { dbRepository } from '@/lib/db/repository';

export class AlertEngine {
  /**
   * Evaluates change sets and signals against watchlist sensitivity to trigger high-quality alerts.
   */
  async evaluateAndAlert(
    watchlist: WatchlistModel,
    changeSet: ChangeSetModel,
    signals: SignalModel[],
    monitoringRunId: string
  ): Promise<AlertModel[]> {
    const createdAlerts: AlertModel[] = [];
    const sensitivity = watchlist.sensitivity || 'MEDIUM';
    const newCount = changeSet.newEvidence.length;

    // Zero-mock / Noise-control rule: If zero net-new evidence AND zero high-momentum signals, DO NOT alert!
    if (newCount === 0 && signals.length === 0) {
      console.log(`[AlertEngine] Watchlist "${watchlist.name}": 0 new evidence items and 0 signals. Skipping alert generation.`);
      return [];
    }

    // Process each validated or high-momentum signal
    for (const sig of signals) {
      const severity = this.mapImpactToSeverity(sig.impact);

      if (!this.meetsSensitivityThreshold(severity, sensitivity)) {
        continue;
      }

      // Check Deduplication: Avoid duplicate alerts for same signal & watchlist
      const existingAlerts = await dbRepository.getAlerts();
      const isDuplicate = existingAlerts.some(
        (a) => a.watchlistId === watchlist.id && (a.signalId === sig.id || a.title === sig.title)
      );

      if (isDuplicate) {
        console.log(`[AlertEngine] Skipping duplicate alert for signal "${sig.title}".`);
        continue;
      }

      const whatChanged = `${watchlist.organization} × ${watchlist.technology}: Detected ${sig.title.toLowerCase()}.`;
      const whyItMatters = sig.summary || `Correlated across ${sig.sourceTypes.join(', ')} evidence streams.`;
      const recommendedAction = `Benchmark internal team capabilities and monitor quarterly disclosures for ${watchlist.organization}.`;

      const alert = await dbRepository.createAlert({
        watchlistId: watchlist.id,
        monitoringRunId,
        investigationId: sig.investigationId,
        signalId: sig.id,
        title: `Strategic Alert: ${sig.title}`,
        summary: `${whatChanged} ${whyItMatters}`,
        impact: sig.impact,
        severity,
        category: sig.impact === 'CRITICAL' || sig.type === 'THREAT' ? 'THREAT' : 'HIGH IMPACT',
        confidence: sig.confidence || 90,
        evidenceCount: sig.evidenceIds.length || newCount || 1,
        timeAgo: 'Just now',
        whatChanged,
        whyItMatters,
        recommendedAction,
      });

      createdAlerts.push(alert);
    }

    // Fallback: If net-new evidence items were discovered but no individual signal triggered an alert
    if (createdAlerts.length === 0 && newCount > 0 && sensitivity !== 'CRITICAL') {
      const title = `New Evidence Discovered for ${watchlist.organization}`;
      const existingAlerts = await dbRepository.getAlerts();
      const isDuplicate = existingAlerts.some((a) => a.watchlistId === watchlist.id && a.title === title);

      if (!isDuplicate) {
        const alert = await dbRepository.createAlert({
          watchlistId: watchlist.id,
          monitoringRunId,
          investigationId: watchlist.investigationId || 'inv-monitoring',
          title,
          summary: `Retrieved ${newCount} net-new primary evidence item(s) from connected providers.`,
          impact: 'MEDIUM',
          severity: 'MEDIUM',
          category: 'SIGNAL',
          confidence: 88,
          evidenceCount: newCount,
          timeAgo: 'Just now',
          whatChanged: `Retrieved ${newCount} new research publication(s) or patent disclosures for ${watchlist.technology}.`,
          whyItMatters: 'Provides early indicator of technical momentum before commercial product releases.',
          recommendedAction: `Review new evidence links on the Watchlist Intelligence tab.`,
        });

        createdAlerts.push(alert);
      }
    }

    return createdAlerts;
  }

  private mapImpactToSeverity(impact: ImpactLevel): AlertSeverity {
    switch (impact) {
      case 'CRITICAL':
        return 'CRITICAL';
      case 'HIGH':
      case 'MEDIUM_HIGH':
        return 'HIGH';
      case 'MEDIUM':
        return 'MEDIUM';
      default:
        return 'LOW';
    }
  }

  private meetsSensitivityThreshold(severity: AlertSeverity, sensitivity: string): boolean {
    switch (sensitivity) {
      case 'CRITICAL':
        return severity === 'CRITICAL';
      case 'HIGH':
        return severity === 'CRITICAL' || severity === 'HIGH';
      case 'LOW':
        return true;
      case 'MEDIUM':
      default:
        return severity !== 'LOW';
    }
  }
}

export const defaultAlertEngine = new AlertEngine();
