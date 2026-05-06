/**
 * ElevenLabs Conversational AI service
 *
 * Endpoint discovery notes (2026-05):
 *   Working signed URL endpoint: GET /v1/convai/conversation/get_signed_url?agent_id=<id>
 *   Agent IDs returned by the ElevenLabs API carry an "agent_" prefix that must be
 *   included in the query param (e.g. "agent_6701kqyv3ghrefgrggtf2n7b8t4z").
 *
 * Path A (per-session override via the signed URL request):
 *   NOT supported — the endpoint is GET-only; POST returns 405 Method Not Allowed.
 *
 * Per-session overrides (prompt + voice) are applied via the WebSocket
 * `conversation_initiation_client_data` message that the frontend SDK sends
 * immediately after opening the WebSocket connection.  This service therefore
 * returns the persona prompt and voice ID alongside the signed URL so the caller
 * (route handler or frontend) can include them in that initiation message.
 */

import crypto from 'crypto';
import { selectVoiceForSession } from './voice-selector';
import { getScenario, getDiscProfile } from '../prompts/loader';
import { buildPersonaPrompt } from '../prompts/persona-prompt';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConversationSession {
  /** Signed WebSocket URL — valid for one connection attempt. */
  signedUrl: string;
  /** The ElevenLabs agent ID (with "agent_" prefix). */
  agentId: string;
  /** ElevenLabs voice ID selected for this session. */
  voiceId: string;
  /** Human-readable voice name. */
  voiceName: string;
  /**
   * The persona system prompt to send in `conversation_initiation_client_data`.
   * Included here so the caller can pass it when opening the WebSocket.
   */
  personaPrompt: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
}

/**
 * Normalise the agent ID: ElevenLabs returns IDs with an "agent_" prefix from
 * the agents list API but the value stored in .env typically omits it.
 * Accept either form and always return the "agent_" prefixed version.
 */
function normaliseAgentId(rawId: string): string {
  return rawId.startsWith('agent_') ? rawId : `agent_${rawId}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Mint a signed WebSocket URL for a new ElevenLabs Conversational AI session,
 * and assemble all per-session configuration (persona prompt + voice) that
 * must be sent in the WebSocket `conversation_initiation_client_data` message.
 *
 * @param sessionId      - Internal session ID (used for logging / future use)
 * @param scenarioSlug   - Scenario slug (e.g. "01-schedule-delay")
 * @param clientDiscCode - DISC profile code (e.g. "S", "D/I")
 * @returns ConversationSession ready to hand to the frontend
 */
export async function getSignedUrlForSession(
  sessionId: number,
  scenarioSlug: string,
  clientDiscCode: string
): Promise<ConversationSession> {
  // 1. Select voice
  const { voiceId, voiceName } = selectVoiceForSession(scenarioSlug, clientDiscCode);

  // 2. Load content and build persona prompt
  const scenario = getScenario(scenarioSlug);
  if (!scenario) {
    throw new Error(`Scenario not found: ${scenarioSlug}`);
  }

  const clientDisc = getDiscProfile(clientDiscCode);
  if (!clientDisc) {
    throw new Error(`DISC profile not found: ${clientDiscCode}`);
  }

  const personaPrompt = buildPersonaPrompt(scenario, clientDisc);

  // 3. Call ElevenLabs to get the signed WebSocket URL
  //    Endpoint: GET /v1/convai/conversation/get_signed_url?agent_id=<id>
  //    Note: agent ID must carry the "agent_" prefix.
  const agentId = normaliseAgentId(getEnv('ELEVENLABS_AGENT_ID'));
  const apiKey = getEnv('ELEVENLABS_API_KEY');

  const url = new URL('https://api.elevenlabs.io/v1/convai/conversation/get_signed_url');
  url.searchParams.set('agent_id', agentId);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'xi-api-key': apiKey,
    },
  });

  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json() as { detail?: unknown };
      detail = JSON.stringify(body.detail ?? body);
    } catch {
      detail = await response.text();
    }
    throw new Error(
      `ElevenLabs signed URL request failed (${response.status}): ${detail}`
    );
  }

  const data = await response.json() as { signed_url?: string };

  if (!data.signed_url) {
    throw new Error(
      `ElevenLabs response missing signed_url: ${JSON.stringify(data)}`
    );
  }

  return {
    signedUrl: data.signed_url,
    agentId,
    voiceId,
    voiceName,
    personaPrompt,
  };
}

/**
 * Verify an ElevenLabs webhook signature.
 *
 * ElevenLabs signs webhook payloads using HMAC-SHA256.  The `ElevenLabs-Signature`
 * header has the format `t=<timestamp>,v1=<hex-hmac>`.
 * The signed payload is `"${timestamp}.${rawBody}"`.
 *
 * @param rawBody         - The raw (unparsed) request body as a string
 * @param signatureHeader - The value of the `ElevenLabs-Signature` header
 * @param secret          - The webhook secret configured for the agent
 * @returns true if the signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string
): boolean {
  if (!signatureHeader) return false;

  // Parse "t=<timestamp>,v1=<hmac>"
  const parts = Object.fromEntries(
    signatureHeader.split(',').map(part => {
      const eqIdx = part.indexOf('=');
      return eqIdx === -1
        ? [part, '']
        : [part.slice(0, eqIdx), part.slice(eqIdx + 1)];
    })
  );

  const timestamp = parts['t'];
  const providedSig = parts['v1'];

  if (!timestamp || !providedSig) return false;

  // Compute expected HMAC-SHA256(secret, "<timestamp>.<rawBody>")
  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSig, 'hex'),
      Buffer.from(providedSig, 'hex')
    );
  } catch {
    // Buffers of different lengths → invalid signature
    return false;
  }
}
