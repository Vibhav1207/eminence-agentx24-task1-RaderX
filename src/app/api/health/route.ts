import { apiSuccess } from '@/lib/api/response';
import { getDb } from '@/lib/mongodb';
import { appConfig } from '@/lib/config';
import { validateEnvironment } from '@/lib/config/envValidator';

type DependencyStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED';

async function checkHttp(url: string, headers?: HeadersInit) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    return { status: response.ok ? 'ONLINE' as DependencyStatus : 'DEGRADED' as DependencyStatus, latencyMs: Date.now() - startedAt, error: response.ok ? undefined : `HTTP ${response.status}` };
  } catch (error) {
    return { status: 'OFFLINE' as DependencyStatus, latencyMs: Date.now() - startedAt, error: error instanceof Error ? error.message : 'Request failed' };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkMongo() {
  const startedAt = Date.now();
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return { status: 'ONLINE' as DependencyStatus, latencyMs: Date.now() - startedAt };
  } catch (error) {
    return { status: 'OFFLINE' as DependencyStatus, latencyMs: Date.now() - startedAt, error: error instanceof Error ? error.message : 'Database unavailable' };
  }
}

export async function GET() {
  const [crossref, patent, news, web, mongo] = await Promise.all([
    checkHttp('https://api.crossref.org/works?rows=1'),
    checkHttp('https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=SRC:PAT&format=json&pageSize=1'),
    checkHttp('https://en.wikinews.org/w/api.php?action=query&list=search&srsearch=test&format=json'),
    checkHttp('https://api.github.com/zen', { 'User-Agent': 'RadarX-HealthCheck' }),
    checkMongo(),
  ]);
  const gemini = appConfig.geminiApiKey
    ? await checkHttp(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(appConfig.geminiApiKey)}`)
    : { status: 'OFFLINE' as DependencyStatus, latencyMs: 0, error: 'GEMINI_API_KEY is not configured' };
  const providers = { crossref, patent, news, web, gemini, mongo };
  const env = validateEnvironment();
  const status = env.valid && Object.values(providers).every((check) => check.status === 'ONLINE') ? 'HEALTHY' : 'DEGRADED';
  const memoryUsage = process.memoryUsage();
  return apiSuccess({
    status,
    service: 'RADARX Autonomous Intelligence Platform',
    version: '2.14.0',
    environment: process.env.NODE_ENV || 'unknown',
    appMode: appConfig.appMode,
    envValid: env.valid,
    missingEnvironment: env.missingVars,
    providers,
    memory: { rssMB: Math.round(memoryUsage.rss / (1024 * 1024)), heapTotalMB: Math.round(memoryUsage.heapTotal / (1024 * 1024)), heapUsedMB: Math.round(memoryUsage.heapUsed / (1024 * 1024)) },
    timestamp: new Date().toISOString(),
  });
}
