export type ProviderName = 'openai' | 'gemini' | 'anthropic' | 'grok' | 'kimi';
export type PickerProvider = ProviderName;

export interface StreamCoachingOpts {
  prompt: string;
  model: string;
  apiKey: string;
  onProgress: (info: { charsReceived: number }) => void;
}

export interface CoachingProvider {
  streamCoaching(opts: StreamCoachingOpts): Promise<string>;
}
