import OpenAI from 'openai';
import { CoachingProvider } from './types';

/**
 * Builds a streaming coaching provider backed by an OpenAI-compatible Chat Completions API.
 * OpenAI itself uses the default base URL; xAI (Grok) and Moonshot (Kimi) expose the same
 * wire format at their own base URLs, so they reuse this exact code path.
 */
export function makeOpenAICompatibleProvider(baseURL?: string): CoachingProvider {
  return {
    async streamCoaching({ prompt, model, apiKey, onProgress }) {
      const client = new OpenAI(baseURL ? { apiKey, baseURL } : { apiKey });
      const stream = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 3072,
        stream: true,
      });
      let text = '';
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          text += delta;
          onProgress({ charsReceived: text.length });
        }
      }
      return text;
    },
  };
}

export const openaiProvider: CoachingProvider = makeOpenAICompatibleProvider();
