/**
 * Removes inline "audio tags" / stage directions the in-call model sometimes emits,
 * e.g. "[serious] I need the bottom line [cold] tell me where we stand" →
 *      "I need the bottom line tell me where we stand".
 *
 * These are meant as delivery cues but, on a voice model that doesn't interpret them,
 * get spoken aloud and leak into the transcript + coaching. The persona prompt now
 * forbids them at the source; this is the safety net so a stray one never reaches the
 * PM-facing transcript or the coaching engine.
 *
 * Only short bracketed tokens are stripped (≤40 chars, no newline) so genuine bracketed
 * content in a long utterance is left alone.
 */
export function stripAudioTags(text: string): string {
  return text
    .replace(/\[[^\]\n]{1,40}\]/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .trim();
}
