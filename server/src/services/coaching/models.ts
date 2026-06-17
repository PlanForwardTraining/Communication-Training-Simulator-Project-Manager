import { PickerProvider } from './types';

export const CURATED_MODELS: Record<PickerProvider, string[]> = {
  openai: ['gpt-4o', 'gpt-4.1'],
  gemini: ['gemini-2.5-pro', 'gemini-2.5-flash'],
};

export const DEFAULT_PROVIDER: PickerProvider = 'gemini';

export const DEFAULT_MODEL: Record<PickerProvider, string> = {
  openai: 'gpt-4o',
  gemini: 'gemini-2.5-pro',
};

export function isPickerProvider(p: string): p is PickerProvider {
  return p === 'openai' || p === 'gemini';
}

export function isCuratedModel(provider: string, model: string): boolean {
  return isPickerProvider(provider) && CURATED_MODELS[provider].includes(model);
}
