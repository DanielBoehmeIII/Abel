import type { ProviderName } from './types';
import { calculateCost as calcProviderCost } from './pricing';

export interface NormalizedProviderResponse {
  content: string;
  provider: ProviderName;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  latencyMs: number;
  toolCalls: number;
  imageCount: number;
  estimatedCostCents: number;
  raw: unknown;
}

export interface ProviderRequestConfig {
  provider: ProviderName;
  model: string;
  apiKey: string;
  baseUrl?: string;
  systemPrompt?: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  stream?: boolean;
}

export async function callProvider(config: ProviderRequestConfig): Promise<NormalizedProviderResponse> {
  const start = performance.now();
  let raw: unknown;
  let inputTokens = 0, outputTokens = 0, cacheReadTokens = 0, cacheWriteTokens = 0;
  let toolCalls = 0;
  const imageCount = 0;

  try {
    switch (config.provider) {
      case 'claude': {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: config.maxTokens ?? 1024,
            system: config.systemPrompt,
            messages: config.messages,
          }),
        });
        raw = await res.json();
        const d = raw as Record<string, unknown>;
        if (d.content && Array.isArray(d.content)) {
          toolCalls = d.content.filter(c => typeof c === 'object' && (c as Record<string, unknown>)?.type === 'tool_use').length;
        }
        const usage = d.usage as Record<string, number> | undefined;
        inputTokens = usage?.input_tokens ?? estimateTokens(config.systemPrompt ?? '') + estimateTokens(config.messages.map(m => m.content).join(''));
        outputTokens = usage?.output_tokens ?? estimateTokens(JSON.stringify(d.content));
        cacheReadTokens = usage?.cache_read_input_tokens ?? 0;
        cacheWriteTokens = usage?.cache_creation_input_tokens ?? 0;
        break;
      }
      case 'chatgpt': {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: config.maxTokens ?? 1024,
            messages: [
              ...(config.systemPrompt ? [{ role: 'system', content: config.systemPrompt }] : []),
              ...config.messages,
            ],
          }),
        });
        raw = await res.json();
        const d = raw as Record<string, unknown>;
        const usage = d.usage as Record<string, number> | undefined;
        inputTokens = usage?.prompt_tokens ?? estimateTokens(config.systemPrompt ?? '') + estimateTokens(config.messages.map(m => m.content).join(''));
        outputTokens = usage?.completion_tokens ?? estimateTokens(JSON.stringify(d.choices));
        const details = usage?.['completion_tokens_details'] as Record<string, number> | undefined;
        cacheReadTokens = details?.['cached_input_tokens'] ?? 0;
        cacheWriteTokens = 0;
        if (d.choices && Array.isArray(d.choices)) {
          for (const c of d.choices) {
            const msg = c.message;
            if (msg?.tool_calls) toolCalls += Array.isArray(msg.tool_calls) ? msg.tool_calls.length : 0;
          }
        }
        break;
      }
      case 'gemini': {
        const geminiBase = config.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta';
        const endpoint = geminiBase.replace(/\/+$/, '') + `/models/${config.model}:generateContent`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': config.apiKey,
          },
          body: JSON.stringify({
            contents: config.messages,
            systemInstruction: config.systemPrompt ? { parts: [{ text: config.systemPrompt }] } : undefined,
          }),
        });
        raw = await res.json();
        const d = raw as Record<string, unknown>;
        const usageMetadata = d.usageMetadata as Record<string, number> | undefined;
        inputTokens = usageMetadata?.promptTokenCount ?? estimateTokens(config.systemPrompt ?? '') + estimateTokens(config.messages.map(m => m.content).join(''));
        outputTokens = usageMetadata?.candidatesTokenCount ?? estimateTokens(JSON.stringify(d.candidates));
        cacheReadTokens = 0;
        cacheWriteTokens = 0;
        break;
      }
      default: {
        raw = { content: 'Provider not available' };
        inputTokens = 0; outputTokens = 0;
        cacheReadTokens = 0;
        cacheWriteTokens = 0;
      }
    }
  } catch {
    raw = { error: 'request failed' };
  }

  const latencyMs = Math.round(performance.now() - start);
  const estimatedCostCents = Math.round(
    calcProviderCost(config.model, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, imageCount, toolCalls) * 100
  );

  return {
    content: extractContent(raw, config.provider),
    provider: config.provider,
    model: config.model,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    latencyMs,
    toolCalls,
    imageCount,
    estimatedCostCents,
    raw,
  };
}

function extractContent(raw: unknown, provider: ProviderName): string {
  try {
    const d = raw as Record<string, unknown>;
    if (provider === 'claude') {
      const content = d.content;
      if (Array.isArray(content)) {
        return content
          .filter(c => (c as Record<string, unknown>)?.type === 'text')
          .map(c => (c as Record<string, unknown>)?.text ?? '')
          .join('');
      }
    }
    if (provider === 'chatgpt' || provider === 'gemini') {
      const choices = d.choices as Array<Record<string, unknown>> | undefined;
      const msg = choices?.[0]?.message as Record<string, unknown> | undefined;
      if (msg?.content) return String(msg.content);
      const candidates = d.candidates as Array<Record<string, unknown>> | undefined;
      const candContent = candidates?.[0]?.content as Record<string, unknown> | undefined;
      if (candContent?.parts) {
        const parts = candContent.parts as Array<Record<string, unknown>>;
        return parts.map(p => p.text ?? '').join('');
      }
    }
    const fallback = d.content;
    return fallback != null ? String(fallback) : JSON.stringify(raw);
  } catch {
    return String(raw);
  }
}

export function estimateTokens(text: string): number {
  return Math.ceil((text?.length ?? 0) / 3.5);
}

export function estimateCostForTokens(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  return calcProviderCost(model, inputTokens, outputTokens, 0, 0, 0, 0);
}
