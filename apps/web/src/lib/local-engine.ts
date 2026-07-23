import { chooseAiAction, createGame, getAvailableActions, reduceGameState, serializePublicState } from '@monoverse/game-engine';
import type { PublicGameState } from '@monoverse/game-engine';
import type { ClientGameAction, PublicGameDelta, PublicRoomState } from './contracts';

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function randomSeed() {
  return Math.floor(Math.random() * 100_000_000);
}

function createRoomCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function rollDice(): [number, number] {
  const one = Math.floor(Math.random() * 6) + 1;
  const two = Math.floor(Math.random() * 6) + 1;
  return [one, two];
}

interface LocalPlayer {
  id: string;
  sessionId: string;
  name: string;
  token: string;
  ready: boolean;
  isConnected: boolean;
  isBot: boolean;
}

interface LocalRoom {
  code: string;
  createdAt: number;
  hostPlayerId: string;
  status: 'lobby' | 'in-game' | 'finished';
  players: LocalPlayer[];
  version: number;
  seed: number;
  gameState?: any;
  lastPublicState?: PublicGameState;
}

export class LocalSocketAdapter {
  private handlers = new Map<string, Array<(payload?: any) => void>>();
  private room: LocalRoom | null = null;
  private botTimer: number | null = null;

  constructor() {
    setTimeout(() => {
      this.trigger('connect');
    }, 50);
  }

