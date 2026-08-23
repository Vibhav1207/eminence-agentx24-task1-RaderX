export interface EnvValidationResult {
  valid: boolean;
  missingVars: string[];
  environment: string;
  hasGeminiKey: boolean;
  hasDatabaseUrl: boolean;
  mockDbEnabled: boolean;
  timestamp: string;
}

export function validateEnvironment(): EnvValidationResult {
  const missingVars: string[] = [];

  const hasGeminiKey = !!process.env.GEMINI_API_KEY;
  if (!hasGeminiKey) {
    missingVars.push('GEMINI_API_KEY');
  }

  const hasDatabaseUrl = !!process.env.SUPABASE_DATABASE_URL;
  const mockDbEnabled = process.env.USE_MOCK_DB === 'true';
  if (!hasDatabaseUrl) {
    missingVars.push('SUPABASE_DATABASE_URL');
  }
  if (process.env.APP_MODE !== 'demo' && mockDbEnabled) {
    missingVars.push('USE_MOCK_DB must be disabled in production');
  }

  return {
    valid: missingVars.length === 0,
    missingVars,
    environment: process.env.NODE_ENV || 'development',
    hasGeminiKey,
    hasDatabaseUrl,
    mockDbEnabled,
    timestamp: new Date().toISOString(),
  };
}
