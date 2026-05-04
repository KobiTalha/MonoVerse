'use client';

import type { PublicBoardTile, PublicGameState } from '@monoverse/game-engine';
import { AnimatePresence, motion } from 'framer-motion';

import { PROPERTY_GROUP_COLORS } from '../lib/board-layout';
import type { PublicRoomState } from '../lib/contracts';

export function PropertyDeed({
  tile,
  game,
  room,
  onClose
}: {
  tile?: PublicBoardTile;
  game?: PublicGameState;
  room?: PublicRoomState;
  onClose: () => void;
}) {
  if (!tile) {
    return (
      <div className="deed-empty">
        <span className="deed-empty-glyph">◰</span>
        <h4>Select a tile</h4>
        <p>
          Tap any board tile to inspect its deed, rent, ownership, and connection to the
          MonoVerse economy.
        </p>
      </div>
    );
  }

  const isProperty = tile.type === 'property' || tile.type === 'utility';
  const accent =
    isProperty && 'group' in tile ? PROPERTY_GROUP_COLORS[tile.group]?.tint : undefined;
  const owner = tile.ownerId
    ? room?.players.find((player) => player.id === tile.ownerId)
    : undefined;

  return (
    <AnimatePresence mode="wait">
      <motion.article
        key={tile.id}
        className="deed"
        initial={{ rotateY: -90, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        exit={{ rotateY: 90, opacity: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        style={{ ['--deed-accent' as string]: accent ?? '#3b82f6' }}
      >
        <header className="deed-header">
          <div className="deed-header-band" aria-hidden />
          <div className="deed-header-text">
            <span className="deed-kicker">
              {tile.type.replaceAll('_', ' ').toUpperCase()}
            </span>
            <h3>{tile.name}</h3>
            <p>{tile.description}</p>
          </div>
          <button type="button" className="deed-close" onClick={onClose} aria-label="Close deed">
            ×
          </button>
        </header>

        <dl className="deed-stats">
          {isProperty && 'price' in tile ? (
            <>
              <div>
                <dt>Price</dt>
                <dd>{tile.price}¢</dd>
              </div>
              <div>
                <dt>Base rent</dt>
                <dd>{tile.baseRent}¢</dd>
              </div>
              <div>
                <dt>Group</dt>
                <dd className="deed-stat-group">
                  <span className="deed-group-dot" />
                  {tile.group}
                </dd>
              </div>
            </>
          ) : tile.type === 'tax' ? (
            <div>
              <dt>Tax</dt>
              <dd>{tile.amount}¢</dd>
            </div>
          ) : (
            <div>
              <dt>Type</dt>
              <dd>{tile.type.replaceAll('_', ' ')}</dd>
            </div>
          )}

          <div>
            <dt>Position</dt>
            <dd>{tile.position.toString().padStart(2, '0')}</dd>
          </div>

          {tile.ownerId ? (
            <div>
              <dt>Owner</dt>
              <dd>{owner?.name ?? 'Held'}</dd>
            </div>
          ) : null}
        </dl>

        {game?.pendingPurchase?.tileId === tile.id ? (
          <p className="deed-note">A purchase decision is pending for this tile.</p>
        ) : null}
      </motion.article>
    </AnimatePresence>
  );
}
