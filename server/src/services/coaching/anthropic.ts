import Anthropic from '@anthropic-ai/sdk';
import { CoachingProvider } from './types';

export const anthropicProvider: CoachingProvider = {
  async streamCoaching({ prompt, model, apiKey, onProgress }) {
    const client = new Anthropic({ apiKey });
    const stream = client.messages.stream({
      model,
      max_tokens: 3072,
      messages: [{ role: 'user', content: prompt }],
    });
    let text = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        text += event.delta.text;
        onProgress({ charsReceived: text.length });
      }
    }
    await stream.finalMessage();
    return text;
  },
};
