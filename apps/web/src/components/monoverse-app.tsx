'use client';

import type { PublicGameState } from '@monoverse/game-engine';
import { AccentButton, GhostButton, LabelValue, StatusPill, Surface } from '@monoverse/ui';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import type { PublicGameDelta } from '../lib/contracts';
import { useMonoVerseStore } from '../store/monoverse-store';
import { GameBoard } from './game-board';
import { PlayerRoster } from './player-roster';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4001';

export function MonoVerseApp() {
  const socketRef = useRef<Socket | null>(null);
  const rollStartedAtRef = useRef<number | null>(null);
  const rollSettleTimeoutRef = useRef<number | null>(null);
  const previousRollRef = useRef<string | undefined>(undefined);
  const [name, setName] = useState('Talha');
  const [token, setToken] = useState('Comet');
  const [joinCode, setJoinCode] = useState('');
  const [isRolling, setIsRolling] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

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
    setError
  } = useMonoVerseStore();

  useEffect(() => {
    const socket = io(SERVER_URL, {
      autoConnect: true,
      transports: ['websocket']
    });

    socketRef.current = socket;
    setConnection('connecting');

    socket.on('connect', () => {
      setConnection('online');
      setError(undefined);

      const storedSessionId = window.localStorage.getItem('monoverse.sessionId');
      const storedRoomCode = window.localStorage.getItem('monoverse.roomCode');

      if (storedSessionId && storedRoomCode) {
        socket.emit('session:resume', { code: storedRoomCode, sessionId: storedSessionId });
      }
    });

    socket.on('disconnect', () => {
      setConnection('offline');
      setIsBusy(false);
      setIsRolling(false);
    });

    socket.on('session:accepted', (payload: { sessionId: string; playerId: string; roomCode: string }) => {
      setSession(payload);
      setError(undefined);
      window.localStorage.setItem('monoverse.sessionId', payload.sessionId);
      window.localStorage.setItem('monoverse.roomCode', payload.roomCode);
    });

    socket.on('room:update', (nextRoom) => {
      setError(undefined);
      setRoom(nextRoom);
    });

    socket.on('game:snapshot', (payload: { state: PublicGameState; availableActions: string[] }) => {
      setError(undefined);
      setSnapshot(payload.state, payload.availableActions);
      setIsBusy(false);
    });

    socket.on('game:update', (payload: { delta: PublicGameDelta; availableActions: string[] }) => {
      setError(undefined);
      mergeDelta(payload.delta, payload.availableActions);
      setIsBusy(false);
    });

    socket.on('server:error', (payload: { message: string }) => {
      setError(payload.message);
      setIsBusy(false);
      setIsRolling(false);
      rollStartedAtRef.current = null;
    });

    return () => {
      if (rollSettleTimeoutRef.current) {
        window.clearTimeout(rollSettleTimeoutRef.current);
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [mergeDelta, setConnection, setError, setRoom, setSession, setSnapshot]);

  useEffect(() => {
    if (!game?.lastRoll) {
      return;
    }

    const nextRoll = game.lastRoll.join('-');
    if (previousRollRef.current === nextRoll) {
      return;
    }

    previousRollRef.current = nextRoll;

    if (!rollStartedAtRef.current) {
      return;
    }

    const elapsed = Date.now() - rollStartedAtRef.current;
    const remaining = Math.max(700 - elapsed, 0);

    if (rollSettleTimeoutRef.current) {
      window.clearTimeout(rollSettleTimeoutRef.current);
    }

    rollSettleTimeoutRef.current = window.setTimeout(() => {
      setIsRolling(false);
      setIsBusy(false);
      rollStartedAtRef.current = null;
    }, remaining);
  }, [game?.lastRoll]);

  const me = useMemo(
    () => room?.players.find((player) => player.id === playerId),
    [playerId, room?.players]
  );

  const currentPlayer = useMemo(
    () => room?.players.find((player) => player.id === game?.currentPlayerId),
    [game?.currentPlayerId, room?.players]
  );

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

  function emitAction(action: 'ROLL_DICE' | 'BUY_PROPERTY' | 'PAY_BAIL' | 'END_TURN') {
    if (!sessionId) {
      return;
    }

    if (action === 'ROLL_DICE') {
      setIsRolling(true);
      setIsBusy(true);
      rollStartedAtRef.current = Date.now();
    } else {
      setIsBusy(true);
      window.setTimeout(() => {
        setIsBusy(false);
      }, 220);
    }

    emit('game:action', { sessionId, action });
  }

  return (
    <main className="page-shell">
      <section className="lobby-shell">
        <motion.div
          className="hero-copy"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <StatusPill>{connection === 'online' ? 'Realtime connected' : connection}</StatusPill>
          <h1>MonoVerse delivers a clean, tactile multiplayer boardroom.</h1>
          <p>
            Create a room, line up the table, and play through a server-authoritative match with smoother motion, clearer turn states, and a quieter interface.
          </p>

          <div className="hero-metrics">
            <LabelValue label="Room" value={roomCode ?? 'Not joined'} />
            <LabelValue label="Players" value={room?.playerCount ?? 0} />
            <LabelValue label="Current turn" value={game?.turn ?? 0} />
          </div>
        </motion.div>

        <Surface className="control-panel lobby-card">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Lobby</span>
              <h2>Set the table</h2>
            </div>
            {roomCode ? <StatusPill>{roomCode}</StatusPill> : null}
          </div>

          <div className="field-grid">
            <label>
              <span>Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Player name" />
            </label>
            <label>
              <span>Token</span>
              <input value={token} onChange={(event) => setToken(event.target.value)} placeholder="Comet" />
            </label>
          </div>

          <div className="action-row">
            <AccentButton onClick={() => emit('room:create', { name, token })}>Create room</AccentButton>
            <GhostButton onClick={() => emit('room:add-bot', { sessionId })} disabled={!sessionId || room?.hostPlayerId !== playerId || room?.status !== 'lobby'}>
              Add AI
            </GhostButton>
          </div>

          <div className="join-row">
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="ROOM"
            />
            <AccentButton onClick={() => emit('room:join', { code: joinCode, name, token })}>Join</AccentButton>
          </div>

          {room ? (
            <>
              <div className="lobby-list-shell">
                <div className="section-label-row">
                  <span className="section-label">Players</span>
                  <span className="section-hint">
                    {room.players.filter((player) => player.ready).length}/{room.players.length} ready
                  </span>
                </div>
                <PlayerRoster room={room} currentPlayerId={game?.currentPlayerId} viewerId={playerId} compact />
              </div>

              <div className="lobby-actions">
                <GhostButton onClick={() => emit('player:ready', { sessionId, ready: !me?.ready })} disabled={!sessionId || room.status !== 'lobby'}>
                  {me?.ready ? 'Unready' : 'Ready up'}
                </GhostButton>
                <AccentButton onClick={() => emit('game:start', { sessionId })} disabled={!sessionId || !canStart}>
                  Start game
                </AccentButton>
              </div>
            </>
          ) : null}

          {error ? <p className="error-text">{error}</p> : null}
        </Surface>
      </section>

      <section className="experience-grid">
        <div className="experience-left">
          <GameBoard game={game} room={room} viewerId={playerId} isRolling={isRolling} />

          <Surface className="action-panel">
            <div className="panel-head">
              <div>
                <span className="eyebrow">Action Panel</span>
                <h2>Take your turn</h2>
              </div>
              <StatusPill>{currentPlayer?.name ?? 'Waiting'}</StatusPill>
            </div>

            <div className="section-label-row">
              <span className="section-label">Actions</span>
              <span className="section-hint">{isRolling ? 'Rolling…' : 'Authoritative turn controls'}</span>
            </div>

            <div className="action-stack">
              <AccentButton onClick={() => emitAction('ROLL_DICE')} disabled={!sessionId || !availableActions.includes('ROLL_DICE') || isRolling || isBusy}>
                {isRolling ? 'Rolling…' : 'Roll dice'}
              </AccentButton>
              <GhostButton onClick={() => emitAction('BUY_PROPERTY')} disabled={!sessionId || !availableActions.includes('BUY_PROPERTY') || isRolling || isBusy}>
                Buy property
              </GhostButton>
              <GhostButton onClick={() => emitAction('PAY_BAIL')} disabled={!sessionId || !availableActions.includes('PAY_BAIL') || isRolling || isBusy}>
                Pay bail
              </GhostButton>
              <GhostButton onClick={() => emitAction('END_TURN')} disabled={!sessionId || !availableActions.includes('END_TURN') || isRolling || isBusy}>
                End turn
              </GhostButton>
            </div>

            <div className="action-caption">
              <p>
                {game
                  ? 'Only valid turn actions are enabled, and dice rolling temporarily locks the panel.'
                  : 'Join a room to unlock the turn controls.'}
              </p>
            </div>
          </Surface>
        </div>

        <div className="experience-right">
          <Surface className="roster-panel">
            <div className="panel-head">
              <div>
                <span className="eyebrow">Player Rail</span>
                <h2>Table status</h2>
              </div>
              {room ? <StatusPill>{room.status}</StatusPill> : null}
            </div>
            <PlayerRoster room={room} currentPlayerId={game?.currentPlayerId} viewerId={playerId} />
          </Surface>

          <Surface className="feed-panel">
            <div className="panel-head">
              <div>
                <span className="eyebrow">Activity Feed</span>
                <h2>Match log</h2>
              </div>
            </div>
            <div className="section-label-row">
              <span className="section-label">Timeline</span>
              <span className="section-hint">{game?.log?.length ?? 0} events</span>
            </div>
            <div className="feed-list">
              {game?.log?.length ? (
                [...game.log].reverse().map((entry) => (
                  <div key={entry.id} className="feed-item">
                    <span>T{entry.turn}</span>
                    <p>{entry.text}</p>
                  </div>
                ))
              ) : (
                <div className="feed-empty">
                  <p>Create or join a room to start the event stream.</p>
                </div>
              )}
            </div>
          </Surface>
        </div>
      </section>
    </main>
  );
}
