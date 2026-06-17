import OpenAI from 'openai';
import { CoachingProvider } from './types';

export const openaiProvider: CoachingProvider = {
  async streamCoaching({ prompt, model, apiKey, onProgress }) {
    const client = new OpenAI({ apiKey });
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
