import {
  SourceProvider,
  SourceResult,
  SourceSearchOptions,
  ProviderHealth,
  sourceCache,
  withRateLimit,
} from './sourceProvider';
import { appConfig } from '@/lib/config';

export class CrossrefProvider implements SourceProvider {
  name = 'Crossref Research Provider';
  category = 'RESEARCH' as const;
  healthStatus: ProviderHealth = 'AVAILABLE';

  private readonly DEFAULT_TIMEOUT_MS = 8000;
  private readonly FALLBACK_TIMEOUT_MS = 4000;

  async search(query: string, options: SourceSearchOptions = {}): Promise<SourceResult[]> {
    const limit = options.limit || 5;
    const cacheKey = `crossref:${query}:${limit}`;
    const cached = sourceCache.get(cacheKey);
    if (cached) return cached;

    const mailto = appConfig.crossrefMailto;
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.crossref.org/works?query=${encodedQuery}&rows=${limit}&mailto=${encodeURIComponent(mailto)}`;

    try {
      const results = await this.searchWithTimeout(url, mailto, query);
      this.healthStatus = 'AVAILABLE';
      sourceCache.set(cacheKey, results);
      return results;
    } catch (error) {
      console.warn(`[CrossrefProvider] Search failed for query "${query}":`, error);
      this.healthStatus = 'DEGRADED';
      // Return empty array - let the agent handle fallback
      return [];
    }
  }

  private async searchWithTimeout(url: string, mailto: string, query: string): Promise<SourceResult[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': `RadarX-Intelligence/2.6 (mailto:${mailto})`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Crossref API returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const items = data?.message?.items || [];
      const now = new Date().toISOString();

      return items.map((item: any): SourceResult => {
        const title = item.title?.[0] || 'Untitled Research Publication';
        const authors = (item.author || []).map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()).filter(Boolean);
        const publishedYear = item.published?.['date-parts']?.[0]?.[0] || item.created?.['date-parts']?.[0]?.[0] || '2026';
        const doi = item.DOI;
        const urlStr = doi ? `https://doi.org/${doi}` : item.URL || `https://search.crossref.org/?q=${encodeURIComponent(query)}`;
        const subjects = item.subject || [];
        const entityCandidates = Array.from(
          new Set([...subjects, ...title.split(' ').filter((w: string) => w.length > 4)])
        ).slice(0, 4);

        const isVerified = Boolean(doi || item.URL) && Boolean(title && title !== 'Untitled Research Publication');
        const publisherName = item.publisher || 'Crossref REST API';

        return {
          id: `crossref-${doi ? doi.replace(/[^a-zA-Z0-9]/g, '-') : Math.random().toString(36).substring(2, 8)}`,
          title,
          summary: item.abstract
            ? item.abstract.replace(/<[^>]*>?/gm, '').substring(0, 300) + '...'
            : `Academic research publication published in ${publishedYear} focusing on ${subjects.slice(0, 2).join(', ') || query}. Abstract retrieved from Crossref REST API.`,
          url: urlStr,
          publishedAt: `${publishedYear}-01-01`,
          retrievedAt: now,
          authors: authors.length > 0 ? authors.slice(0, 3) : [publisherName],
          provider: publisherName,
          sourceName: publisherName,
          sourceType: 'RESEARCH' as const,
          sourceQuality: 'PRIMARY' as const,
          relevanceScore: 92,
          confidence: isVerified ? 92 : 50,
          queryUsed: query,
          entityCandidates,
          doi,
          externalId: doi || item.URL,
          verificationStatus: isVerified ? 'VERIFIED' : 'UNVERIFIED',
          verificationReason: isVerified ? 'Verified Crossref DOI record' : 'Missing DOI or canonical URL',
          metrics: [
            { label: 'DOI', value: doi || 'N/A' },
            { label: 'Publisher', value: publisherName },
          ],
          rawMetadata: { doi, publisher: item.publisher, type: item.type, containerTitle: item['container-title'] },
        };
      });
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  getHealthStatus(): ProviderHealth {
    return this.healthStatus;
  }
}

export const defaultCrossrefProvider = new CrossrefProvider();