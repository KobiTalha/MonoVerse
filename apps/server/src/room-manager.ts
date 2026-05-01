import { chooseAiAction, createGame, getAvailableActions, reduceGameState, serializePublicState } from '@monoverse/game-engine';
import type { PublicGameState } from '@monoverse/game-engine';

import { serverConfig } from './config';
import type { ClientGameAction, PublicGameDelta, PublicRoomState, RoomPlayer, ServerRoom } from './types';

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function randomSeed() {
  return Math.floor(Math.random() * 100_000_000);
}

function createRoomCode(existing: Set<string>) {
  let code = '';
  do {
    code = Math.random().toString(36).slice(2, 6).toUpperCase();
  } while (existing.has(code));
  return code;
}

function rollDice() {
  const one = Math.floor(Math.random() * 6) + 1;
  const two = Math.floor(Math.random() * 6) + 1;
  return [one, two] as [number, number];
}

function sanitizeName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Display name is required.');
  }
  return trimmed.slice(0, 20);
}

function sanitizeToken(value?: string) {
  return value?.trim().slice(0, 16) || 'Pulse';
}

export class RoomManager {
  private rooms = new Map<string, ServerRoom>();
  private sessionIndex = new Map<string, { roomCode: string; playerId: string }>();
  private socketIndex = new Map<string, { roomCode: string; sessionId: string }>();

  createRoom(name: string, token: string | undefined, socketId: string) {
    const code = createRoomCode(new Set(this.rooms.keys()));
    const player = this.makePlayer(name, token, socketId, false);
    const room: ServerRoom = {
      code,
      createdAt: Date.now(),
      hostPlayerId: player.id,
      status: 'lobby',
      players: [player],
      version: 1,
      seed: randomSeed()
    };

    this.rooms.set(code, room);
    this.sessionIndex.set(player.sessionId, { roomCode: code, playerId: player.id });
    this.socketIndex.set(socketId, { roomCode: code, sessionId: player.sessionId });

    return { room, player };
  }

  joinRoom(code: string, name: string, token: string | undefined, socketId: string) {
    const room = this.getRoom(code);

    if (room.status !== 'lobby') {
      throw new Error('This room is already in progress.');
    }

    if (room.players.length >= serverConfig.roomCapacity) {
      throw new Error('This room is full.');
    }

    const player = this.makePlayer(name, token, socketId, false);
    room.players.push(player);
    room.version += 1;

    this.sessionIndex.set(player.sessionId, { roomCode: code, playerId: player.id });
    this.socketIndex.set(socketId, { roomCode: code, sessionId: player.sessionId });

    return { room, player };
  }

  resumeSession(code: string, sessionId: string, socketId: string) {
    const room = this.getRoom(code);
    const player = room.players.find((entry) => entry.sessionId === sessionId);

    if (!player) {
      throw new Error('Session not found.');
    }

    player.isConnected = true;
    player.socketId = socketId;
    room.version += 1;

    this.socketIndex.set(socketId, { roomCode: code, sessionId });
    return { room, player };
  }

  getRoomCodeBySocket(socketId: string) {
    return this.socketIndex.get(socketId)?.roomCode;
  }

  disconnectSocket(socketId: string) {
    const meta = this.socketIndex.get(socketId);
    if (!meta) {
      return;
    }

    this.socketIndex.delete(socketId);
    const room = this.rooms.get(meta.roomCode);
    const player = room?.players.find((entry) => entry.sessionId === meta.sessionId);

    if (!room || !player) {
      return;
    }

    player.isConnected = false;
    player.socketId = undefined;
    room.version += 1;
  }

  setReady(sessionId: string, ready: boolean) {
    const player = this.getPlayerBySession(sessionId);
    const room = this.getRoomForSession(sessionId);
    if (room.status !== 'lobby') {
      throw new Error('Ready state can only change in the lobby.');
    }
    player.ready = ready;
    room.version += 1;
    return room;
  }

  addBot(sessionId: string) {
    const room = this.getRoomForSession(sessionId);
    const host = this.getPlayerBySession(sessionId);

    if (host.id !== room.hostPlayerId) {
      throw new Error('Only the host can add AI players.');
    }
    if (room.status !== 'lobby') {
      throw new Error('Bots can only be added before the game starts.');
    }
    if (room.players.length >= serverConfig.roomCapacity) {
      throw new Error('This room is full.');
    }

    const bot = this.makePlayer(`AI ${room.players.length}`, `Bot-${room.players.length}`, undefined, true);
    bot.ready = true;
    bot.isConnected = true;
    room.players.push(bot);
    room.version += 1;
    this.sessionIndex.set(bot.sessionId, { roomCode: room.code, playerId: bot.id });
    return room;
  }

