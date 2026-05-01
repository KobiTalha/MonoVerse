import type { GameState, PublicGameState } from '@monoverse/game-engine';

export type ClientGameAction = 'ROLL_DICE' | 'BUY_PROPERTY' | 'END_TURN' | 'PAY_BAIL';

export interface RoomPlayer {
  id: string;
  sessionId: string;
  name: string;
  token: string;
  ready: boolean;
  isConnected: boolean;
  isBot: boolean;
  socketId?: string;
}

export interface PublicRoomPlayer {
  id: string;
  name: string;
  token: string;
  ready: boolean;
  isConnected: boolean;
  isBot: boolean;
  cash?: number;
  position?: number;
  bankrupt?: boolean;
}

export interface PublicRoomState {
  code: string;
  status: 'lobby' | 'in-game' | 'finished';
  hostPlayerId: string;
  createdAt: number;
  playerCount: number;
  players: PublicRoomPlayer[];
  version: number;
}

export interface PublicGameDelta {
  phase?: PublicGameState['phase'];
  turn?: number;
  currentPlayerId?: string;
  players?: PublicGameState['players'];
  board?: PublicGameState['board'];
  freeParkingPot?: number;
  winnerId?: string;
  lastRoll?: [number, number];
  pendingPurchase?: PublicGameState['pendingPurchase'];
  extraTurnPending?: boolean;
  log?: PublicGameState['log'];
}

export interface ServerRoom {
  code: string;
  createdAt: number;
  hostPlayerId: string;
  status: 'lobby' | 'in-game' | 'finished';
  players: RoomPlayer[];
  gameState?: GameState;
  version: number;
  seed: number;
  lastPublicState?: PublicGameState;
}
