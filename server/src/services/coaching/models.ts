import { PickerProvider } from './types';

export interface ProviderMeta {
  id: PickerProvider;
  /** Human-facing name shown in the admin picker. */
  label: string;
  /** Environment variable consulted as a key fallback when no in-app key is stored. */
  envKey: string;
  /** Curated, selectable models for this provider. First entry is the per-provider default. */
  models: string[];
}

/**
 * Single source of truth for coaching providers. Add a provider here and it flows
 * automatically to key resolution (settings.ts), the admin routes, and the picker UI.
 *
 * NOTE on model IDs: OpenAI/Gemini/Anthropic IDs are verified against their docs.
 */
export const PROVIDERS_META: Record<PickerProvider, ProviderMeta> = {
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    envKey: 'GEMINI_API_KEY',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash'],
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    models: ['gpt-4o', 'gpt-4.1'],
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    models: ['claude-opus-4-8', 'claude-sonnet-4-6'],
  },
};

/** Display order for the picker (default provider first). */
export const PROVIDER_ORDER: PickerProvider[] = ['gemini', 'openai', 'anthropic'];

export const DEFAULT_PROVIDER: PickerProvider = 'gemini';

export const DEFAULT_MODEL: Record<PickerProvider, string> = Object.fromEntries(
  PROVIDER_ORDER.map((p) => [p, PROVIDERS_META[p].models[0]]),
) as Record<PickerProvider, string>;

/** Backward-compatible map of provider → models (used by older callers/tests). */
export const CURATED_MODELS: Record<PickerProvider, string[]> = Object.fromEntries(
  PROVIDER_ORDER.map((p) => [p, PROVIDERS_META[p].models]),
) as Record<PickerProvider, string[]>;

export function isPickerProvider(p: string): p is PickerProvider {
  return Object.prototype.hasOwnProperty.call(PROVIDERS_META, p);
}

export function isCuratedModel(provider: string, model: string): boolean {
  return isPickerProvider(provider) && PROVIDERS_META[provider].models.includes(model);
}
