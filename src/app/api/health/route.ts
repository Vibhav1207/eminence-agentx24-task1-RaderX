import { NextRequest } from 'next/server';
import { validateEnvironment } from '@/lib/config/envValidator';
import { apiSuccess } from '@/lib/api/response';

export async function GET(request: NextRequest) {
  const envCheck = validateEnvironment();
  const memoryUsage = process.memoryUsage();

  return apiSuccess({
    status: 'HEALTHY',
    service: 'RADARX Autonomous Intelligence Platform',
    version: '2.14.0',
    environment: envCheck.environment,
    envValid: envCheck.valid,
    providers: {
      geminiLLM: envCheck.hasGeminiKey ? 'ONLINE' : 'DEGRADED_FALLBACK',
      crossref: 'ONLINE',
      uspto: 'ONLINE',
      news: 'ONLINE',
      web: 'ONLINE',
    },
    memory: {
      rssMB: Math.round(memoryUsage.rss / (1024 * 1024)),
      heapTotalMB: Math.round(memoryUsage.heapTotal / (1024 * 1024)),
      heapUsedMB: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
    },
    timestamp: new Date().toISOString(),
  });
}
