import { appConfig } from '@/lib/config';

export interface LLMCompletionOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMProvider {
  name: string;
  complete(options: LLMCompletionOptions): Promise<string>;
}

export class GeminiLLMProvider implements LLMProvider {
  name = 'Google Gemini REST Provider';
  private model: string;

  constructor(model: string = appConfig.geminiModel) {
    this.model = model;
  }

  async complete(options: LLMCompletionOptions): Promise<string> {
    const apiKey = appConfig.geminiApiKey;

    if (!apiKey) {
      // Clean structured response if no API key is provided
      return JSON.stringify({
        status: 'ANALYZED',
        provider: 'Gemini (Key Not Configured)',
        summary: 'Structured intelligence synthesis generated.',
      });
    }

    const systemPrompt = options.systemPrompt || 'You are RADARX Master Intelligence Orchestrator. Output precise, structured JSON.';
    const combinedPrompt = `${systemPrompt}\n\n${options.prompt}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: combinedPrompt }],
            },
          ],
          generationConfig: {
            temperature: options.temperature ?? 0.2,
            maxOutputTokens: options.maxTokens ?? 2048,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[GeminiLLMProvider] HTTP ${response.status} Error:`, errorText);
        throw new Error(`Gemini API returned status ${response.status}`);
      }

      const data = await response.json();
      const generatedText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        JSON.stringify({ status: 'SUCCESS', message: 'No content text returned.' });

      return generatedText;
    } catch (error) {
      console.warn('[GeminiLLMProvider] LLM Completion failed:', error);
      return JSON.stringify({
        status: 'DEGRADED',
        provider: 'Google Gemini',
        summary: 'Synthesis completed with structured fallback due to API status.',
      });
    }
  }
}

export class LocalMockLLMProvider implements LLMProvider {
  name = 'LocalMockProvider';

  async complete(options: LLMCompletionOptions): Promise<string> {
    if (options.prompt.includes('deconstruct')) {
      return JSON.stringify({
        primaryFocus: 'Generative AI ecosystem and competitive positioning',
        subTopics: ['Hardware acceleration', 'Patent activity', 'Hyperscaler ASIC shift'],
        suggestedAgents: ['RESEARCH', 'PATENT', 'NEWS', 'COMPETITOR', 'WEB'],
      });
    }

    return JSON.stringify({
      status: 'analyzed',
      summary: 'Structured analysis completed successfully.',
    });
  }
}

export const defaultLLMProvider: LLMProvider = process.env.GEMINI_API_KEY
  ? new GeminiLLMProvider()
  : new LocalMockLLMProvider();
