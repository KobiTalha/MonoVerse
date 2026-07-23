'use client';

import type { PublicGameState } from '@monoverse/game-engine';
import { AccentButton, GhostButton } from '@monoverse/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import type { PublicGameDelta } from '../lib/contracts';
import { LocalSocketAdapter } from '../lib/local-engine';
import { useSound } from '../lib/use-sound';
import { useMonoVerseStore } from '../store/monoverse-store';
import { ActionDock } from './action-dock';
import { Confetti } from './confetti';
import { GameBoard } from './game-board';
import { LandingHero } from './landing-hero';
import { PlayerRoster } from './player-roster';
import { PropertyDeed } from './property-deed';

const BUILD_SERVER_URL = (process.env.NEXT_PUBLIC_SERVER_URL ?? '').trim();

type EngineMode = 'server' | 'local';

function isVercelHost(): boolean {
  if (typeof window === 'undefined') return false;
  return /\.vercel\.app$/i.test(window.location.hostname);
}

function resolveServerUrl(): { url: string; useSameOrigin: boolean } {
  if (BUILD_SERVER_URL && BUILD_SERVER_URL !== 'same-origin') {
    return { url: BUILD_SERVER_URL, useSameOrigin: false };
  }
  return { url: '', useSameOrigin: true };
}

function describeBackend(): string {
  const { url, useSameOrigin } = resolveServerUrl();
  if (typeof window === 'undefined') return useSameOrigin ? 'same-origin' : url;
  if (useSameOrigin) return `${window.location.origin} (same origin)`;
  return url;
}

