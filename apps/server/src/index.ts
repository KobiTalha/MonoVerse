import cors from 'cors';
import express, { type Express } from 'express';
import { createServer, type Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';

import { serverConfig } from './config';
import { RoomManager } from './room-manager';

interface AttachOptions {
  httpServer: HttpServer;
  expressApp?: Express;
  clientOrigin?: string | RegExp | string[];
}

export function attachMonoVerse({ httpServer, expressApp, clientOrigin }: AttachOptions) {
  const origin = clientOrigin ?? serverConfig.clientOrigin;
  const credentials = origin !== '*';

  if (expressApp) {
    expressApp.use(cors({ origin, credentials }));
    expressApp.get('/health', (_request, response) => {
      response.json({
        ok: true,
        name: 'monoverse-server',
        timestamp: Date.now()
      });
    });
  }

  const io = new Server(httpServer, {
    cors: {
      origin,
      credentials
    }
  });

  const manager = new RoomManager();

  function emitError(socket: Socket, message: string) {
    socket.emit('server:error', { message });
  }

  function syncRoom(roomCode: string, forceSnapshot = false) {
    const room = manager.getRoom(roomCode);
    const publicRoom = manager.toPublicRoom(room);
    io.to(roomCode).emit('room:update', publicRoom);

    const publicState = manager.getPublicState(room);
    if (!publicState) {
      manager.setLastPublicState(roomCode, undefined);
      return;
    }

    const delta = manager.buildStateDelta(room.lastPublicState, publicState);
    const connectedPlayers = manager.getConnectedPlayers(room);

    for (const player of connectedPlayers) {
      if (!player.socketId) continue;

      const payload = {
        version: room.version,
        availableActions: manager.getAvailableActionsForPlayer(room, player.id)
      };

      if (forceSnapshot || !room.lastPublicState) {
        io.to(player.socketId).emit('game:snapshot', {
          ...payload,
          state: publicState
        });
      } else {
        io.to(player.socketId).emit('game:update', {
          ...payload,
          delta
        });
      }
    }

    manager.setLastPublicState(roomCode, publicState);
  }

  io.on('connection', (socket) => {
    socket.on('room:create', ({ name, token }: { name: string; token?: string }) => {
      try {
        const { room, player } = manager.createRoom(name, token, socket.id);
        socket.join(room.code);
        socket.emit('session:accepted', {
          roomCode: room.code,
          playerId: player.id,
          sessionId: player.sessionId
        });
        syncRoom(room.code, true);
      } catch (error) {
        emitError(socket, error instanceof Error ? error.message : 'Unable to create room.');
      }
    });

    socket.on('room:join', ({ code, name, token }: { code: string; name: string; token?: string }) => {
      try {
        const { room, player } = manager.joinRoom(code, name, token, socket.id);
        socket.join(room.code);
        socket.emit('session:accepted', {
          roomCode: room.code,
          playerId: player.id,
          sessionId: player.sessionId
        });
        syncRoom(room.code, true);
      } catch (error) {
        emitError(socket, error instanceof Error ? error.message : 'Unable to join room.');
      }
    });

    socket.on('session:resume', ({ code, sessionId }: { code: string; sessionId: string }) => {
      try {
        const { room, player } = manager.resumeSession(code, sessionId, socket.id);
        socket.join(room.code);
        socket.emit('session:accepted', {
          roomCode: room.code,
          playerId: player.id,
          sessionId: player.sessionId
        });
        syncRoom(room.code, true);
      } catch (error) {
        emitError(socket, error instanceof Error ? error.message : 'Unable to resume session.');
      }
    });

    socket.on('player:ready', ({ sessionId, ready }: { sessionId: string; ready: boolean }) => {
      try {
        const room = manager.setReady(sessionId, ready);
        syncRoom(room.code);
      } catch (error) {
        emitError(socket, error instanceof Error ? error.message : 'Unable to update ready state.');
      }
    });

    socket.on('room:add-bot', ({ sessionId }: { sessionId: string }) => {
      try {
        const room = manager.addBot(sessionId);
        syncRoom(room.code);
      } catch (error) {
        emitError(socket, error instanceof Error ? error.message : 'Unable to add bot.');
      }
    });

    socket.on('game:start', ({ sessionId }: { sessionId: string }) => {
      try {
        const room = manager.startGame(sessionId);
        syncRoom(room.code, true);
      } catch (error) {
        emitError(socket, error instanceof Error ? error.message : 'Unable to start game.');
      }
    });

    socket.on(
      'game:action',
      ({
        sessionId,
        action
      }: {
        sessionId: string;
        action: 'ROLL_DICE' | 'BUY_PROPERTY' | 'END_TURN' | 'PAY_BAIL';
      }) => {
        try {
          const room = manager.performAction(sessionId, action);
          syncRoom(room.code);
        } catch (error) {
          emitError(socket, error instanceof Error ? error.message : 'Unable to perform action.');
        }
      }
    );

    socket.on('disconnect', () => {
      try {
        const roomCode = manager.getRoomCodeBySocket(socket.id);
        manager.disconnectSocket(socket.id);
        if (roomCode) {
          syncRoom(roomCode);
        }
      } catch {
        // ignore disconnect sync errors
      }
    });
  });

  return { io, manager };
}

const isDirectInvocation =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] !== undefined &&
  /[\\/]apps[\\/]server[\\/]src[\\/]index\.ts$/.test(process.argv[1]);

if (isDirectInvocation) {
  const app = express();
  const httpServer = createServer(app);
  attachMonoVerse({ httpServer, expressApp: app });

  httpServer.listen(serverConfig.port, () => {
    // eslint-disable-next-line no-console
    console.log(`MonoVerse server listening on ${serverConfig.port}`);
  });
}
