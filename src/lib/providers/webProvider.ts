import {
  SourceProvider,
  SourceResult,
  SourceSearchOptions,
  ProviderHealth,
  sourceCache,
  withRateLimit,
} from './sourceProvider';

export class WebProvider implements SourceProvider {
  name = 'Web Intelligence & GitHub Code Velocity Index';
  category = 'WEB' as const;
  healthStatus: ProviderHealth = 'AVAILABLE';

  private readonly DEFAULT_TIMEOUT_MS = 8000;

  async search(query: string, options: SourceSearchOptions = {}): Promise<SourceResult[]> {
    const limit = options.limit || 4;
    const cacheKey = `web:${query}:${limit}`;
    const cached = sourceCache.get(cacheKey);
    if (cached) return cached;

    try {
      const results = await withRateLimit(async () => {
        return await this.fetchRealWebResults(query, limit);
      });

      this.healthStatus = 'AVAILABLE';
      sourceCache.set(cacheKey, results);
      return results;
    } catch (error) {
      console.warn(`[WebProvider] Real web search failed for query "${query}":`, error);
      this.healthStatus = 'DEGRADED';
      return [];
    }
  }

  private async fetchRealWebResults(query: string, limit: number): Promise<SourceResult[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUT_MS);
    const now = new Date().toISOString();
    const verifiedResults: SourceResult[] = [];

    try {
      // 1. Fetch real GitHub repositories via GitHub Search API
      const ghUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${limit}`;
      const ghRes = await fetch(ghUrl, {
        headers: {
          'User-Agent': 'RadarX-Intelligence/2.6',
          'Accept': 'application/vnd.github.v3+json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (ghRes.ok) {
        const ghData = await ghRes.json();
        const items = ghData?.items || [];

        for (const repo of items) {
          if (repo.full_name && repo.html_url) {
            verifiedResults.push({
              id: `web-github-${repo.id}`,
              title: `GitHub Repository: ${repo.full_name}`,
              summary: repo.description
                ? `${repo.description} (${repo.stargazers_count} stars, language: ${repo.language || 'Code'})`
                : `Open-source codebase with ${repo.stargazers_count} stars tracking ${query}.`,
              url: repo.html_url,
              publishedAt: repo.pushed_at ? repo.pushed_at.split('T')[0] : now.split('T')[0],
              retrievedAt: now,
              authors: [repo.owner?.login || 'GitHub Developer'],
              provider: 'GitHub Code Index',
              sourceName: 'GitHub',
              sourceType: 'WEB',
              sourceQuality: 'SECONDARY',
              relevanceScore: 89,
              confidence: 90,
              queryUsed: query,
              entityCandidates: [repo.name, query],
              externalId: String(repo.id),
              verificationStatus: 'VERIFIED',
              verificationReason: 'Verified GitHub API repository item',
              metrics: [
                { label: 'Stars', value: String(repo.stargazers_count) },
                { label: 'Forks', value: String(repo.forks_count) },
              ],
              rawMetadata: { repoId: repo.id, stars: repo.stargazers_count, language: repo.language },
            });
          }
        }
      }
    } catch {}

    // 2. Fetch real arXiv preprints via arXiv REST API
    try {
      const arxivUrl = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${limit}`;
      const arxivRes = await fetch(arxivUrl, { headers: { 'User-Agent': 'RadarX-Intelligence/2.6' } });

      if (arxivRes.ok) {
        const xmlText = await arxivRes.text();
        // Parse arXiv XML entry blocks
        const entries = xmlText.split('<entry>');
        entries.shift(); // Remove feed header

        for (const entry of entries) {
          const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
          const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/);
          const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
          const publishedMatch = entry.match(/<published>([\s\S]*?)<\/published>/);
          const authorMatches = Array.from(entry.matchAll(/<name>([\s\S]*?)<\/name>/g)).map((m) => m[1].trim());

          const title = titleMatch ? titleMatch[1].replace(/\n/g, ' ').trim() : '';
          const arxivId = idMatch ? idMatch[1].trim() : '';
          const summary = summaryMatch ? summaryMatch[1].replace(/\n/g, ' ').substring(0, 300).trim() + '...' : '';
          const publishedAt = publishedMatch ? publishedMatch[1].split('T')[0] : now.split('T')[0];

          if (title && arxivId) {
            verifiedResults.push({
              id: `web-arxiv-${arxivId.replace(/[^a-zA-Z0-9]/g, '-')}`,
              title: `arXiv Preprint: ${title}`,
              summary: summary || `Academic preprint analyzing ${query}.`,
              url: arxivId,
              publishedAt,
              retrievedAt: now,
              authors: authorMatches.length > 0 ? authorMatches.slice(0, 3) : ['arXiv Research Team'],
              provider: 'arXiv.org Archive',
              sourceName: 'arXiv',
              sourceType: 'WEB',
              sourceQuality: 'PRIMARY',
              relevanceScore: 91,
              confidence: 93,
              queryUsed: query,
              entityCandidates: [query],
              externalId: arxivId,
              verificationStatus: 'VERIFIED',
              verificationReason: 'Verified arXiv REST API response',
              metrics: [{ label: 'arXiv ID', value: arxivId.split('/abs/')[1] || arxivId }],
              rawMetadata: { arxivId },
            });
          }
        }
      }
    } catch {}

    return verifiedResults.slice(0, limit);
  }

  getHealthStatus(): ProviderHealth {
    return this.healthStatus;
  }
}

export const defaultWebProvider = new WebProvider();