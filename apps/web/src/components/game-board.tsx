'use client';

import type { PublicGameState, PublicBoardTile } from '@monoverse/game-engine';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';

import { BOARD_LAYOUT, PROPERTY_GROUP_COLORS, tokenColor } from '../lib/board-layout';
import type { PublicRoomState } from '../lib/contracts';
import { CenterStage } from './center-stage';

const BOARD_SIZE = BOARD_LAYOUT.length;
const TOKEN_STEP_DURATION = 320;
const TILE_FLASH_DURATION = 900;

function buildTravelPath(from: number, to: number, inJail: boolean) {
  if (from === to) {
    return [] as number[];
  }

  if (inJail && to === 5) {
    return [5];
  }

  const forwardSteps = to >= from ? to - from : BOARD_SIZE - from + to;
  const backwardSteps = from >= to ? from - to : from + BOARD_SIZE - to;
  const direction =
    backwardSteps > 0 && backwardSteps <= 3 && forwardSteps > backwardSteps ? -1 : 1;
  const totalSteps = direction === 1 ? forwardSteps : backwardSteps;

  return Array.from({ length: totalSteps }, (_, stepIndex) => {
    const rawPosition = from + direction * (stepIndex + 1);
    return ((rawPosition % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
  });
}

function getTileAccent(tile: PublicBoardTile): string | undefined {
  if (tile.type === 'property' || tile.type === 'utility') {
    return PROPERTY_GROUP_COLORS[tile.group]?.tint;
  }
  return undefined;
}

function getTileIcon(tile: PublicBoardTile): string {
  switch (tile.type) {
    case 'go':
      return '➤';
    case 'jail':
      return '⛓';
    case 'go_to_jail':
      return '!';
    case 'free_parking':
      return '★';
    case 'tax':
      return '⚡';
    case 'chance':
      return '?';
    case 'community':
      return '◐';
    case 'utility':
      return '⚙';
    default:
      return '';
  }
}

function getCornerLabel(tile: PublicBoardTile): { kicker: string; title: string; sub: string } {
  switch (tile.type) {
    case 'go':
      return { kicker: 'GO', title: tile.name, sub: 'Collect 200¢' };
    case 'jail':
      return { kicker: 'JAIL', title: tile.name, sub: 'Just visiting' };
    case 'go_to_jail':
      return { kicker: 'GO TO JAIL', title: tile.name, sub: 'Skip ahead' };
    case 'free_parking':
      return { kicker: 'FREE PARKING', title: tile.name, sub: 'Pool reward' };
    default:
      return { kicker: tile.type.replaceAll('_', ' '), title: tile.name, sub: '' };
  }
}

export function GameBoard({
  game,
  room,
  viewerId,
  isRolling,
  justSettled,
  onSelectTile,
  selectedTileId,
  onStep,
  onLand,
  freeParkingPot,
  turnStatus
}: {
  game?: PublicGameState;
  room?: PublicRoomState;
  viewerId?: string;
  isRolling?: boolean;
  justSettled?: boolean;
  onSelectTile: (tileId: string | undefined) => void;
  selectedTileId?: string;
  onStep?: (playerId: string) => void;
  onLand?: (playerId: string, position: number) => void;
  freeParkingPot?: number;
  turnStatus: { tone: 'idle' | 'mine' | 'theirs' | 'win'; label: string };
}) {
  const currentPlayer = game?.players.find((player) => player.id === game.currentPlayerId);
  const pendingTile = game?.pendingPurchase
    ? game.board.find((tile) => tile.id === game.pendingPurchase?.tileId)
    : undefined;
  const activeTileId =
    pendingTile?.id ?? game?.board.find((tile) => tile.position === currentPlayer?.position)?.id;

  const [displayedPositions, setDisplayedPositions] = useState<Record<string, number>>({});
  const [movingPlayers, setMovingPlayers] = useState<Record<string, boolean>>({});
  const [landedAccent, setLandedAccent] = useState<
    { playerId: string; position: number; key: number } | undefined
  >();
  const [flashTileIds, setFlashTileIds] = useState<Record<string, number>>({});
  const previousPositionsRef = useRef<Record<string, number>>({});
  const previousOwnersRef = useRef<Record<string, string | undefined>>({});
  const timeoutMapRef = useRef<Record<string, number[]>>({});
  const onStepRef = useRef(onStep);
  const onLandRef = useRef(onLand);

  useEffect(() => {
    onStepRef.current = onStep;
    onLandRef.current = onLand;
  }, [onStep, onLand]);

  useEffect(() => {
    return () => {
      Object.values(timeoutMapRef.current)
        .flat()
        .forEach((timeoutId) => window.clearTimeout(timeoutId));
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

      timeoutMapRef.current[player.id]?.forEach((timeoutId) =>
        window.clearTimeout(timeoutId)
      );
      const path = buildTravelPath(previousPosition, player.position, player.inJail);

      setMovingPlayers((current) => ({ ...current, [player.id]: path.length > 0 }));

      timeoutMapRef.current[player.id] = path.map((position, index) =>
        window.setTimeout(() => {
          setDisplayedPositions((current) => ({ ...current, [player.id]: position }));
          onStepRef.current?.(player.id);

          if (index === path.length - 1) {
            setMovingPlayers((current) => ({ ...current, [player.id]: false }));
            setLandedAccent({ playerId: player.id, position, key: Date.now() });
            onLandRef.current?.(player.id, position);
          }
        }, TOKEN_STEP_DURATION * (index + 1))
      );

      previousPositionsRef.current[player.id] = player.position;
    }
  }, [game?.players]);

  useEffect(() => {
    if (!game?.board) return;
    const next: Record<string, number> = { ...flashTileIds };
    let mutated = false;
    for (const tile of game.board) {
      const previousOwner = previousOwnersRef.current[tile.id];
      if (previousOwner === undefined) {
        previousOwnersRef.current[tile.id] = tile.ownerId;
        continue;
      }
      if (previousOwner !== tile.ownerId && tile.ownerId) {
        next[tile.id] = Date.now();
        mutated = true;
      }
      previousOwnersRef.current[tile.id] = tile.ownerId;
    }
    if (mutated) {
      setFlashTileIds(next);
      const timer = window.setTimeout(() => {
        setFlashTileIds((current) => {
          const cleared = { ...current };
          for (const tile of game.board) {
            if (cleared[tile.id] && Date.now() - cleared[tile.id] >= TILE_FLASH_DURATION) {
              delete cleared[tile.id];
            }
          }
          return cleared;
        });
      }, TILE_FLASH_DURATION + 50);
      return () => window.clearTimeout(timer);
    }
  }, [game?.board, flashTileIds]);

  const playerColors = useMemo(() => {
    const map: Record<string, string> = {};
    room?.players.forEach((player, index) => {
      map[player.id] = tokenColor(index);
    });
    game?.players.forEach((player, index) => {
      map[player.id] ??= tokenColor(index);
    });
    return map;
  }, [game?.players, room?.players]);

  const tokens = useMemo(() => {
    if (!game?.players) {
      return [];
    }
    return game.players.map((player) => ({
      ...player,
      renderedPosition: displayedPositions[player.id] ?? player.position,
      color: playerColors[player.id] ?? '#3b82f6'
    }));
  }, [displayedPositions, game?.players, playerColors]);

  const tilesByPosition = useMemo(() => {
    const map = new Map<number, PublicBoardTile>();
    game?.board.forEach((tile) => map.set(tile.position, tile));
    return map;
  }, [game?.board]);

  return (
    <div className="board-shell" data-rolling={isRolling ? 'true' : 'false'}>
      <div className="board-grid">
        {BOARD_LAYOUT.map((anchor) => {
          const tile = tilesByPosition.get(anchor.index);
          if (!tile) {
            return null;
          }
          const accent = getTileAccent(tile);
          const isFlashing = Boolean(flashTileIds[tile.id]);
          const isActive = activeTileId === tile.id;
          const isSelected = selectedTileId === tile.id;
          const isPending = pendingTile?.id === tile.id;
          const ownerColor = tile.ownerId ? playerColors[tile.ownerId] : undefined;
          const isCorner = anchor.side === 'corner';
          const corner = isCorner ? getCornerLabel(tile) : undefined;

          const tokenStack = tokens.filter(
            (player) => player.renderedPosition === anchor.index
          );

          return (
            <button
              type="button"
              key={tile.id}
              className={[
                'board-tile',
                `board-tile-${anchor.side}`,
                `board-tile-type-${tile.type}`,
                tile.ownerId ? 'board-tile-owned' : '',
                isActive ? 'board-tile-active' : '',
                isSelected ? 'board-tile-selected' : '',
                isPending ? 'board-tile-pending' : '',
                isFlashing ? 'board-tile-flash' : ''
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                gridRow: anchor.row,
                gridColumn: anchor.column,
                ['--tile-accent' as string]: accent,
                ['--tile-owner' as string]: ownerColor
              }}
              onClick={() => onSelectTile(isSelected ? undefined : tile.id)}
            >
              {accent ? <span className="board-tile-band" aria-hidden /> : null}

              {isCorner && corner ? (
                <div className="board-corner-content">
                  <span className="board-corner-icon" aria-hidden>
                    {getTileIcon(tile)}
                  </span>
                  <span className="board-corner-kicker">{corner.kicker}</span>
                  <strong className="board-corner-title">{corner.title}</strong>
                  {corner.sub ? (
                    <span className="board-corner-sub">{corner.sub}</span>
                  ) : null}
                </div>
              ) : (
                <div className="board-tile-content">
                  <div className="board-tile-name">{tile.name}</div>
                  {tile.type === 'property' || tile.type === 'utility' ? (
                    <div className="board-tile-price">{tile.price}¢</div>
                  ) : tile.type === 'tax' ? (
                    <div className="board-tile-price">−{tile.amount}¢</div>
                  ) : (
                    <div className="board-tile-glyph" aria-hidden>
                      {getTileIcon(tile)}
                    </div>
                  )}
                </div>
              )}

              {tile.ownerId ? <span className="board-tile-owner-mark" aria-hidden /> : null}

              {tokenStack.length > 0 ? (
                <div className="board-tile-tokens" aria-hidden>
                  {tokenStack.map((player, index) => {
                    const isLanded =
                      landedAccent?.playerId === player.id &&
                      landedAccent?.position === player.renderedPosition;
                    return (
                      <motion.span
                        key={player.id}
                        className={[
                          'board-token',
                          movingPlayers[player.id] ? 'board-token-moving' : '',
                          player.id === viewerId ? 'board-token-viewer' : '',
                          player.id === game?.currentPlayerId
                            ? 'board-token-active'
                            : '',
                          player.bankrupt ? 'board-token-bankrupt' : '',
                          isLanded ? 'board-token-landed' : ''
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        style={{
                          ['--token-color' as string]: player.color,
                          zIndex: 4 + index
                        }}
                        initial={false}
                        animate={{
                          scale: isLanded ? [1, 1.3, 1] : 1,
                          rotate: movingPlayers[player.id] ? [0, -8, 8, 0] : 0
                        }}
                        transition={{
                          duration: TOKEN_STEP_DURATION / 1000,
                          ease: [0.22, 1, 0.36, 1]
                        }}
                      >
                        {player.name.slice(0, 1).toUpperCase()}
                      </motion.span>
                    );
                  })}
                </div>
              ) : null}
            </button>
          );
        })}

        <div className="board-center">
          <CenterStage
            game={game}
            room={room}
            isRolling={isRolling}
            justSettled={justSettled}
            playerColors={playerColors}
            freeParkingPot={freeParkingPot}
            turnStatus={turnStatus}
          />
        </div>
      </div>
    </div>
  );
}
