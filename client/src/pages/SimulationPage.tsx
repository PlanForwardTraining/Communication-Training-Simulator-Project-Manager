import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ConversationProvider,
  useConversation,
} from '@elevenlabs/react';
import { sessionsApi, type Turn, type SessionEvent, type SessionStart } from '../api/sessions';
import { scenariosApi, type ScenarioBriefing } from '../api/scenarios';
import { coachingCardsApi, type CoachingCard } from '../api/coachingCards';
import { DiscBadge } from '../components/DiscBadge';
import { MarkdownLite } from '../utils/MarkdownLite';
import { stripAudioTags } from '../utils/stripAudioTags';

// ---------------------------------------------------------------------------
// CoachingProgress — shown after End Session while Claude generates the debrief.
// Asymptotic progress so the bar never "completes" before the real response;
// when the response arrives, the parent unmounts this component and navigates.
// ---------------------------------------------------------------------------

// Approximate target output size — typical coaching response is 4500-7000 chars.
// We use 6000 as the denominator; if Claude exceeds it, the bar caps at 95%
// until the actual stream completes (parent navigates away).
const EXPECTED_OUTPUT_CHARS = 6000;

function CoachingProgress({ charsReceived }: { charsReceived: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Real progress comes from streamed chars. Before any chars arrive (Claude is
  // still thinking / first token), use a small time-based crawl up to 5% so the
  // bar isn't frozen at 0. Once chars start flowing, real progress takes over.
  const initialCrawl = Math.min(5, elapsed * 0.5);
  const realProgress = (charsReceived / EXPECTED_OUTPUT_CHARS) * 100;
  const progress = Math.min(95, Math.max(initialCrawl, realProgress));

  // Stage label progresses with the actual stream: pre-output is "reading
  // the transcript" (Claude is still processing the prompt), then we walk
  // through the labels as chars come in.
  const stage =
    charsReceived === 0 ? 'Reading the transcript…' :
    realProgress < 25 ? 'Identifying Sandler techniques used…' :
    realProgress < 55 ? 'Scoring against the rubric…' :
    realProgress < 80 ? 'Writing your DISC adaptation notes…' :
    'Pulling together your coaching bullets…';

  const mins = Math.floor(elapsed / 60);
  const secs = (elapsed % 60).toString().padStart(2, '0');

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-md">
      <div className="flex items-center justify-between w-full">
        <span className="font-display font-semibold text-sm text-gold-400">{stage}</span>
        <span className="font-body text-xs text-slate-muted tabular-nums">
          {mins}:{secs}
        </span>
      </div>
      <div className="w-full h-1.5 bg-navy-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gold-500 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="font-body text-xs text-slate-muted text-center leading-relaxed">
        Streaming the coaching analysis from Claude in real time. Usually
        <span className="text-slate-text"> 1&#8211;2 minutes</span>.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Goodbye detection — used to auto-end the call when both sides have closed.
// Word-bounded matches on phrases people genuinely use to close phone calls.
// Includes the soft reciprocal closes ("you too", "all set") that come after
// the other party has already started wrapping up — those are how natural
// phone calls actually end in American English, not just literal "bye".
// ---------------------------------------------------------------------------

const CLOSING_REGEX = new RegExp(
  [
    // Direct goodbyes
    String.raw`\bgoodbye\b`,
    String.raw`\bbye\b`,

    // "Take care" family
    String.raw`\btake care\b`,
    String.raw`\btake it easy\b`,
    String.raw`\bbe well\b`,
    String.raw`\bcheers\b`,

    // "Have a [adjective] [day/etc]"
    String.raw`\bhave a (good|great|nice|wonderful|lovely|terrific|awesome|blessed|safe) (day|evening|night|weekend|one|rest of|holiday|trip)\b`,

    // Talk / speak / catch up
    String.raw`\btalk to you (soon|later|then|tomorrow|\w+day)\b`,
    String.raw`\btalk (soon|later)\b`,
    String.raw`\bspeak (soon|later)\b`,
    String.raw`\bspeak to you (soon|later|then|tomorrow|\w+day)\b`,
    String.raw`\bcatch you (later|on \w+|\w+day|tomorrow)\b`,
    String.raw`\bwe(?:'|')?ll (talk|speak|catch up) (then|soon|later|tomorrow|\w+day)\b`,

    // See you
    String.raw`\bsee you (soon|later|next time|then|tomorrow|\w+day|on \w+|around)\b`,

    // Until
    String.raw`\buntil next time\b`,
    String.raw`\buntil (then|soon|tomorrow|\w+day)\b`,

    // "I'll let you go" / "let me let you go"
    String.raw`\b(i(?:'|')?ll|i will|let me) let you (go|get back)\b`,

    // Thanks (unambiguous closing forms only)
    String.raw`\bthanks for your time\b`,
    String.raw`\bthank you for your time\b`,

    // Appreciate — only the unambiguous closing forms. Bare "appreciate it"
    // and "appreciate you" too often appear mid-sentence ("appreciate it, but…")
    String.raw`\bappreciate (your time|the call)\b`,

    // Reciprocal
    String.raw`\byou too\b`,

    // Acknowledgment closes
    String.raw`\ball set\b`,
    String.raw`\ball the best\b`,

    // Soft "sounds good + X" closings
    String.raw`\bsounds good[,.]? (bye|thanks|talk|that(?:'|')?ll work)\b`,
  ].join('|'),
  'i',
);

// Words/phrases that, when they follow a matched closing, signal the speaker
// is NOT actually closing the call (e.g. "thanks, but I have one more thing").
const STILL_TALKING_REGEX = /^[\s,.!?]*(but|however|though|except|wait|actually|hold on|one more|one quick|before (we|you|i)|though i|actually i)\b/i;

function containsClosing(text: string): boolean {
  const m = text.match(CLOSING_REGEX);
  if (!m) return false;

  const matchEnd = (m.index ?? 0) + m[0].length;
  const tail = text.slice(matchEnd).trim();

  // If the speaker keeps talking after the closing-ish phrase, they aren't
  // actually closing. "I appreciate the call, but I have one more question" →
  // ignore the match. Plain end-of-turn closings still pass through.
  if (STILL_TALKING_REGEX.test(text.slice(matchEnd))) return false;
  // A question after the closing phrase means the speaker is still asking.
  if (tail.includes('?')) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Notes panel — the PM's case-file + DISC coaching reference during the call.
// Tabs let the PM swap between the scenario brief (default) and the DISC
// coaching cues for the client they're speaking with.
// ---------------------------------------------------------------------------

type NotesTab = 'brief' | 'coaching';

function NotesContent({
  briefing,
  clientFirstName,
  coachingCard,
}: {
  briefing: ScenarioBriefing;
  clientFirstName: string;
  coachingCard: CoachingCard | null;
}) {
  const [tab, setTab] = useState<NotesTab>('brief');
  const tabBtn = (id: NotesTab, label: string) => (
    <button
      onClick={() => setTab(id)}
      className={`px-2.5 py-1.5 rounded-md text-xs font-display font-semibold uppercase tracking-widest transition-colors ${
        tab === id
          ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30'
          : 'text-slate-muted hover:text-slate-text border border-transparent'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="text-[13px] leading-relaxed">
      <div className="mb-4 pb-4 border-b border-navy-600">
        <p className="font-display font-semibold text-[10px] text-gold-500 uppercase tracking-widest mb-1">
          Call Notes
        </p>
        <h2 className="font-display font-bold text-base text-slate-text leading-tight">
          {briefing.title.replace(/^Scenario \d+:\s*/i, '')}
        </h2>
        <p className="font-body text-xs text-slate-muted mt-1">Speaking with {clientFirstName}</p>
      </div>
      {coachingCard && (
        <div className="flex gap-1 mb-4">
          {tabBtn('brief', 'Brief')}
          {tabBtn('coaching', 'Coaching cues')}
        </div>
      )}
      {tab === 'brief' || !coachingCard ? (
        <MarkdownLite source={briefing.body_briefing} />
      ) : (
        <MarkdownLite source={coachingCard.body} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

type ConvStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

function StatusIndicator({
  status,
  mode,
}: {
  status: ConvStatus;
  mode: 'speaking' | 'listening';
}) {
  if (status === 'disconnected') {
    return (
      <span className="flex items-center gap-2 text-slate-muted font-body text-sm">
        <span className="w-2 h-2 rounded-full bg-slate-muted inline-block" />
        Not connected
      </span>
    );
  }
  if (status === 'connecting') {
    return (
      <span className="flex items-center gap-2 text-gold-500 font-body text-sm animate-pulse">
        <span className="w-2 h-2 rounded-full bg-gold-500 inline-block" />
        Connecting…
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="flex items-center gap-2 text-red-400 font-body text-sm">
        <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
        Connection error
      </span>
    );
  }
  // connected
  if (mode === 'speaking') {
    return (
      <span className="flex items-center gap-2 text-blue-400 font-body text-sm">
        <span className="w-2 h-2 rounded-full bg-blue-400 inline-block animate-pulse" />
        Client is speaking…
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2 text-green-400 font-body text-sm">
      {/* Pulsing mic icon */}
      <svg
        className="w-4 h-4 animate-pulse"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"
        />
      </svg>
      Listening…
    </span>
  );
}

// ---------------------------------------------------------------------------
// Inner page — must be inside ConversationProvider
// ---------------------------------------------------------------------------

interface InnerPageProps {
  sessionData: SessionStart;
  briefing: ScenarioBriefing | null;
  coachingCard: CoachingCard | null;
  generalCues: CoachingCard | null;
  scenarioSlug: string;
  discCode: string;
}

function SimulationInner({ sessionData, briefing, coachingCard, generalCues, scenarioSlug, discCode }: InnerPageProps) {
  const navigate = useNavigate();

  const [turns, setTurns] = useState<Turn[]>([]);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [endingError, setEndingError] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [autoEndIn, setAutoEndIn] = useState<number | null>(null);
  const autoEndTriggeredRef = useRef(false);
  const [coachingChars, setCoachingChars] = useState(0);

  const transcriptRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever turns update
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [turns]);

  // Detect mutual goodbye and start the auto-end countdown.
  // Both sides must have said a closing in their MOST RECENT respective turn.
  // If the PM speaks again with a non-closing, the countdown clears — they're
  // not actually wrapping up. Conservative on purpose to avoid false ends.
  useEffect(() => {
    if (!sessionStarted || ending || autoEndTriggeredRef.current) return;
    if (turns.length < 4) return; // need a meaningful exchange first

    const lastPm = [...turns].reverse().find(t => t.speaker === 'pm');
    const lastClient = [...turns].reverse().find(t => t.speaker === 'client');
    const mutualGoodbye =
      !!lastPm && !!lastClient &&
      containsClosing(lastPm.content) &&
      containsClosing(lastClient.content);

    if (mutualGoodbye && autoEndIn === null) {
      setAutoEndIn(5);
    } else if (!mutualGoodbye && autoEndIn !== null) {
      // One side broke the closing pattern (e.g. PM kept talking) — cancel.
      setAutoEndIn(null);
    }
  }, [turns, sessionStarted, ending, autoEndIn]);

  const [connectError, setConnectError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const handleMessage = useCallback(
    (props: { message: string; source: 'user' | 'ai'; role?: 'user' | 'agent' }) => {
      console.log('[ElevenLabs] message:', props);
      const role = props.role ?? (props.source === 'ai' ? 'agent' : 'user');
      const speaker: Turn['speaker'] = role === 'user' ? 'pm' : 'client';
      setTurns((prev) => [...prev, { speaker, content: stripAudioTags(props.message) }]);
    },
    [],
  );

  const handleInterruption = useCallback(() => {
    setEvents((prev) => [...prev, { type: 'user_interrupted_agent' }]);
  }, []);

  const handleError = useCallback((err: unknown) => {
    console.error('[ElevenLabs] error:', err);
    const message =
      typeof err === 'string'
        ? err
        : err instanceof Error
        ? err.message
        : JSON.stringify(err);
    setConnectError(`Error: ${message}`);
  }, []);

  const handleStatusChange = useCallback((s: { status?: string } | string) => {
    const value = typeof s === 'string' ? s : s.status;
    console.log('[ElevenLabs] status:', value);
    setDebugInfo(`Status: ${value}`);
  }, []);

  const handleDisconnect = useCallback((details?: { reason?: string; message?: string }) => {
    console.log('[ElevenLabs] disconnect:', details);
    // 'user' = user clicked End Session (expected). 'agent' = AI ended (with end_call disabled, shouldn't happen).
    // Only show error for unexpected disconnects.
    if (details?.reason && details.reason !== 'user') {
      setConnectError(`Disconnected: ${details.reason}`);
    }
  }, []);

  const handleConnect = useCallback(() => {
    console.log('[ElevenLabs] connected!');
    setConnectError(null);
    setDebugInfo('Connected — start speaking');
  }, []);

  const handleDebug = useCallback((info: unknown) => {
    console.log('[ElevenLabs] debug:', info);
  }, []);

  const conversation = useConversation({
    onMessage: handleMessage,
    onInterruption: handleInterruption,
    onError: handleError,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onStatusChange: handleStatusChange,
    onDebug: handleDebug,
  });

  const { status, mode } = conversation;

  const handleStart = useCallback(async () => {
    setConnectError(null);
    setStarting(true);
    setDebugInfo('Requesting microphone access…');

    // Pre-warm microphone permission BEFORE opening the WebSocket. On mobile
    // (especially iOS Safari), the browser permission prompt blocks audio I/O,
    // so the AI's first message ("Hello, this is X") fires while the user is
    // still tapping "Allow" — and gets missed. Requesting first, then starting
    // the session, ensures the greeting plays after permission is granted.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // We don't need to keep the stream — the SDK will request its own. Stop
      // the tracks so we don't have two captures contending for the mic.
      stream.getTracks().forEach(t => t.stop());
    } catch (err) {
      console.error('[mic] permission denied or unavailable:', err);
      setConnectError('Microphone access is required to run a session. Please grant permission and try again.');
      setStarting(false);
      return;
    }

    setDebugInfo('Connecting…');
    setSessionStarted(true);
    setStarting(false);

    console.log('[ElevenLabs] startSession with', {
      signedUrl: sessionData.signedUrl.slice(0, 80) + '...',
      voiceId: sessionData.voiceId,
      promptLength: sessionData.personaPrompt.length,
    });

    try {
      conversation.startSession({
        signedUrl: sessionData.signedUrl,
        overrides: {
          agent: {
            prompt: { prompt: sessionData.personaPrompt },
            firstMessage: sessionData.firstMessage,
          },
          tts: {
            voiceId: sessionData.voiceId,
          },
        },
      });
    } catch (err) {
      console.error('[ElevenLabs] startSession threw:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setConnectError(`Start failed: ${msg}`);
      setSessionStarted(false);
    }
  }, [conversation, sessionData]);

  const doEndSession = useCallback(async () => {
    try {
      setCoachingChars(0);
      const result = await sessionsApi.end(
        sessionData.sessionId,
        turns,
        events,
        chars => setCoachingChars(chars),
      );
      navigate(`/sessions/${result.sessionId}/debrief`);
    } catch (err) {
      console.error('Save session failed:', err);
      const raw = err instanceof Error ? err.message : 'Failed to save session.';
      // Guard: never show a raw JSON blob to the user. If the message is very
      // long or looks like JSON, substitute a generic fallback.
      const looksLikeJson = raw.trimStart().startsWith('{') || raw.length > 300;
      setEndingError(
        looksLikeJson
          ? "Coaching couldn't be generated — please retry."
          : raw,
      );
      setEnding(false);
    }
  }, [sessionData.sessionId, turns, events, navigate]);

  const handleEndConfirmed = useCallback(async () => {
    setShowConfirm(false);
    setEnding(true);
    setEndingError(null);
    autoEndTriggeredRef.current = true;
    setAutoEndIn(null);

    try {
      conversation.endSession();
    } catch {
      // ignore SDK errors on disconnect
    }

    // If no turns happened (user never connected or didn't speak), just go home —
    // don't attempt to save a session with an empty transcript
    if (turns.length === 0) {
      navigate('/');
      return;
    }

    await doEndSession();
  }, [conversation, doEndSession, turns, navigate]);

  // Countdown tick + auto-trigger when it hits zero
  useEffect(() => {
    if (autoEndIn === null) return;
    if (autoEndIn <= 0) {
      autoEndTriggeredRef.current = true;
      handleEndConfirmed();
      return;
    }
    const t = setTimeout(() => setAutoEndIn(n => (n === null ? null : n - 1)), 1000);
    return () => clearTimeout(t);
  }, [autoEndIn, handleEndConfirmed]);

  const interruptionCount = events.filter(
    (e) => e.type === 'user_interrupted_agent' || e.type === 'agent_interrupted_user',
  ).length;

  // Human-readable scenario label from slug
  const scenarioLabel = scenarioSlug
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <div className="h-screen bg-navy-900 flex flex-col select-none overflow-hidden" style={{ height: '100dvh' }}>
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-navy-600 shrink-0">
        {/* DISC badge + client name — top left */}
        <div className="flex items-center gap-3 min-w-0">
          <DiscBadge code={discCode} />
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-body text-[10px] uppercase tracking-widest text-slate-muted">
              Speaking with
            </span>
            <span className="font-display font-semibold text-sm text-slate-text truncate">
              {sessionData.clientFirstName}
            </span>
          </div>
        </div>

        {/* Scenario name — top center */}
        <span className="font-display font-semibold text-sm text-slate-muted tracking-wide hidden sm:inline">
          {scenarioLabel}
        </span>

        {/* Status + interruption counter + notes toggle — top right */}
        <div className="flex items-center gap-3">
          <StatusIndicator status={status} mode={mode} />
          {interruptionCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 font-body text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
              {interruptionCount}
            </span>
          )}
          {/* Notes toggle — visible only on mobile (sidebar is always visible on lg+) */}
          {briefing && (
            <button
              onClick={() => setNotesOpen(o => !o)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-700 hover:bg-navy-600 border border-navy-600 text-slate-text font-body text-xs font-semibold transition-colors"
              aria-label="Toggle call notes"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Notes
            </button>
          )}
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Body — notes sidebar + transcript                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-1 overflow-hidden">
        {/* Notes sidebar — always visible on lg+, slides in from right on mobile */}
        {briefing && (
          <>
            {/* Desktop: persistent left panel */}
            <aside className="hidden lg:block w-80 xl:w-96 shrink-0 border-r border-navy-600 overflow-y-auto px-5 py-5 bg-navy-800/40">
              <NotesContent briefing={briefing} clientFirstName={sessionData.clientFirstName} coachingCard={coachingCard} />
            </aside>

            {/* Mobile: slide-in drawer overlaying the transcript */}
            {notesOpen && (
              <>
                <div
                  className="lg:hidden fixed inset-0 bg-navy-900/70 backdrop-blur-sm z-40"
                  onClick={() => setNotesOpen(false)}
                />
                <aside className="lg:hidden fixed top-0 right-0 bottom-0 w-[85vw] max-w-sm bg-navy-800 border-l border-navy-600 z-50 overflow-y-auto px-5 py-5 shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-display font-semibold text-xs text-gold-500 uppercase tracking-widest">
                      Call Notes
                    </span>
                    <button
                      onClick={() => setNotesOpen(false)}
                      className="text-slate-muted hover:text-slate-text"
                      aria-label="Close notes"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <NotesContent briefing={briefing} clientFirstName={sessionData.clientFirstName} coachingCard={coachingCard} />
                </aside>
              </>
            )}
          </>
        )}

      {/* ------------------------------------------------------------------ */}
      {/* Transcript                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div
        ref={transcriptRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-3 relative"
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* Auto-end banner — sticky at top of transcript when mutual goodbye detected */}
        {autoEndIn !== null && autoEndIn > 0 && (
          <div className="sticky top-0 z-10 -mx-4 -mt-6 mb-3 px-4 py-3 bg-gold-500/10 border-b border-gold-500/30 backdrop-blur flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-gold-500 animate-pulse" />
              <span className="font-body text-sm text-gold-400">
                <span className="font-semibold">Wrapping up</span> — ending in {autoEndIn}s
              </span>
            </div>
            <button
              onClick={() => setAutoEndIn(null)}
              className="font-body text-xs font-semibold text-slate-text px-3 py-1 rounded-md bg-navy-700 hover:bg-navy-600 border border-navy-600 whitespace-nowrap"
            >
              Keep going
            </button>
          </div>
        )}
        {turns.length === 0 && !sessionStarted && (
          <div className="max-w-2xl mx-auto mt-6 sm:mt-10 space-y-4">
            {/* Header card — who you're talking to + scenario */}
            <div className="card p-7 text-center border-l-4 border-l-gold-500">
              <p className="font-body text-[10px] uppercase tracking-widest text-gold-500 mb-2">
                Today's Call
              </p>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-slate-text mb-1">
                {sessionData.clientFirstName}
              </h2>
              <p className="font-body text-sm text-slate-muted mb-1">
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-semibold text-slate-text">{discCode}</span>
                  <span>·</span>
                  <span>{scenarioLabel}</span>
                </span>
              </p>
            </div>

            {/* DISC coaching card — primary coaching surface before the call */}
            {coachingCard && (
              <div className="card p-6 sm:p-7 border-l-4 border-l-gold-500/60 text-left">
                <p className="font-body text-[10px] uppercase tracking-widest text-gold-500 mb-3">
                  How to handle a {discCode} client
                </p>
                <MarkdownLite source={coachingCard.body} />
              </div>
            )}

            {/* Universal coaching cues — collapsed by default */}
            {generalCues && (
              <details className="card p-5 sm:p-6 text-left group">
                <summary className="cursor-pointer flex items-center justify-between font-display font-semibold text-sm text-slate-text list-none">
                  <span>Universal coaching cues</span>
                  <svg
                    className="w-4 h-4 text-slate-muted transition-transform group-open:rotate-180"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="mt-4 pt-4 border-t border-navy-700">
                  <MarkdownLite source={generalCues.body} />
                </div>
              </details>
            )}

            {/* Greeting cue */}
            <p className="font-body text-xs text-slate-muted text-center leading-relaxed px-4">
              When you press <span className="text-slate-text font-medium">Start Session</span>,
              the line will open. Take a breath and greet {sessionData.clientFirstName} the way
              you'd open a real call.
            </p>
          </div>
        )}

        {turns.length === 0 && sessionStarted && (
          <p className="text-center text-slate-muted font-body text-sm mt-12 opacity-60">
            Conversation will appear here…
          </p>
        )}

        {turns.map((turn, i) => (
          <div
            key={i}
            className={`flex ${turn.speaker === 'pm' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[72%] px-4 py-3 rounded-2xl font-body text-sm leading-relaxed shadow-card ${
                turn.speaker === 'pm'
                  ? 'bg-gold-500/15 border border-gold-500/25 text-gold-400 rounded-br-sm'
                  : 'bg-navy-700 border border-navy-600 text-slate-text rounded-bl-sm'
              }`}
            >
              <p className="mb-0.5 font-semibold text-xs opacity-60 uppercase tracking-widest">
                {turn.speaker === 'pm' ? 'You' : sessionData.clientFirstName}
              </p>
              {turn.content}
            </div>
          </div>
        ))}
      </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Bottom controls                                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="shrink-0 px-4 py-5 border-t border-navy-600 flex flex-col items-center gap-3">
        {debugInfo && !connectError && (
          <p className="text-slate-muted font-body text-xs">{debugInfo}</p>
        )}
        {connectError && (
          <p className="text-red-400 font-body text-sm text-center max-w-md">
            {connectError}
          </p>
        )}
        {endingError && (
          <div className="w-full max-w-sm rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 space-y-2">
            <p className="font-body text-sm text-red-300 leading-relaxed">{endingError}</p>
            <button
              onClick={() => {
                setEndingError(null);
                setEnding(true);
                doEndSession();
              }}
              className="font-body text-xs font-semibold text-red-300 hover:text-red-200 underline underline-offset-2 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!sessionStarted ? (
          <div className="flex gap-2 w-full max-w-sm">
            <button
              onClick={() => navigate(`/sessions/new/${scenarioSlug}`)}
              disabled={starting}
              className="btn-secondary"
            >
              Back
            </button>
            <button
              onClick={handleStart}
              disabled={!sessionData.signedUrl || starting}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {starting ? (
                <>
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Requesting microphone…
                </>
              ) : (
                'Start Session'
              )}
            </button>
          </div>
        ) : ending ? (
          <CoachingProgress charsReceived={coachingChars} />
        ) : (
          <div className="flex gap-2 w-full max-w-sm">
            <button
              onClick={() => navigate('/')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 font-body font-semibold px-6 py-3 rounded-xl transition-all duration-200 active:scale-95 focus:outline-none"
            >
              End Session
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Confirmation dialog                                                  */}
      {/* ------------------------------------------------------------------ */}
      {showConfirm && (
        <div className="fixed inset-0 bg-navy-900/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="card max-w-sm w-full p-6 space-y-4">
            <h2 className="font-display font-bold text-lg text-slate-text">End this session?</h2>
            <p className="font-body text-sm text-slate-muted leading-relaxed">
              The conversation will stop and your performance will be analysed. This cannot be
              undone.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowConfirm(false)}
                className="btn-secondary flex-1"
              >
                Keep going
              </button>
              <button
                onClick={handleEndConfirmed}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white font-body font-semibold px-6 py-3 rounded-xl transition-all duration-200 active:scale-95"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loader wrapper — fetches session data, then renders provider + inner page
// ---------------------------------------------------------------------------

export function SimulationPage() {
  const { scenarioSlug, discCode } = useParams<{
    scenarioSlug: string;
    discCode: string;
  }>();

  const navigate = useNavigate();

  const [sessionData, setSessionData] = useState<SessionStart | null>(null);
  const [briefing, setBriefing] = useState<ScenarioBriefing | null>(null);
  const [coachingCard, setCoachingCard] = useState<CoachingCard | null>(null);
  const [generalCues, setGeneralCues] = useState<CoachingCard | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const createdRef = useRef(false);

  const decodedDisc = discCode ? decodeURIComponent(discCode) : '';

  useEffect(() => {
    if (!scenarioSlug || !decodedDisc) return;
    // Guard against React StrictMode double-mount creating duplicate sessions
    if (createdRef.current) return;
    createdRef.current = true;

    sessionsApi
      .create(scenarioSlug, decodedDisc)
      .then(setSessionData)
      .catch(() => {
        createdRef.current = false; // allow retry on error
        setLoadError('Failed to start session. Please go back and try again.');
      });
  }, [scenarioSlug, decodedDisc]);

  useEffect(() => {
    if (!scenarioSlug) return;
    scenariosApi.getBriefing(scenarioSlug).then(setBriefing).catch(() => {
      // Non-fatal — the call still works without the side panel
    });
  }, [scenarioSlug]);

  useEffect(() => {
    if (!decodedDisc) return;
    coachingCardsApi.byDisc(decodedDisc).then(setCoachingCard).catch(() => {
      // Non-fatal — pre-call screen falls back to scenario brief only
    });
    coachingCardsApi.general().then(setGeneralCues).catch(() => {
      // Non-fatal
    });
  }, [decodedDisc]);

  if (loadError) {
    return (
      <div className="page items-center justify-center gap-4">
        <p className="text-red-400 font-body text-sm">{loadError}</p>
        <button onClick={() => navigate('/')} className="btn-secondary">
          Back to home
        </button>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="page items-center justify-center">
        <span className="text-slate-muted font-body text-sm animate-pulse">
          Preparing your session…
        </span>
      </div>
    );
  }

  return (
    <ConversationProvider>
      <SimulationInner
        sessionData={sessionData}
        briefing={briefing}
        coachingCard={coachingCard}
        generalCues={generalCues}
        scenarioSlug={scenarioSlug!}
        discCode={decodedDisc}
      />
    </ConversationProvider>
  );
}
