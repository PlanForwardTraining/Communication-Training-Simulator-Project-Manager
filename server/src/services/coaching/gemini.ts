import { GoogleGenAI } from '@google/genai';
import { CoachingProvider } from './types';

export const geminiProvider: CoachingProvider = {
  async streamCoaching({ prompt, model, apiKey, onProgress }) {
    const ai = new GoogleGenAI({ apiKey });
    const stream = await ai.models.generateContentStream({
      model,
      contents: prompt,
      config: { responseMimeType: 'application/json', maxOutputTokens: 3072 },
    });
    let text = '';
    for await (const chunk of stream) {
      const t = chunk.text;
      if (t) {
        text += t;
        onProgress({ charsReceived: text.length });
      }
    }
    return text;
  },
};
