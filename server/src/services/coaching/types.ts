export type ProviderName = 'openai' | 'gemini' | 'anthropic';
export type PickerProvider = 'openai' | 'gemini';

export interface StreamCoachingOpts {
  prompt: string;
  model: string;
  apiKey: string;
  onProgress: (info: { charsReceived: number }) => void;
}

export interface CoachingProvider {
  streamCoaching(opts: StreamCoachingOpts): Promise<string>;
}
