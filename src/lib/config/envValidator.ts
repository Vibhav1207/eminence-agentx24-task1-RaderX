export interface EnvValidationResult {
  valid: boolean;
  missingVars: string[];
  environment: string;
  hasGeminiKey: boolean;
  hasDatabaseUrl: boolean;
  timestamp: string;
}

export function validateEnvironment(): EnvValidationResult {
  const missingVars: string[] = [];

  const hasGeminiKey = !!process.env.GEMINI_API_KEY;
  if (!hasGeminiKey) {
    missingVars.push('GEMINI_API_KEY');
  }

  const hasDatabaseUrl = !!process.env.DATABASE_URL;

  return {
    valid: missingVars.length === 0,
    missingVars,
    environment: process.env.NODE_ENV || 'development',
    hasGeminiKey,
    hasDatabaseUrl,
    timestamp: new Date().toISOString(),
  };
}
