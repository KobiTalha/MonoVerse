'use client';

import type { PublicGameState } from '@monoverse/game-engine';
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';

import type { PublicRoomState } from '../lib/contracts';
import { DiceDisplay } from './dice-display';

export function CenterStage({
  game,
  room,
  isRolling,
  justSettled,
  playerColors,
  freeParkingPot,
  turnStatus
}: {
  game?: PublicGameState;
  room?: PublicRoomState;
  isRolling?: boolean;
  justSettled?: boolean;
  playerColors: Record<string, string>;
  freeParkingPot?: number;
  turnStatus: { tone: 'idle' | 'mine' | 'theirs' | 'win'; label: string };
}) {
  const currentPlayer = game?.players.find((player) => player.id === game.currentPlayerId);
  const currentRoomPlayer = room?.players.find((player) => player.id === currentPlayer?.id);
  const accentColor = currentPlayer ? playerColors[currentPlayer.id] : undefined;

  const recentEntry = useMemo(() => {
    if (!game?.log?.length) return undefined;
    return game.log[game.log.length - 1];
  }, [game?.log]);

  return (
    <div
      className={`center-stage center-stage-${turnStatus.tone}`}
      style={{ ['--center-accent' as string]: accentColor ?? '#3b82f6' }}
    >
      <div className="center-stage-corners" aria-hidden>
        <span className="center-stage-corner center-stage-corner-tl" />
        <span className="center-stage-corner center-stage-corner-tr" />
        <span className="center-stage-corner center-stage-corner-bl" />
        <span className="center-stage-corner center-stage-corner-br" />
      </div>

      <div className="center-stage-brand">
        <span className="center-stage-brand-glyph">M</span>
        <div>
          <span className="center-stage-eyebrow">MonoVerse</span>
          <h2>Boardroom</h2>
        </div>
      </div>

      {currentRoomPlayer ? (
        <div className="center-stage-current">
          <span
            className="center-stage-current-token"
            style={{ ['--current-color' as string]: accentColor ?? '#3b82f6' }}
          >
            {currentRoomPlayer.name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <span className="center-stage-current-label">Now playing</span>
            <strong>{currentRoomPlayer.name}</strong>
          </div>
        </div>
      ) : (
        <div className="center-stage-current center-stage-current-empty">
          <span className="center-stage-current-label">Awaiting</span>
          <strong>Connect to begin</strong>
        </div>
      )}

      <div className="center-stage-dice-area">
        <DiceDisplay
          roll={game?.lastRoll}
          isRolling={isRolling}
          justSettled={justSettled}
        />
      </div>

      <div className="center-stage-meta">
        <div className="center-stage-meta-cell">
          <span>Turn</span>
          <strong>{game?.turn ?? 0}</strong>
        </div>
        <div className="center-stage-meta-cell">
          <span>Pot</span>
          <strong>{freeParkingPot ?? 0}¢</strong>
        </div>
        <div className="center-stage-meta-cell">
          <span>Phase</span>
          <strong>
            {game?.phase
              ? game.phase.replaceAll('_', ' ').replace('waiting for ', '')
              : 'idle'}
          </strong>
        </div>
      </div>

      <div className="center-stage-feed">
        <AnimatePresence mode="wait">
          {recentEntry ? (
            <motion.div
              key={recentEntry.id}
              className="center-stage-feed-item"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <span>T{recentEntry.turn}</span>
              <p>{recentEntry.text}</p>
            </motion.div>
          ) : (
            <div className="center-stage-feed-empty">
              <p>The match log will appear here.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
