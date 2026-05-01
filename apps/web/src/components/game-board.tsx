'use client';

import type { PublicGameState } from '@monoverse/game-engine';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';

import { BOARD_LAYOUT, getAnchorPosition } from '../lib/board-layout';
import type { PublicRoomState } from '../lib/contracts';
import { DiceDisplay } from './dice-display';

const BOARD_SIZE = BOARD_LAYOUT.length;
const TOKEN_STEP_DURATION = 360;

function buildTravelPath(from: number, to: number, inJail: boolean) {
  if (from === to) {
    return [] as number[];
  }

  if (inJail && to === 5) {
    return [5];
  }

  const forwardSteps = to >= from ? to - from : BOARD_SIZE - from + to;
  const backwardSteps = from >= to ? from - to : from + BOARD_SIZE - to;
  const direction = backwardSteps > 0 && backwardSteps <= 3 && forwardSteps > backwardSteps ? -1 : 1;
  const totalSteps = direction === 1 ? forwardSteps : backwardSteps;

  return Array.from({ length: totalSteps }, (_, stepIndex) => {
    const rawPosition = from + direction * (stepIndex + 1);
    return ((rawPosition % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
  });
}

export function GameBoard({
  game,
  room,
  viewerId,
  isRolling
}: {
  game?: PublicGameState;
  room?: PublicRoomState;
  viewerId?: string;
  isRolling?: boolean;
}) {
  const currentPlayer = game?.players.find((player) => player.id === game.currentPlayerId);
  const pendingTile = game?.pendingPurchase ? game.board.find((tile) => tile.id === game.pendingPurchase?.tileId) : undefined;
  const activeTileId = pendingTile?.id ?? game?.board.find((tile) => tile.position === currentPlayer?.position)?.id;
  const [displayedPositions, setDisplayedPositions] = useState<Record<string, number>>({});
  const [movingPlayers, setMovingPlayers] = useState<Record<string, boolean>>({});
  const previousPositionsRef = useRef<Record<string, number>>({});
  const timeoutMapRef = useRef<Record<string, number[]>>({});

  useEffect(() => {
    return () => {
      Object.values(timeoutMapRef.current).flat().forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  useEffect(() => {
    if (!game?.players.length) {
      setDisplayedPositions({});
      previousPositionsRef.current = {};
      return;
    }

    setDisplayedPositions((current) => {
      const next = { ...current };

      for (const player of game.players) {
        next[player.id] ??= player.position;
      }

      return next;
    });

    for (const player of game.players) {
      const previousPosition = previousPositionsRef.current[player.id];

      if (previousPosition === undefined) {
        previousPositionsRef.current[player.id] = player.position;
        continue;
      }

      if (previousPosition === player.position) {
        continue;
      }

      timeoutMapRef.current[player.id]?.forEach((timeoutId) => window.clearTimeout(timeoutId));
      const path = buildTravelPath(previousPosition, player.position, player.inJail);

      setMovingPlayers((current) => ({ ...current, [player.id]: path.length > 0 }));

      timeoutMapRef.current[player.id] = path.map((position, index) =>
        window.setTimeout(() => {
          setDisplayedPositions((current) => ({ ...current, [player.id]: position }));

          if (index === path.length - 1) {
            setMovingPlayers((current) => ({ ...current, [player.id]: false }));
          }
        }, TOKEN_STEP_DURATION * (index + 1))
      );

      previousPositionsRef.current[player.id] = player.position;
    }
  }, [game?.players]);

  const tokens = useMemo(() => {
    if (!game?.players) {
      return [];
    }

    return game.players.map((player) => ({
      ...player,
      renderedPosition: displayedPositions[player.id] ?? player.position
    }));
  }, [displayedPositions, game?.players]);

  return (
    <section className="board-shell mv-surface">
      <div className="board-frame">
        <div className="board-grid">
          {game?.board.map((tile) => (
            <div
              key={tile.id}
              className={`board-tile board-tile-${tile.type} ${tile.ownerId ? 'board-tile-owned' : ''} ${activeTileId === tile.id ? 'board-tile-active' : ''}`}
              style={(() => {
                const gridAnchor = BOARD_LAYOUT.find((entry) => entry.index === tile.position);
                return {
                  gridRowStart: (gridAnchor?.row ?? 0) + 1,
                  gridColumnStart: (gridAnchor?.column ?? 0) + 1
                };
              })()}
            >
              <div className="board-tile-head">
                <span>{tile.position.toString().padStart(2, '0')}</span>
                <span className="board-tile-type">{tile.type.replaceAll('_', ' ')}</span>
              </div>
              <h3>{tile.name}</h3>
              <div className="board-tile-meta">
                {'price' in tile ? <strong>{tile.price}¢</strong> : <strong>—</strong>}
                {tile.ownerId ? <span className="tile-owner-pill">Owned</span> : null}
              </div>
            </div>
          ))}

          {tokens.map((player, playerIndex) => {
            const anchor = getAnchorPosition(player.renderedPosition);
            const offsetX = (playerIndex % 2) * 16 - 8;
            const offsetY = Math.floor(playerIndex / 2) * 16 - 8;

            return (
              <motion.div
                key={player.id}
                className={`player-token ${player.id === viewerId ? 'player-token-viewer' : ''} ${player.id === game?.currentPlayerId ? 'player-token-active' : ''} ${player.bankrupt ? 'player-token-bankrupt' : ''} ${movingPlayers[player.id] ? 'player-token-moving' : ''}`}
                animate={{
                  left: `calc(${anchor.x}% + ${offsetX}px)`,
                  top: `calc(${anchor.y}% + ${offsetY}px)`
                }}
                transition={{ duration: TOKEN_STEP_DURATION / 1000, ease: [0.22, 1, 0.36, 1] }}
              >
                <span>{player.name.slice(0, 1)}</span>
              </motion.div>
            );
          })}

          <div className="board-core">
            <div className="board-core-head">
              <div>
                <span className="eyebrow">Board Overview</span>
                <h2>MonoVerse</h2>
              </div>
              <div className="turn-chip">
                <span>Turn</span>
                <strong>{game?.turn ?? 0}</strong>
              </div>
            </div>

            <div className="board-current">
              <div>
                <p>Current player</p>
                <h3>{currentPlayer?.name ?? 'Waiting for room'}</h3>
                <span>{currentPlayer?.token ?? 'Connect to begin'}</span>
              </div>
              <DiceDisplay roll={game?.lastRoll} isRolling={isRolling} />
            </div>

            <div className="board-insight-grid">
              <div className="board-insight">
                <span>Purchase window</span>
                <strong>{pendingTile?.name ?? 'No active tile prompt'}</strong>
              </div>
              <div className="board-insight">
                <span>Free parking pool</span>
                <strong>{game?.freeParkingPot ?? 0}¢</strong>
              </div>
            </div>

            <div className="board-banner">
              {game?.winnerId ? (
                <p>{room?.players.find((player) => player.id === game.winnerId)?.name ?? 'A player'} wins the city.</p>
              ) : (
                <p>{currentPlayer ? `${currentPlayer.name} controls the board right now.` : 'Create a room to start the match flow.'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
