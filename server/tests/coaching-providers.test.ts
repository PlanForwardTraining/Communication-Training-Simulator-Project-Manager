jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue(
          (async function* () {
            yield { choices: [{ delta: { content: '{"a":' } }] };
            yield { choices: [{ delta: { content: '1}' } }] };
          })(),
        ),
      },
    },
  }));
});

import { openaiProvider } from '../src/services/coaching/openai';

describe('openai provider', () => {
  it('accumulates streamed text and reports progress', async () => {
    const progress: number[] = [];
    const text = await openaiProvider.streamCoaching({
      prompt: 'p',
      model: 'gpt-4o',
      apiKey: 'k',
      onProgress: ({ charsReceived }) => progress.push(charsReceived),
    });
    expect(text).toBe('{"a":1}');
    expect(progress).toEqual([5, 7]);
  });
});
