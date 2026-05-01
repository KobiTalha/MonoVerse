'use client';

import type { PublicGameState } from '@monoverse/game-engine';
import { motion } from 'framer-motion';

import { BOARD_LAYOUT, getAnchorPosition } from '../lib/board-layout';
import type { PublicRoomState } from '../lib/contracts';
import { DiceDisplay } from './dice-display';

const groupClassMap: Record<string, string> = {
  teal: 'tile-teal',
  indigo: 'tile-indigo',
  rose: 'tile-rose',
  amber: 'tile-amber',
  emerald: 'tile-emerald',
  gold: 'tile-gold',
  utility: 'tile-utility'
};

export function GameBoard({
  game,
  room,
  viewerId
}: {
  game?: PublicGameState;
  room?: PublicRoomState;
  viewerId?: string;
}) {
  const currentPlayer = game?.players.find((player) => player.id === game.currentPlayerId);
  const pendingTile = game?.pendingPurchase ? game.board.find((tile) => tile.id === game.pendingPurchase?.tileId) : undefined;

  return (
    <section className="board-shell mv-surface">
      <div className="board-frame">
        <div className="board-grid">
          {game?.board.map((tile) => (
            <div
              key={tile.id}
              className={`board-tile ${tile.type === 'property' || tile.type === 'utility' ? groupClassMap[tile.group] : ''} ${tile.ownerId ? 'board-tile-owned' : ''}`}
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
                {tile.ownerId ? <span className="tile-owner-dot" /> : null}
              </div>
              <h3>{tile.name}</h3>
              <p>{tile.type.replaceAll('_', ' ')}</p>
              {'price' in tile ? <strong>{tile.price}¢</strong> : <strong>—</strong>}
            </div>
          ))}

          {game?.players.map((player, playerIndex) => {
            const anchor = getAnchorPosition(player.position);
            const offsetX = (playerIndex % 2) * 16 - 8;
            const offsetY = Math.floor(playerIndex / 2) * 16 - 8;

            return (
              <motion.div
                key={player.id}
                className={`player-token ${player.id === viewerId ? 'player-token-viewer' : ''} ${player.bankrupt ? 'player-token-bankrupt' : ''}`}
                animate={{
                  left: `calc(${anchor.x}% + ${offsetX}px)`,
                  top: `calc(${anchor.y}% + ${offsetY}px)`
                }}
                transition={{ type: 'spring', stiffness: 220, damping: 24 }}
              >
                <span>{player.name.slice(0, 1)}</span>
              </motion.div>
            );
          })}

          <div className="board-core">
            <div className="board-core-head">
              <div>
                <span className="eyebrow">Realtime City Match</span>
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
              <DiceDisplay roll={game?.lastRoll} />
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
                <p>{currentPlayer ? `${currentPlayer.name} controls the pace right now.` : 'Create a room to start the match flow.'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
