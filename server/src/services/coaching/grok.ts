import { makeOpenAICompatibleProvider } from './openai';

// xAI Grok speaks the OpenAI Chat Completions wire format at its own base URL.
export const grokProvider = makeOpenAICompatibleProvider('https://api.x.ai/v1');