export function MonoVerseApp() {
  const socketRef = useRef<any>(null);
  const rollStartedAtRef = useRef<number | null>(null);
  const rollSettleTimeoutRef = useRef<number | null>(null);
  const settleResetTimeoutRef = useRef<number | null>(null);
  const previousRollRef = useRef<string | undefined>(undefined);
  const previousTurnPlayerRef = useRef<string | undefined>(undefined);
  const previousWinnerRef = useRef<string | undefined>(undefined);
  const previousJailedRef = useRef<Record<string, boolean>>({});

  const [mode, setMode] = useState<EngineMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('monoverse.engine_mode');
      if (saved === 'server' || saved === 'local') return saved;
    }
    return BUILD_SERVER_URL ? 'server' : 'local';
  });

  const [theme, setTheme] = useState<'cosmic' | 'richup'>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('monoverse.theme');
      if (saved === 'cosmic' || saved === 'richup') return saved;
    }
    return 'cosmic';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'cosmic' ? 'richup' : 'cosmic';
      window.localStorage.setItem('monoverse.theme', next);
      return next;
    });
  }, []);

  const [name, setName] = useState('Talha');

  const [token, setToken] = useState('Comet');
  const [joinCode, setJoinCode] = useState('');
  const [isRolling, setIsRolling] = useState(false);
  const [justSettled, setJustSettled] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [selectedTileId, setSelectedTileId] = useState<string | undefined>();
  const [connectionStuck, setConnectionStuck] = useState(false);

  const playSound = useSound(soundOn);

  const {
    connection,
    room,
    game,
    sessionId,
    playerId,
    roomCode,
    availableActions,
    error,
    setConnection,
    setRoom,
    setSession,
    setSnapshot,
    mergeDelta,
    setError,
    reset
  } = useMonoVerseStore();

  useEffect(() => {
    let active = true;

    if (mode === 'local') {
      const adapter = new LocalSocketAdapter();
      socketRef.current = adapter;
      setConnection('local');
      setError(undefined);

      adapter.on('connect', () => {
        if (!active) return;
        setConnection('local');
        setError(undefined);
        const storedSessionId = window.localStorage.getItem('monoverse.sessionId');
        const storedRoomCode = window.localStorage.getItem('monoverse.roomCode');
        if (storedSessionId && storedRoomCode) {
          adapter.emit('session:resume', { code: storedRoomCode, sessionId: storedSessionId });
        }
      });

      adapter.on('session:accepted', (payload: { sessionId: string; playerId: string; roomCode: string }) => {
        if (!active) return;
        setSession(payload);
        setError(undefined);
        window.localStorage.setItem('monoverse.sessionId', payload.sessionId);
        window.localStorage.setItem('monoverse.roomCode', payload.roomCode);
      });

      adapter.on('room:update', (nextRoom) => {
        if (!active) return;
        setError(undefined);
        setRoom(nextRoom);
      });

      adapter.on('game:snapshot', (payload: { state: PublicGameState; availableActions: string[] }) => {
        if (!active) return;
        setError(undefined);
        setSnapshot(payload.state, payload.availableActions);
        setIsBusy(false);
      });

      adapter.on('game:update', (payload: { delta: PublicGameDelta; availableActions: string[] }) => {
        if (!active) return;
        setError(undefined);
        mergeDelta(payload.delta, payload.availableActions);
        setIsBusy(false);
      });

      adapter.on('server:error', (payload: { message: string }) => {
        if (!active) return;
        setError(payload.message);
        setIsBusy(false);
        setIsRolling(false);
      });

      return () => {
        active = false;
        adapter.disconnect();
        socketRef.current = null;
      };
    } else {
      setConnection('connecting');
      setError(undefined);

      const { url, useSameOrigin } = resolveServerUrl();
      const opts = {
        autoConnect: true,
        transports: ['websocket', 'polling'],
        withCredentials: false,
        timeout: 3000
      };
      const socket: Socket = useSameOrigin ? io(opts) : io(url, opts);
      socketRef.current = socket;

      socket.on('connect', () => {
        if (!active) return;
        setConnection('online');
        setError(undefined);

        const storedSessionId = window.localStorage.getItem('monoverse.sessionId');
        const storedRoomCode = window.localStorage.getItem('monoverse.roomCode');
        if (storedSessionId && storedRoomCode) {
          socket.emit('session:resume', { code: storedRoomCode, sessionId: storedSessionId });
        }
      });

      socket.on('connect_error', () => {
        if (!active) return;
        setConnection('offline');
        setIsBusy(false);
        setIsRolling(false);
      });

      socket.on('disconnect', () => {
        if (!active) return;
        setConnection('offline');
        setIsBusy(false);
        setIsRolling(false);
      });

      socket.on('session:accepted', (payload: { sessionId: string; playerId: string; roomCode: string }) => {
        if (!active) return;
        setSession(payload);
        setError(undefined);
        window.localStorage.setItem('monoverse.sessionId', payload.sessionId);
        window.localStorage.setItem('monoverse.roomCode', payload.roomCode);
      });

      socket.on('room:update', (nextRoom) => {
        if (!active) return;
        setError(undefined);
        setRoom(nextRoom);
      });

      socket.on('game:snapshot', (payload: { state: PublicGameState; availableActions: string[] }) => {
        if (!active) return;
        setError(undefined);
        setSnapshot(payload.state, payload.availableActions);
        setIsBusy(false);
      });

      socket.on('game:update', (payload: { delta: PublicGameDelta; availableActions: string[] }) => {
        if (!active) return;
        setError(undefined);
        mergeDelta(payload.delta, payload.availableActions);
        setIsBusy(false);
      });

      socket.on('server:error', (payload: { message: string }) => {
        if (!active) return;
        setError(payload.message);
        setIsBusy(false);
        setIsRolling(false);
        rollStartedAtRef.current = null;
      });

      return () => {
        active = false;
        if (rollSettleTimeoutRef.current) {
          window.clearTimeout(rollSettleTimeoutRef.current);
        }
        if (settleResetTimeoutRef.current) {
          window.clearTimeout(settleResetTimeoutRef.current);
        }
        socket.disconnect();
        socketRef.current = null;
      };
    }
  }, [mode, mergeDelta, setConnection, setError, setRoom, setSession, setSnapshot]);

  useEffect(() => {
    if (connection === 'online' || connection === 'local') {
      setConnectionStuck(false);
      return;
    }
    const id = window.setTimeout(() => setConnectionStuck(true), 3000);
    return () => window.clearTimeout(id);
  }, [connection]);

  useEffect(() => {
    if (!game?.lastRoll) return;
    const nextRoll = game.lastRoll.join('-');
    if (previousRollRef.current === nextRoll) return;
    previousRollRef.current = nextRoll;
    if (!rollStartedAtRef.current) return;

    const elapsed = Date.now() - rollStartedAtRef.current;
    const remaining = Math.max(700 - elapsed, 0);

    if (rollSettleTimeoutRef.current) {
      window.clearTimeout(rollSettleTimeoutRef.current);
    }

    rollSettleTimeoutRef.current = window.setTimeout(() => {
      setIsRolling(false);
      setIsBusy(false);
      rollStartedAtRef.current = null;
      setJustSettled(true);
      if (settleResetTimeoutRef.current) {
        window.clearTimeout(settleResetTimeoutRef.current);
      }
      settleResetTimeoutRef.current = window.setTimeout(() => setJustSettled(false), 700);
    }, remaining);
  }, [game?.lastRoll]);

  useEffect(() => {
    if (!game?.currentPlayerId) {
      previousTurnPlayerRef.current = undefined;
      return;
    }
    if (previousTurnPlayerRef.current && previousTurnPlayerRef.current !== game.currentPlayerId) {
      playSound('turn');
    }
    previousTurnPlayerRef.current = game.currentPlayerId;
  }, [game?.currentPlayerId, playSound]);

  useEffect(() => {
    if (game?.winnerId && previousWinnerRef.current !== game.winnerId) {
      previousWinnerRef.current = game.winnerId;
      playSound('win');
    }
  }, [game?.winnerId, playSound]);

  useEffect(() => {
    if (!game?.players) return;
    const next: Record<string, boolean> = {};
    for (const player of game.players) {
      const previously = previousJailedRef.current[player.id] ?? false;
      next[player.id] = player.inJail;
      if (player.inJail && !previously) {
        playSound('jail');
      }
    }
    previousJailedRef.current = next;
  }, [game?.players, playSound]);

  const me = useMemo(
    () => room?.players.find((player) => player.id === playerId),
    [playerId, room?.players]
  );

  const currentPlayer = useMemo(
    () => room?.players.find((player) => player.id === game?.currentPlayerId),
    [game?.currentPlayerId, room?.players]
  );

  const isMyTurn = Boolean(playerId && game?.currentPlayerId === playerId);

  const canStart = Boolean(
    room &&
      room.hostPlayerId === playerId &&
      room.status === 'lobby' &&
      room.players.length >= 2 &&
      room.players.filter((player) => !player.isBot).every((player) => player.ready)
  );

  function emit(event: string, payload: Record<string, unknown>) {
    socketRef.current?.emit(event, payload);
  }

  function toggleEngineMode() {
    const next = mode === 'local' ? 'server' : 'local';
    window.localStorage.setItem('monoverse.engine_mode', next);
    reset();
    setMode(next);
  }

  function startInstantLocalGame() {
    window.localStorage.setItem('monoverse.engine_mode', 'local');
    reset();
    setMode('local');
    setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.emit('room:create', { name, token });
        setTimeout(() => {
          const currentStore = useMonoVerseStore.getState();
          if (currentStore.sessionId) {
            socketRef.current.emit('room:add-bot', { sessionId: currentStore.sessionId });
            setTimeout(() => {
              const updatedStore = useMonoVerseStore.getState();
              if (updatedStore.sessionId) {
                socketRef.current.emit('game:start', { sessionId: updatedStore.sessionId });
              }
            }, 100);
          }
        }, 100);
      }
    }, 150);
  }

  const emitAction = useCallback(
    (action: 'ROLL_DICE' | 'BUY_PROPERTY' | 'PAY_BAIL' | 'END_TURN') => {
      if (!sessionId) return;
      if (action === 'ROLL_DICE') {
        setIsRolling(true);
        setIsBusy(true);
        setJustSettled(false);
        rollStartedAtRef.current = Date.now();
        playSound('dice');
      } else {
        setIsBusy(true);
        window.setTimeout(() => setIsBusy(false), 220);
        if (action === 'BUY_PROPERTY') {
          playSound('purchase');
        }
      }
      emit('game:action', { sessionId, action });
    },
    [playSound, sessionId]
  );

  const handleLeaveRoom = useCallback(() => {
    window.localStorage.removeItem('monoverse.sessionId');
    window.localStorage.removeItem('monoverse.roomCode');
    socketRef.current?.disconnect();
    reset();
    window.location.reload();
  }, [reset]);

  const onStepFromBoard = useCallback(() => {
    playSound('step');
  }, [playSound]);

  const onLandFromBoard = useCallback(() => {
    /* visuals only */
  }, []);

  const turnStatus = useMemo(() => {
    if (!game) {
      return { tone: 'idle' as const, label: 'Connect to begin' };
    }
    if (game.winnerId) {
      const winner = room?.players.find((player) => player.id === game.winnerId)?.name ?? 'A player';
      return { tone: 'win' as const, label: `${winner} wins MonoVerse` };
    }
    if (isMyTurn) {
      return { tone: 'mine' as const, label: 'Your turn — roll the dice' };
    }
    return {
      tone: 'theirs' as const,
      label: currentPlayer ? `Waiting for ${currentPlayer.name}…` : 'Waiting for players…'
    };
  }, [currentPlayer, game, isMyTurn, room?.players]);

  const selectedTile = useMemo(
    () => game?.board.find((tile) => tile.id === selectedTileId),
    [game?.board, selectedTileId]
  );

  return (
    <main className="page-shell">
      <div className="page-backdrop" aria-hidden>
        <div className="page-backdrop-grid" />
        <div className="page-backdrop-glow page-backdrop-glow-blue" />
        <div className="page-backdrop-glow page-backdrop-glow-violet" />
      </div>

      <Confetti active={Boolean(game?.winnerId)} />

      <LandingHero
        connection={connection}
        soundOn={soundOn}
        mode={mode}
        theme={theme}
        onToggleSound={() => setSoundOn((value) => !value)}
        onToggleMode={toggleEngineMode}
        onToggleTheme={toggleTheme}
      />

      {(connectionStuck || connection === 'offline') && mode === 'server' ? (
        <motion.aside
          className="connection-help"
          role="alert"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="connection-help-head">
            <span className="connection-help-pill">Backend unreachable</span>
            <h3>
              {isVercelHost()
                ? 'Vercel hosts the UI but cannot run the realtime backend'
                : 'Realtime backend is not responding'}
            </h3>
          </div>
          <p>
            The browser is trying to reach <code>{describeBackend()}</code> for live game state.
            {isVercelHost()
              ? ' Vercel only runs Next.js (serverless / edge), so it cannot keep a Socket.io connection open.'
              : ' The Socket.io server may be offline.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
            <AccentButton onClick={startInstantLocalGame}>
              ▶ Play Instant Game Now (In-Browser)
            </AccentButton>
            <GhostButton onClick={toggleEngineMode}>
              Switch to In-Browser Engine
            </GhostButton>
          </div>
        </motion.aside>
      ) : null}

      {!room ? (
        <section className="lobby-launchpad">
          <motion.div
            className="lobby-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="lobby-card-head">
              <span className="eyebrow">Lobby</span>
              <h2>Set the table</h2>
              <p>Create a private room, jump into a friend&apos;s code, or play instantly in your browser.</p>
            </div>

            <div className="field-grid">
              <label>
                <span>Display name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Player name"
                />
              </label>
              <label>
                <span>Token</span>
                <input
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="Comet"
                />
              </label>
            </div>

            <div className="action-row">
              <AccentButton onClick={() => emit('room:create', { name, token })}>
                Create new room
              </AccentButton>
              <GhostButton onClick={startInstantLocalGame}>
                🎮 Instant Game vs AI
              </GhostButton>
            </div>

            <div className="lobby-divider">
              <span>or join existing</span>
            </div>

            <div className="join-row">
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="ROOM"
                maxLength={6}
              />
              <AccentButton onClick={() => emit('room:join', { code: joinCode, name, token })}>
                Join room
              </AccentButton>
            </div>

            {error ? <p className="error-text">{error}</p> : null}
          </motion.div>
        </section>
      ) : (
        <section className="play-shell">
          <aside className="play-rail play-rail-left">
            <div className="rail-card">
              <div className="rail-card-head">
                <span className="eyebrow">Room</span>
                <h3>{roomCode}</h3>
                <span className="rail-card-sub">{room.status}</span>
              </div>

              <PlayerRoster
                room={room}
                game={game}
                currentPlayerId={game?.currentPlayerId}
                viewerId={playerId}
              />

              {room.status === 'lobby' ? (
                <div className="rail-card-actions">
                  <GhostButton
                    onClick={() => emit('player:ready', { sessionId, ready: !me?.ready })}
                    disabled={!sessionId}
                  >
                    {me?.ready ? 'Unready' : 'Ready up'}
                  </GhostButton>
                  <GhostButton
                    onClick={() => emit('room:add-bot', { sessionId })}
                    disabled={!sessionId || room.hostPlayerId !== playerId}
                  >
                    Add AI
                  </GhostButton>
                  <AccentButton
                    onClick={() => emit('game:start', { sessionId })}
                    disabled={!sessionId || !canStart}
                  >
                    Start game
                  </AccentButton>
                </div>
              ) : null}

              <button type="button" className="leave-link" onClick={handleLeaveRoom}>
                Leave room
              </button>
              {error ? <p className="error-text">{error}</p> : null}
            </div>
          </aside>

          <div className="play-stage">
            <AnimatePresence>
              {game ? (
                <motion.div
                  key={turnStatus.tone}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className={`stage-banner stage-banner-${turnStatus.tone}`}
                >
                  <span className="stage-banner-dot" />
                  <strong>{turnStatus.label}</strong>
                  {game.lastRoll ? (
                    <span className="stage-banner-roll">
                      Last roll {game.lastRoll[0]} + {game.lastRoll[1]}
                    </span>
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <GameBoard
              game={game}
              room={room}
              viewerId={playerId}
              isRolling={isRolling}
              justSettled={justSettled}
              onSelectTile={(tileId) => setSelectedTileId(tileId)}
              selectedTileId={selectedTileId}
              onStep={onStepFromBoard}
              onLand={onLandFromBoard}
              freeParkingPot={game?.freeParkingPot}
              turnStatus={turnStatus}
            />

            <ActionDock
              game={game}
              isMyTurn={isMyTurn}
              isRolling={isRolling}
              isBusy={isBusy}
              availableActions={availableActions}
              onAction={emitAction}
              pendingTileName={
                game?.pendingPurchase?.tileId
                  ? game.board.find((tile) => tile.id === game.pendingPurchase?.tileId)?.name
                  : undefined
              }
            />
          </div>

          <aside className="play-rail play-rail-right">
            <div className="rail-card rail-card-deed">
              <span className="eyebrow">Property deed</span>
              <PropertyDeed
                tile={selectedTile}
                game={game}
                room={room}
                onClose={() => setSelectedTileId(undefined)}
              />
            </div>

            <div className="rail-card rail-card-feed">
              <div className="rail-card-head rail-card-head-row">
                <div>
                  <span className="eyebrow">Activity feed</span>
                  <h3>Match log</h3>
                </div>
                <span className="rail-card-sub">{game?.log?.length ?? 0} events</span>
              </div>
              <div className="feed-list">
                {game?.log?.length ? (
                  [...game.log].reverse().map((entry) => (
                    <div key={entry.id} className="feed-item">
                      <span className="feed-item-turn">T{entry.turn}</span>
                      <p>{entry.text}</p>
                    </div>
                  ))
                ) : (
                  <div className="feed-empty">
                    <p>The match log will appear here as the game unfolds.</p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </section>
      )}
    </main>
  );
}
