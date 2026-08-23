import { apiSuccess } from '@/lib/api/response';
import { getDb } from '@/lib/mongodb';
import { appConfig } from '@/lib/config';
import { VerifiedProviderModel } from '@/lib/types';

type Check = { ok: boolean; latencyMs: number; error?: string };

async function checkHttp(url: string, headers?: HeadersInit): Promise<Check> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    return { ok: response.ok, latencyMs: Date.now() - startedAt, error: response.ok ? undefined : `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, latencyMs: Date.now() - startedAt, error: error instanceof Error ? error.message : 'Request failed' };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkMongo(): Promise<Check> {
  const startedAt = Date.now();
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return { ok: true, latencyMs: Date.now() - startedAt };
  } catch (error) {
    return { ok: false, latencyMs: Date.now() - startedAt, error: error instanceof Error ? error.message : 'Database unavailable' };
  }
}

function providerStatus(check: Check, configured = true): VerifiedProviderModel['status'] {
  if (!configured) return 'NOT_CONFIGURED';
  return check.ok ? 'CONNECTED' : 'ERROR';
}

export async function GET() {
  const [crossref, patent, news, web, mongo] = await Promise.all([
    checkHttp('https://api.crossref.org/works?rows=1'),
    checkHttp('https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=SRC:PAT&format=json&pageSize=1'),
    checkHttp('https://en.wikinews.org/w/api.php?action=query&list=search&srsearch=test&format=json'),
    checkHttp('https://api.github.com/zen', { 'User-Agent': 'RadarX-HealthCheck' }),
    checkMongo(),
  ]);
  const geminiConfigured = Boolean(appConfig.geminiApiKey);
  const gemini = geminiConfigured
    ? await checkHttp(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(appConfig.geminiApiKey)}`)
    : { ok: false, latencyMs: 0, error: 'GEMINI_API_KEY is not configured' };
  const now = new Date().toISOString();
  const definition = (id: string, name: string, category: VerifiedProviderModel['category'], typeLabel: string, endpointOrModel: string, check: Check, configured = true): VerifiedProviderModel => ({
    id, name, category, typeLabel,
    status: providerStatus(check, configured),
    isConfigured: configured,
    description: `${name} real dependency check.`,
    latencyMs: check.latencyMs,
    lastCheckedAt: now,
    endpointOrModel,
    notes: check.error || 'Dependency responded successfully.',
  });
  const providers: VerifiedProviderModel[] = [
    definition('prov-crossref', 'Crossref Academic REST API', 'INTELLIGENCE_SOURCE', 'Research publications and DOI metadata', 'https://api.crossref.org/works', crossref),
    definition('prov-uspto', 'Europe PMC Patent REST API', 'INTELLIGENCE_SOURCE', 'Patent records', 'https://www.ebi.ac.uk/europepmc/webservices/rest/search', patent),
    definition('prov-financial-news', 'Wikinews Media API', 'INTELLIGENCE_SOURCE', 'News records', 'https://en.wikinews.org/w/api.php', news),
    definition('prov-github-web', 'GitHub REST API', 'INTELLIGENCE_SOURCE', 'Web and repository records', 'https://api.github.com', web),
    definition('prov-gemini', 'Google Gemini AI Engine', 'AI_MODEL', 'LLM reasoning and synthesis', appConfig.geminiModel, gemini, geminiConfigured),
    definition('prov-mongodb', 'MongoDB Atlas', 'DATABASE', 'Persistent application data', 'MongoDB configured database', mongo, true),
  ];
  return apiSuccess(providers);
}
