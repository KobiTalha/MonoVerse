'use client';

import type { PublicGameState } from '@monoverse/game-engine';
import { create } from 'zustand';

import type { PublicGameDelta, PublicRoomState } from '../lib/contracts';

type ConnectionState = 'offline' | 'connecting' | 'online';

interface MonoVerseStore {
  connection: ConnectionState;
  room?: PublicRoomState;
  game?: PublicGameState;
  sessionId?: string;
  playerId?: string;
  roomCode?: string;
  availableActions: string[];
  error?: string;
  setConnection: (connection: ConnectionState) => void;
  setRoom: (room?: PublicRoomState) => void;
  setSession: (payload: { sessionId: string; playerId: string; roomCode: string }) => void;
  setSnapshot: (game: PublicGameState, availableActions: string[]) => void;
  mergeDelta: (delta: PublicGameDelta, availableActions: string[]) => void;
  setError: (error?: string) => void;
  reset: () => void;
}

const initialState = {
  connection: 'offline' as ConnectionState,
  room: undefined,
  game: undefined,
  sessionId: undefined,
  playerId: undefined,
  roomCode: undefined,
  availableActions: [] as string[],
  error: undefined
};

export const useMonoVerseStore = create<MonoVerseStore>((set) => ({
  ...initialState,
  setConnection: (connection) => set({ connection }),
  setRoom: (room) => set({ room }),
  setSession: ({ sessionId, playerId, roomCode }) => set({ sessionId, playerId, roomCode }),
  setSnapshot: (game, availableActions) => set({ game, availableActions }),
  mergeDelta: (delta, availableActions) =>
    set((state) => ({
      availableActions,
      game: state.game
        ? {
            ...state.game,
            ...delta,
            players: delta.players ?? state.game.players,
            board: delta.board ?? state.game.board,
            log: delta.log ?? state.game.log
          }
        : undefined
    })),
  setError: (error) => set({ error }),
  reset: () => set({ ...initialState })
}));