  startGame(sessionId: string) {
    const room = this.getRoomForSession(sessionId);
    const player = this.getPlayerBySession(sessionId);

    if (room.hostPlayerId !== player.id) {
      throw new Error('Only the host can start the game.');
    }

    if (room.status !== 'lobby') {
      throw new Error('This game has already started.');
    }

    if (room.players.length < 2) {
      throw new Error('At least two players are required.');
    }

    const humansNotReady = room.players.filter((entry) => !entry.isBot && !entry.ready);
    if (humansNotReady.length > 0) {
      throw new Error('All human players must be ready.');
    }

    room.gameState = createGame(
      room.players.map((entry) => ({
        id: entry.id,
        name: entry.name,
        token: entry.token,
        isBot: entry.isBot
      })),
      room.seed
    );
    room.status = 'in-game';
    room.version += 1;

    this.runBotTurns(room);
    return room;
  }

  performAction(sessionId: string, action: ClientGameAction) {
    const room = this.getRoomForSession(sessionId);
    const player = this.getPlayerBySession(sessionId);

    if (!room.gameState) {
      throw new Error('No active game found.');
    }

    const engineAction =
      action === 'ROLL_DICE'
        ? { type: action, actorId: player.id, dice: rollDice() as [number, number] }
        : { type: action, actorId: player.id };

    room.gameState = reduceGameState(room.gameState, engineAction);
    room.version += 1;

    if (room.gameState.phase === 'game_over') {
      room.status = 'finished';
    }

    this.runBotTurns(room);
    return room;
  }

  getRoom(code: string) {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) {
      throw new Error('Room not found.');
    }
    return room;
  }

  getPublicRoom(code: string): PublicRoomState {
    const room = this.getRoom(code);
    return this.toPublicRoom(room);
  }

  toPublicRoom(room: ServerRoom): PublicRoomState {
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
          name: player.name,
          token: player.token,
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

  getAvailableActionsForPlayer(room: ServerRoom, playerId: string) {
    return room.gameState ? getAvailableActions(room.gameState, playerId) : [];
  }

  getPublicState(room: ServerRoom) {
    return room.gameState ? serializePublicState(room.gameState) : undefined;
  }

  buildStateDelta(previous: PublicGameState | undefined, next: PublicGameState): PublicGameDelta {
    if (!previous) {
      return next;
    }

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
    if (JSON.stringify(previous.board.map((tile) => tile.ownerId)) !== JSON.stringify(next.board.map((tile) => tile.ownerId))) {
      delta.board = next.board;
    }
    if (JSON.stringify(previous.log) !== JSON.stringify(next.log)) delta.log = next.log;

    return delta;
  }

  setLastPublicState(roomCode: string, state?: PublicGameState) {
    const room = this.getRoom(roomCode);
    room.lastPublicState = state;
  }

  getConnectedPlayers(room: ServerRoom) {
    return room.players.filter((player) => player.socketId);
  }

  private makePlayer(name: string, token: string | undefined, socketId: string | undefined, isBot: boolean): RoomPlayer {
    return {
      id: randomId('player'),
      sessionId: randomId('session'),
      name: sanitizeName(name),
      token: sanitizeToken(token),
      ready: isBot,
      isConnected: true,
      isBot,
      socketId
    };
  }

  private getRoomForSession(sessionId: string) {
    const entry = this.sessionIndex.get(sessionId);
    if (!entry) {
      throw new Error('Session not found.');
    }
    return this.getRoom(entry.roomCode);
  }

  private getPlayerBySession(sessionId: string) {
    const room = this.getRoomForSession(sessionId);
    const player = room.players.find((entry) => entry.sessionId === sessionId);
    if (!player) {
      throw new Error('Player not found.');
    }
    return player;
  }

  private runBotTurns(room: ServerRoom) {
    if (!room.gameState) {
      return;
    }

    while (room.gameState.phase !== 'game_over') {
      const currentPlayerId = serializePublicState(room.gameState).currentPlayerId;
      const current = room.players.find((entry) => entry.id === currentPlayerId);
      if (!current?.isBot) {
        break;
      }

      const action = chooseAiAction(room.gameState, current.id);

      if (!action) {
        room.gameState = reduceGameState(room.gameState, { type: 'ROLL_DICE', actorId: current.id, dice: rollDice() });
      } else if (action.type === 'ROLL_DICE') {
        room.gameState = reduceGameState(room.gameState, { ...action, dice: rollDice() });
      } else {
        room.gameState = reduceGameState(room.gameState, action);
      }

      room.version += 1;
      if (room.gameState.phase === 'game_over') {
        room.status = 'finished';
        break;
      }
    }
  }
}
