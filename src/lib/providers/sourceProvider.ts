export type SourceQuality = 'PRIMARY' | 'SECONDARY' | 'AGGREGATED' | 'UNKNOWN';

export type ProviderHealth = 'AVAILABLE' | 'DEGRADED' | 'OFFLINE';

export interface SourceSearchOptions {
  limit?: number;
  offset?: number;
  timeHorizon?: string; // e.g. 'last_30_days'
  entity?: string;
  sortBy?: 'relevance' | 'date';
}

export interface SourceResult {
  id: string;
  title: string;
  summary: string;
  url?: string;
  publishedAt?: string;
  retrievedAt: string;
  authors?: string[];
  provider: string;
  sourceType: 'RESEARCH' | 'PATENT' | 'NEWS' | 'WEB' | 'COMPANY' | 'COMPETITOR' | 'PUBLIC_DATA';
  sourceQuality: SourceQuality;
  relevanceScore: number;
  confidence: number;
  queryUsed: string;
  entityCandidates: string[];
  metrics?: Array<{ label: string; value: string }>;
  rawMetadata?: Record<string, unknown>;
}

export interface SourceProvider {
  name: string;
  category: 'RESEARCH' | 'PATENTS' | 'NEWS' | 'WEB' | 'COMPANIES' | 'PUBLIC DATA';
  healthStatus: ProviderHealth;
  search(query: string, options?: SourceSearchOptions): Promise<SourceResult[]>;
  getById?(id: string): Promise<SourceResult | null>;
}

// Simple in-memory cache to avoid duplicate external requests
class SourceCache {
  private cache: Map<string, { data: SourceResult[]; timestamp: number }> = new Map();
  private ttlMs = 10 * 60 * 1000; // 10 minutes cache TTL

  get(key: string): SourceResult[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: SourceResult[]) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}

export const sourceCache = new SourceCache();

// Rate limiter / backoff helper
export async function withRateLimit<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  delayMs = 500
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, attempt - 1)));
    }
  }
}
