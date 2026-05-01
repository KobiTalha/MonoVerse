'use client';

import type { PublicGameState } from '@monoverse/game-engine';
import { AccentButton, GhostButton, LabelValue, StatusPill, Surface } from '@monoverse/ui';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import type { PublicGameDelta } from '../lib/contracts';
import { GameBoard } from './game-board';
import { PlayerRoster } from './player-roster';
import { useMonoVerseStore } from '../store/monoverse-store';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4001';

export function MonoVerseApp() {
  const socketRef = useRef<Socket | null>(null);
  const [name, setName] = useState('Talha');
  const [token, setToken] = useState('Comet');
  const [joinCode, setJoinCode] = useState('');

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
    });

    socket.on('game:update', (payload: { delta: PublicGameDelta; availableActions: string[] }) => {
      setError(undefined);
      mergeDelta(payload.delta, payload.availableActions);
    });

    socket.on('server:error', (payload: { message: string }) => {
      setError(payload.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [mergeDelta, setConnection, setError, setRoom, setSession, setSnapshot]);

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

  return (
    <main className="page-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <section className="hero-grid">
        <motion.div
          className="hero-copy"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <StatusPill>{connection === 'online' ? 'Socket live' : connection}</StatusPill>
          <h1>MonoVerse turns Monopoly-style play into a premium realtime product.</h1>
          <p>
            Create a room, add friends or AI executives, and play on a server-authoritative city board with animated motion, reconnect support, and deterministic state.
          </p>

          <div className="hero-metrics">
            <LabelValue label="Room" value={roomCode ?? 'Not joined'} />
            <LabelValue label="Players" value={room?.playerCount ?? 0} />
            <LabelValue label="Current turn" value={game?.turn ?? 0} />
          </div>
        </motion.div>

        <Surface className="control-panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Lobby Control</span>
              <h2>Get a match running</h2>
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
            <div className="lobby-actions">
              <GhostButton onClick={() => emit('player:ready', { sessionId, ready: !me?.ready })} disabled={!sessionId || room.status !== 'lobby'}>
                {me?.ready ? 'Unready' : 'Ready up'}
              </GhostButton>
              <AccentButton onClick={() => emit('game:start', { sessionId })} disabled={!sessionId || !canStart}>
                Start match
              </AccentButton>
            </div>
          ) : null}

          {error ? <p className="error-text">{error}</p> : null}
        </Surface>
      </section>

      <section className="experience-grid">
        <div className="experience-left">
          <GameBoard game={game} room={room} viewerId={playerId} />
          <Surface className="action-panel">
            <div className="panel-head">
              <div>
                <span className="eyebrow">Turn Actions</span>
                <h2>Play the board</h2>
              </div>
              <StatusPill>{currentPlayer?.name ?? 'Waiting'}</StatusPill>
            </div>

            <div className="action-stack">
              <AccentButton onClick={() => emit('game:action', { sessionId, action: 'ROLL_DICE' })} disabled={!sessionId || !availableActions.includes('ROLL_DICE')}>
                Roll dice
              </AccentButton>
              <GhostButton onClick={() => emit('game:action', { sessionId, action: 'BUY_PROPERTY' })} disabled={!sessionId || !availableActions.includes('BUY_PROPERTY')}>
                Buy property
              </GhostButton>
              <GhostButton onClick={() => emit('game:action', { sessionId, action: 'PAY_BAIL' })} disabled={!sessionId || !availableActions.includes('PAY_BAIL')}>
                Pay bail
              </GhostButton>
              <GhostButton onClick={() => emit('game:action', { sessionId, action: 'END_TURN' })} disabled={!sessionId || !availableActions.includes('END_TURN')}>
                End turn
              </GhostButton>
            </div>

            <div className="action-caption">
              <p>Server-authoritative actions only become active when it is your turn.</p>
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
                <h2>Live events</h2>
              </div>
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
