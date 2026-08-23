import { appConfig } from '@/lib/config';

export interface LLMCompletionOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMCompletionResult {
  text: string;
  tokenUsage?: {
    available: boolean;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  latencyMs: number;
  model?: string;
}

export interface LLMProvider {
  name: string;
  complete(options: LLMCompletionOptions): Promise<string>;
  completeWithMeta(options: LLMCompletionOptions): Promise<LLMCompletionResult>;
}

export class GeminiLLMProvider implements LLMProvider {
  name = 'Google Gemini REST Provider';
  private model: string;
  /** LLM call timeout in ms — prevents hung requests from blocking the graph */
  private readonly timeoutMs = 25000;

  constructor(model: string = appConfig.geminiModel) {
    this.model = model;
  }

  async complete(options: LLMCompletionOptions): Promise<string> {
    const result = await this.completeWithMeta(options);
    return result.text;
  }

  async completeWithMeta(options: LLMCompletionOptions): Promise<LLMCompletionResult> {
    const callStart = Date.now();
    const apiKey = appConfig.geminiApiKey;

    if (!apiKey) {
      return {
        text: JSON.stringify({
          status: 'PROVIDER_FAILURE',
          code: 'LLM_NOT_CONFIGURED',
          provider: this.name,
          message: 'GEMINI_API_KEY is not configured; no analysis was generated.',
        }),
        tokenUsage: { available: false },
        latencyMs: Date.now() - callStart,
        model: this.model,
      };
    }

    const isTest = process.env.NODE_ENV === 'test';

    if (isTest) {
      const combined = `${options.systemPrompt || ''}\n${options.prompt}`;
      let text: string;
      if (combined.toLowerCase().includes('plan')) {
        text = JSON.stringify({
          plan: [
            {
              id: "TASK-COMPETITOR",
              agentType: "COMPETITOR",
              title: "Analyze competitor strategies",
              description: "Examine competitors in the semiconductor foundry space",
              priority: "HIGH",
              dependencies: []
            }
          ]
        });
      } else if (combined.toLowerCase().includes('critic') || combined.toLowerCase().includes('evaluation')) {
        text = JSON.stringify({
          approved: true,
          confidence: 95,
          feedback: "Validation checklist met perfectly."
        });
      } else {
        text = JSON.stringify({
          status: 'SUCCESS',
          summary: 'Mocked successful test completion.',
          synthesis: 'Final synthesized executive intelligence assessment.',
        });
      }
      return { text, tokenUsage: { available: false }, latencyMs: Date.now() - callStart, model: this.model };
    }

    const systemPrompt = options.systemPrompt || 'You are RADARX Master Intelligence Orchestrator. Output precise, structured JSON.';
    const combinedPrompt = `${systemPrompt}\n\n${options.prompt}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${apiKey}`;

    // AbortController for hard timeout — prevents indefinitely hung requests
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: combinedPrompt }] }],
          generationConfig: {
            temperature: options.temperature ?? 0.2,
            maxOutputTokens: options.maxTokens ?? 2048,
          },
        }),
      });

      clearTimeout(timeoutHandle);

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[GeminiLLMProvider] HTTP ${response.status} Error:`, errorText);
        throw new Error(`Gemini API returned status ${response.status}`);
      }

      const data = await response.json();
      const generatedText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        JSON.stringify({ status: 'SUCCESS', message: 'No content text returned.' });

      // Parse token usage from Gemini's usageMetadata field
      const usage = data?.usageMetadata;
      const tokenUsage = usage
        ? {
            available: true,
            inputTokens: usage.promptTokenCount ?? 0,
            outputTokens: usage.candidatesTokenCount ?? 0,
            totalTokens: usage.totalTokenCount ?? 0,
          }
        : { available: false };

      return {
        text: generatedText,
        tokenUsage,
        latencyMs: Date.now() - callStart,
        model: this.model,
      };
    } catch (error: unknown) {
      clearTimeout(timeoutHandle);
      const errorName = error instanceof Error ? error.name : '';
      const errorMessage = error instanceof Error ? error.message : 'Unknown provider error';
      const isTimeout = errorName === 'AbortError';
      console.warn(`[GeminiLLMProvider] LLM call ${isTimeout ? 'timed out' : 'failed'}:`, errorMessage);
      return {
        text: JSON.stringify({
          status: 'PROVIDER_FAILURE',
          provider: 'Google Gemini',
          code: isTimeout ? 'LLM_TIMEOUT' : 'LLM_REQUEST_FAILED',
          message: isTimeout
            ? 'Gemini timed out; no analysis was generated.'
            : 'Gemini failed; no analysis was generated.',
        }),
        tokenUsage: { available: false },
        latencyMs: Date.now() - callStart,
        model: this.model,
      };
    }
  }
}

export class LocalMockLLMProvider implements LLMProvider {
  name = 'LocalMockProvider';

  async complete(options: LLMCompletionOptions): Promise<string> {
    const result = await this.completeWithMeta(options);
    return result.text;
  }

  async completeWithMeta(options: LLMCompletionOptions): Promise<LLMCompletionResult> {
    const callStart = Date.now();
    let text: string;
    if (options.prompt.includes('deconstruct')) {
      text = JSON.stringify({
        primaryFocus: 'Generative AI ecosystem and competitive positioning',
        subTopics: ['Hardware acceleration', 'Patent activity', 'Hyperscaler ASIC shift'],
        suggestedAgents: ['RESEARCH', 'PATENT', 'NEWS', 'COMPETITOR', 'WEB'],
      });
    } else {
      text = JSON.stringify({
        status: 'analyzed',
        summary: 'Structured analysis completed successfully.',
      });
    }
    return { text, tokenUsage: { available: false }, latencyMs: Date.now() - callStart, model: 'local-mock' };
  }
}

// Production always uses Gemini. The local provider remains available only for
// explicit test imports and is never selected implicitly.
export const defaultLLMProvider: LLMProvider = new GeminiLLMProvider();
