import { describe, expect, it } from 'vitest';

import { RoomManager } from '../src/room-manager';

describe('room manager', () => {
  it('creates a room and starts a match when all humans are ready', () => {
    const manager = new RoomManager();
    const { room, player: host } = manager.createRoom('Ava', 'Comet', 'socket-1');
    const { player: guest } = manager.joinRoom(room.code, 'Noah', 'Cipher', 'socket-2');

    manager.setReady(host.sessionId, true);
    manager.setReady(guest.sessionId, true);
    const startedRoom = manager.startGame(host.sessionId);

    expect(startedRoom.status).toBe('in-game');
    expect(startedRoom.gameState).toBeDefined();
  });

  it('supports reconnecting with the same session', () => {
    const manager = new RoomManager();
    const { room, player } = manager.createRoom('Ava', 'Comet', 'socket-1');

    manager.disconnectSocket('socket-1');
    const resumed = manager.resumeSession(room.code, player.sessionId, 'socket-2');

    expect(resumed.player.socketId).toBe('socket-2');
    expect(resumed.player.isConnected).toBe(true);
  });
});
