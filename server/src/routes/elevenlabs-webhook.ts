import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { verifyWebhookSignature } from '../services/elevenlabs-cai';

const router = Router();

// ElevenLabs sends raw body — we need it as string for signature verification
// index.ts must register this route BEFORE express.json() or use express.raw() for this route

router.post('/', (req: Request, res: Response): void => {
  const rawBody = req.body as string;
  const signature = req.headers['elevenlabs-signature'] as string | undefined;
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;

  // If no secret configured, accept all (dev mode without webhooks set up)
  if (secret) {
    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const type = event.type as string;
  const conversationId = event.conversation_id as string | undefined;

  // Find the session by elevenlabs_conversation_id
  const findSession = (convId: string) =>
    db.prepare('SELECT id FROM sessions WHERE elevenlabs_conversation_id = ?')
      .get(convId) as { id: number } | undefined;

  if (type === 'conversation_started' && conversationId) {
    // Match agent_id to the session — for now use most recent open session
    // (In production, the frontend should pass sessionId as a custom param)
    const openSession = db.prepare(
      'SELECT id FROM sessions WHERE elevenlabs_conversation_id IS NULL ORDER BY started_at DESC LIMIT 1'
    ).get() as { id: number } | undefined;

    if (openSession) {
      db.prepare('UPDATE sessions SET elevenlabs_conversation_id = ? WHERE id = ?')
        .run(conversationId, openSession.id);
    }
  } else if (type === 'turn' && conversationId) {
    const session = findSession(conversationId);
    if (session) {
      const role = event.role as string;
      const message = event.message as string;
      const speaker = role === 'user' ? 'pm' : 'client';
      db.prepare('INSERT INTO turns (session_id, speaker, content) VALUES (?, ?, ?)')
        .run(session.id, speaker, message);
    }
  } else if (type === 'interruption' && conversationId) {
    const session = findSession(conversationId);
    if (session) {
      const role = event.role as string;
      const eventType = role === 'user' ? 'user_interrupted_agent' : 'agent_interrupted_user';
      db.prepare('INSERT INTO events (session_id, type, speaker) VALUES (?, ?, ?)')
        .run(session.id, eventType, role === 'user' ? 'pm' : 'client');
    }
  }
  // conversation_ended: no action needed (PM clicking End is the source of truth)

  res.json({ received: true });
});

export default router;
