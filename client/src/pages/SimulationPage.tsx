import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ConversationProvider,
  useConversation,
} from '@elevenlabs/react';
import { sessionsApi, type Turn, type SessionEvent, type SessionStart } from '../api/sessions';
import { DiscBadge } from '../components/DiscBadge';

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
  scenarioSlug: string;
  discCode: string;
}

function SimulationInner({ sessionData, scenarioSlug, discCode }: InnerPageProps) {
  const navigate = useNavigate();

  const [turns, setTurns] = useState<Turn[]>([]);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [ending, setEnding] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [endingError, setEndingError] = useState<string | null>(null);

  const transcriptRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever turns update
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [turns]);

  const [connectError, setConnectError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const handleMessage = useCallback(
    (props: { message: string; source: 'user' | 'ai'; role?: 'user' | 'agent' }) => {
      console.log('[ElevenLabs] message:', props);
      const role = props.role ?? (props.source === 'ai' ? 'agent' : 'user');
      const speaker: Turn['speaker'] = role === 'user' ? 'pm' : 'client';
      setTurns((prev) => [...prev, { speaker, content: props.message }]);
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

  const handleStart = useCallback(() => {
    setConnectError(null);
    setDebugInfo('Starting…');
    setSessionStarted(true);

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

  const handleEndConfirmed = useCallback(async () => {
    setShowConfirm(false);
    setEnding(true);
    setEndingError(null);

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

    try {
      const result = await sessionsApi.end(sessionData.sessionId, turns, events);
      navigate(`/sessions/${result.sessionId}/debrief`);
    } catch (err) {
      console.error('Save session failed:', err);
      setEndingError(
        err instanceof Error ? `Failed to save: ${err.message}` : 'Failed to save session.',
      );
      setEnding(false);
    }
  }, [conversation, sessionData.sessionId, turns, events, navigate]);

  const interruptionCount = events.filter(
    (e) => e.type === 'user_interrupted_agent' || e.type === 'agent_interrupted_user',
  ).length;

  // Human-readable scenario label from slug
  const scenarioLabel = scenarioSlug
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col select-none">
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

        {/* Status + interruption counter — top right */}
        <div className="flex items-center gap-3">
          <StatusIndicator status={status} mode={mode} />
          {interruptionCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 font-body text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
              {interruptionCount}
            </span>
          )}
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Transcript                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div
        ref={transcriptRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-3"
        style={{ scrollBehavior: 'smooth' }}
      >
        {turns.length === 0 && !sessionStarted && (
          <div className="max-w-md mx-auto mt-8 sm:mt-12 card p-7 text-center border-l-4 border-l-gold-500">
            <p className="font-body text-[10px] uppercase tracking-widest text-gold-500 mb-2">
              Today's Call
            </p>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-slate-text mb-1">
              {sessionData.clientFirstName}
            </h2>
            <p className="font-body text-sm text-slate-muted mb-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="font-semibold text-slate-text">{discCode}</span>
                <span>·</span>
                <span>{scenarioLabel}</span>
              </span>
            </p>
            <p className="font-body text-xs text-slate-muted leading-relaxed mb-5">
              When you press <span className="text-slate-text font-medium">Start Session</span>,
              the line will open. Greet {sessionData.clientFirstName} the way you'd open a real
              call.
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
          <p className="text-red-400 font-body text-sm">{endingError}</p>
        )}

        {!sessionStarted ? (
          <button
            onClick={handleStart}
            disabled={!sessionData.signedUrl}
            className="btn-primary w-full max-w-sm"
          >
            Start Session
          </button>
        ) : ending ? (
          <div className="flex flex-col items-center gap-2 w-full max-w-sm">
            <div className="flex items-center gap-2 text-gold-400 font-body text-sm">
              <span className="w-4 h-4 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
              Analyzing your conversation…
            </div>
            <p className="font-body text-xs text-slate-muted">
              Claude is reviewing the transcript. This usually takes 5-10 seconds.
            </p>
          </div>
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
        scenarioSlug={scenarioSlug!}
        discCode={decodedDisc}
      />
    </ConversationProvider>
  );
}
