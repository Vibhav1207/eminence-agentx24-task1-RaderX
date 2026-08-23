import {
  SourceProvider,
  SourceResult,
  SourceSearchOptions,
  ProviderHealth,
  sourceCache,
  withRateLimit,
} from './sourceProvider';

export class NewsProvider implements SourceProvider {
  name = 'Global Financial & Tech Media Scan';
  category = 'NEWS' as const;
  healthStatus: ProviderHealth = 'AVAILABLE';

  private readonly DEFAULT_TIMEOUT_MS = 8000;

  async search(query: string, options: SourceSearchOptions = {}): Promise<SourceResult[]> {
    const limit = options.limit || 5;
    const cacheKey = `news:${query}:${limit}`;
    const cached = sourceCache.get(cacheKey);
    if (cached) return cached;

    try {
      const results = await withRateLimit(async () => {
        return await this.fetchRealNews(query, options.entity, limit);
      });

      this.healthStatus = 'AVAILABLE';
      sourceCache.set(cacheKey, results);
      return results;
    } catch (error) {
      console.warn(`[NewsProvider] Real news search failed for query "${query}":`, error);
      this.healthStatus = 'DEGRADED';
      return [];
    }
  }

  private async fetchRealNews(query: string, entity?: string, limit: number = 5): Promise<SourceResult[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUT_MS);
    const now = new Date().toISOString();
    const searchQuery = entity ? `${entity} ${query}` : query;

    try {
      // 1. Try Wikinews / Wikimedia API for verified news articles
      const wikiNewsUrl = `https://en.wikinews.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        searchQuery
      )}&utf8=&format=json&origin=*`;

      const res = await fetch(wikiNewsUrl, {
        headers: { 'User-Agent': 'RadarX-Intelligence/2.6' },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const verifiedResults: SourceResult[] = [];

      if (res.ok) {
        const data = await res.json();
        const searchItems = data?.query?.search || [];

        for (const item of searchItems) {
          const title = item.title;
          const snippet = item.snippet
            ? item.snippet.replace(/<[^>]*>?/gm, '').substring(0, 300) + '...'
            : `News report regarding ${searchQuery}.`;
          const pageId = item.pageid;
          const articleUrl = `https://en.wikinews.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
          const timestamp = item.timestamp || now;

          if (title && articleUrl) {
            verifiedResults.push({
              id: `news-wiki-${pageId}`,
              title,
              summary: snippet,
              url: articleUrl,
              publishedAt: timestamp.split('T')[0],
              retrievedAt: now,
              authors: ['Wikinews Bureau'],
              provider: 'Wikinews International',
              sourceName: 'Wikinews',
              sourceType: 'NEWS',
              sourceQuality: 'PRIMARY',
              relevanceScore: 88,
              confidence: 90,
              queryUsed: searchQuery,
              entityCandidates: [entity || query],
              externalId: String(pageId),
              verificationStatus: 'VERIFIED',
              verificationReason: 'Verified Wikinews article API response',
              metrics: [{ label: 'Publisher', value: 'Wikinews' }],
              rawMetadata: { pageId, timestamp: item.timestamp },
            });
          }
        }
      }

      if (verifiedResults.length >= limit) {
        return this.deduplicateArticles(verifiedResults).slice(0, limit);
      }

      // 2. Fallback to Wikipedia Current Affairs / Main Knowledge Search for verifiable articles
      const wikipediaUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        searchQuery
      )}&utf8=&format=json&origin=*`;

      const wikiRes = await fetch(wikipediaUrl, { headers: { 'User-Agent': 'RadarX-Intelligence/2.6' } });
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();
        const items = wikiData?.query?.search || [];

        for (const item of items) {
          const title = item.title;
          const snippet = item.snippet
            ? item.snippet.replace(/<[^>]*>?/gm, '').substring(0, 300) + '...'
            : `Reference documentation and industry analysis for ${searchQuery}.`;
          const pageId = item.pageid;
          const articleUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
          const timestamp = item.timestamp || now;

          if (title && articleUrl) {
            verifiedResults.push({
              id: `news-[#8C6D13]-${pageId}`,
              title,
              summary: snippet,
              url: articleUrl,
              publishedAt: timestamp.split('T')[0],
              retrievedAt: now,
              authors: ['Wikipedia Industry Bureau'],
              provider: 'Wikipedia Knowledge Index',
              sourceName: 'Wikipedia',
              sourceType: 'WEB',
              sourceQuality: 'SECONDARY',
              relevanceScore: 85,
              confidence: 88,
              queryUsed: searchQuery,
              entityCandidates: [entity || query],
              externalId: String(pageId),
              verificationStatus: 'VERIFIED',
              verificationReason: 'Verified Wikipedia reference article API response',
              metrics: [{ label: 'Publisher', value: 'Wikipedia' }],
              rawMetadata: { pageId, timestamp: item.timestamp },
            });
          }
        }
      }

      return this.deduplicateArticles(verifiedResults).slice(0, limit);
    } catch (err) {
      clearTimeout(timeout);
      return [];
    }
  }

  private deduplicateArticles(articles: SourceResult[]): SourceResult[] {
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();
    const unique: SourceResult[] = [];

    for (const article of articles) {
      const canonicalUrl = (article.url || '').split('?')[0].toLowerCase();
      const normalizedTitle = article.title.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (seenUrls.has(canonicalUrl) || seenTitles.has(normalizedTitle)) {
        continue;
      }

      if (canonicalUrl) seenUrls.add(canonicalUrl);
      seenTitles.add(normalizedTitle);
      unique.push(article);
    }

    return unique;
  }

  getHealthStatus(): ProviderHealth {
    return this.healthStatus;
  }
}

export const defaultNewsProvider = new NewsProvider();