  on(event: string, fn: (payload?: any) => void) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(fn);
  }

  off(event: string, fn?: (payload?: any) => void) {
    if (!fn) {
      this.handlers.delete(event);
      return;
    }
    const list = this.handlers.get(event);
    if (list) {
      this.handlers.set(event, list.filter((cb) => cb !== fn));
    }
  }

  private trigger(event: string, payload?: any) {
    const list = this.handlers.get(event);
    if (list) {
      list.forEach((fn) => fn(payload));
    }
  }

  emit(event: string, payload: any) {
    try {
      switch (event) {
        case 'room:create':
          this.handleCreateRoom(payload);
          break;
        case 'room:join':
          this.handleJoinRoom(payload);
          break;
        case 'session:resume':
          this.handleResumeSession(payload);
          break;
        case 'player:ready':
          this.handleSetReady(payload);
          break;
        case 'room:add-bot':
          this.handleAddBot(payload);
          break;
        case 'game:start':
          this.handleStartGame(payload);
          break;
        case 'game:action':
          this.handleGameAction(payload);
          break;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to complete action.';
      this.trigger('server:error', { message });
    }
  }

  disconnect() {
    if (this.botTimer) {
      window.clearTimeout(this.botTimer);
      this.botTimer = null;
    }
    this.trigger('disconnect');
  }

  private toPublicRoom(room: LocalRoom): PublicRoomState {
    const publicGame = room.gameState ? serializePublicState(room.gameState) : undefined;
    return {
      code: room.code,
      status: room.status,
      hostPlayerId: room.hostPlayerId,
      createdAt: room.createdAt,
      playerCount: room.players.length,
      version: room.version,
      players: room.players.map((player) => {
        const liveState = publicGame?.players.find((entry) => entry.id === player.id);
        return {
          id: player.id,
          name: player.name || 'Player',
          token: player.token || 'Pulse',
          ready: player.ready,
          isConnected: player.isConnected,
          isBot: player.isBot,
          cash: liveState?.cash,
          position: liveState?.position,
          bankrupt: liveState?.bankrupt
        };
      })
    };
  }

  private syncRoom(forceSnapshot = false) {
    if (!this.room) return;

    const publicRoom = this.toPublicRoom(this.room);
    this.trigger('room:update', publicRoom);

    const publicState = this.room.gameState ? serializePublicState(this.room.gameState) : undefined;
    if (!publicState) {
      this.room.lastPublicState = undefined;
      return;
    }

    const delta = this.buildDelta(this.room.lastPublicState, publicState);

    for (const player of this.room.players) {
      if (player.isBot) continue;
      const availableActions = getAvailableActions(this.room.gameState, player.id);

      if (forceSnapshot || !this.room.lastPublicState) {
        this.trigger('game:snapshot', { state: publicState, availableActions });
      } else {
        this.trigger('game:update', { delta, availableActions });
      }
    }

    this.room.lastPublicState = publicState;
  }

  private buildDelta(previous: PublicGameState | undefined, next: PublicGameState): PublicGameDelta {
    if (!previous) return next;
    const delta: PublicGameDelta = {};
    if (previous.phase !== next.phase) delta.phase = next.phase;
    if (previous.turn !== next.turn) delta.turn = next.turn;
    if (previous.currentPlayerId !== next.currentPlayerId) delta.currentPlayerId = next.currentPlayerId;
    if (previous.freeParkingPot !== next.freeParkingPot) delta.freeParkingPot = next.freeParkingPot;
    if (previous.winnerId !== next.winnerId) delta.winnerId = next.winnerId;
    if (JSON.stringify(previous.lastRoll) !== JSON.stringify(next.lastRoll)) delta.lastRoll = next.lastRoll;
    if (JSON.stringify(previous.pendingPurchase) !== JSON.stringify(next.pendingPurchase)) delta.pendingPurchase = next.pendingPurchase;
    if (previous.extraTurnPending !== next.extraTurnPending) delta.extraTurnPending = next.extraTurnPending;
    if (JSON.stringify(previous.players) !== JSON.stringify(next.players)) delta.players = next.players;
    if (JSON.stringify(previous.board.map((t) => t.ownerId)) !== JSON.stringify(next.board.map((t) => t.ownerId))) {
      delta.board = next.board;
    }
    if (JSON.stringify(previous.log) !== JSON.stringify(next.log)) delta.log = next.log;
    return delta;
  }

  private handleCreateRoom(payload: { name: string; token?: string }) {
    const code = createRoomCode();
    const player: LocalPlayer = {
      id: randomId('player'),
      sessionId: randomId('session'),
      name: payload.name?.trim() || 'Talha',
      token: payload.token?.trim() || 'Comet',
      ready: true,
      isConnected: true,
      isBot: false
    };

    this.room = {
      code,
      createdAt: Date.now(),
      hostPlayerId: player.id,
      status: 'lobby',
      players: [player],
      version: 1,
      seed: randomSeed()
    };

    this.trigger('session:accepted', {
      roomCode: code,
      playerId: player.id,
      sessionId: player.sessionId
    });

    this.syncRoom(true);
  }

  private handleJoinRoom(payload: { code: string; name: string; token?: string }) {
    if (!this.room || this.room.code !== payload.code.toUpperCase()) {
      throw new Error('Room not found in local session.');
    }
    const player: LocalPlayer = {
      id: randomId('player'),
      sessionId: randomId('session'),
      name: payload.name?.trim() || 'Player 2',
      token: payload.token?.trim() || 'Rover',
      ready: true,
      isConnected: true,
      isBot: false
    };
    this.room.players.push(player);
    this.room.version += 1;

    this.trigger('session:accepted', {
      roomCode: this.room.code,
      playerId: player.id,
      sessionId: player.sessionId
    });

    this.syncRoom(true);
  }

  private handleResumeSession(payload: { code: string; sessionId: string }) {
    if (!this.room || this.room.code !== payload.code.toUpperCase()) {
      this.handleCreateRoom({ name: 'Talha', token: 'Comet' });
      return;
    }
    const player = this.room.players.find((p) => p.sessionId === payload.sessionId);
    if (!player) {
      this.handleCreateRoom({ name: 'Talha', token: 'Comet' });
      return;
    }

    this.trigger('session:accepted', {
      roomCode: this.room.code,
      playerId: player.id,
      sessionId: player.sessionId
    });
    this.syncRoom(true);
  }

  private handleSetReady(payload: { sessionId: string; ready: boolean }) {
    if (!this.room) return;
    const player = this.room.players.find((p) => p.sessionId === payload.sessionId);
    if (player) {
      player.ready = payload.ready;
      this.room.version += 1;
      this.syncRoom();
    }
  }

  private handleAddBot(payload: { sessionId: string }) {
    if (!this.room) return;
    if (this.room.players.length >= 4) {
      throw new Error('Room is full (max 4 players).');
    }
    const botIdx = this.room.players.length;
    const bot: LocalPlayer = {
      id: randomId('player'),
      sessionId: randomId('session'),
      name: `AI Bot ${botIdx}`,
      token: `Bot-${botIdx}`,
      ready: true,
      isConnected: true,
      isBot: true
    };
    this.room.players.push(bot);
    this.room.version += 1;
    this.syncRoom();
  }

  private handleStartGame(payload: { sessionId: string }) {
    if (!this.room) return;
    if (this.room.players.length < 2) {
      throw new Error('At least two players are required.');
    }

    this.room.gameState = createGame(
      this.room.players.map((p) => ({
        id: p.id,
        name: p.name,
        token: p.token,
        isBot: p.isBot
      })),
      this.room.seed
    );
    this.room.status = 'in-game';
    this.room.version += 1;

    this.syncRoom(true);
    this.scheduleBotStep();
  }

  private handleGameAction(payload: { sessionId: string; action: ClientGameAction }) {
    if (!this.room || !this.room.gameState) return;

    const player = this.room.players.find((p) => p.sessionId === payload.sessionId);
    if (!player) return;

    const engineAction =
      payload.action === 'ROLL_DICE'
        ? { type: payload.action, actorId: player.id, dice: rollDice() }
        : { type: payload.action, actorId: player.id };

    this.room.gameState = reduceGameState(this.room.gameState, engineAction);
    this.room.version += 1;

    if (this.room.gameState.phase === 'game_over') {
      this.room.status = 'finished';
    }

    this.syncRoom();
    this.scheduleBotStep();
  }

  private scheduleBotStep() {
    if (!this.room || !this.room.gameState || this.room.gameState.phase === 'game_over') {
      return;
    }

    const publicState = serializePublicState(this.room.gameState);
    const currentPlayer = this.room.players.find((p) => p.id === publicState.currentPlayerId);

    if (!currentPlayer?.isBot) {
      return;
    }

    if (this.botTimer) {
      window.clearTimeout(this.botTimer);
    }

    this.botTimer = window.setTimeout(() => {
      if (!this.room || !this.room.gameState) return;

      const currentPublicState = serializePublicState(this.room.gameState);
      const currentBot = this.room.players.find((p) => p.id === currentPublicState.currentPlayerId);
      if (!currentBot?.isBot) return;

      const action = chooseAiAction(this.room.gameState, currentBot.id);

      if (!action) {
        this.room.gameState = reduceGameState(this.room.gameState, {
          type: 'ROLL_DICE',
          actorId: currentBot.id,
          dice: rollDice()
        });
      } else if (action.type === 'ROLL_DICE') {
        this.room.gameState = reduceGameState(this.room.gameState, {
          ...action,
          dice: rollDice()
        });
      } else {
        this.room.gameState = reduceGameState(this.room.gameState, action);
      }

      this.room.version += 1;
      if (this.room.gameState.phase === 'game_over') {
        this.room.status = 'finished';
      }

      this.syncRoom();
      this.scheduleBotStep();
    }, 600);
  }
}
