import { makeOpenAICompatibleProvider } from './openai';

// Moonshot Kimi speaks the OpenAI Chat Completions wire format at its own base URL.
export const kimiProvider = makeOpenAICompatibleProvider('https://api.moonshot.ai/v1');
