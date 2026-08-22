export type AppMode = 'production' | 'demo';

const rawMode = process.env.APP_MODE || process.env.NEXT_PUBLIC_APP_MODE || 'production';
const appMode: AppMode = rawMode.toLowerCase() === 'demo' ? 'demo' : 'production';

export const appConfig = {
  appMode,
  isProduction: appMode === 'production',
  isDemo: appMode === 'demo',
  crossrefMailto: process.env.CROSSREF_MAILTO || 'research@radarx.ai',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
};
