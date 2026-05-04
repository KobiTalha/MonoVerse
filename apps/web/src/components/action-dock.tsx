'use client';

import type { PublicGameState } from '@monoverse/game-engine';
import { motion } from 'framer-motion';

const ACTION_LABELS: Record<string, string> = {
  ROLL_DICE: 'Roll dice',
  BUY_PROPERTY: 'Buy property',
  PAY_BAIL: 'Pay bail',
  END_TURN: 'End turn'
};

const ACTION_HINTS: Record<string, string> = {
  ROLL_DICE: 'Generate a server-authoritative roll.',
  BUY_PROPERTY: 'Acquire the property you just landed on.',
  PAY_BAIL: 'Get out of jail for 50¢.',
  END_TURN: 'Hand the table to the next player.'
};

export function ActionDock({
  game,
  isMyTurn,
  isRolling,
  isBusy,
  availableActions,
  onAction,
  pendingTileName
}: {
  game?: PublicGameState;
  isMyTurn?: boolean;
  isRolling?: boolean;
  isBusy?: boolean;
  availableActions: string[];
  onAction: (action: 'ROLL_DICE' | 'BUY_PROPERTY' | 'PAY_BAIL' | 'END_TURN') => void;
  pendingTileName?: string;
}) {
  const buttons = (['ROLL_DICE', 'BUY_PROPERTY', 'PAY_BAIL', 'END_TURN'] as const).map(
    (action) => {
      const enabled =
        availableActions.includes(action) && !isRolling && !isBusy && !!isMyTurn;
      const isPrimary = action === 'ROLL_DICE';
      return (
        <button
          key={action}
          type="button"
          className={`action-button ${
            isPrimary ? 'action-button-primary' : 'action-button-ghost'
          } ${enabled ? '' : 'action-button-disabled'}`}
          disabled={!enabled}
          onClick={() => onAction(action)}
        >
          <span className="action-button-label">
            {action === 'ROLL_DICE' && isRolling ? 'Rolling…' : ACTION_LABELS[action]}
          </span>
          <span className="action-button-hint">{ACTION_HINTS[action]}</span>
        </button>
      );
    }
  );

  return (
    <motion.div
      className="action-dock"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="action-dock-head">
        <div>
          <span className="eyebrow">Action panel</span>
          <h3>{isMyTurn ? 'Take your turn' : 'Spectate the table'}</h3>
        </div>
        {pendingTileName ? (
          <span className="action-dock-pending">
            Pending purchase · <strong>{pendingTileName}</strong>
          </span>
        ) : null}
      </div>
      <div className="action-dock-grid">{buttons}</div>
      {game ? (
        <p className="action-dock-caption">
          {isMyTurn
            ? 'Only valid turn actions are enabled. The board locks while the dice settle.'
            : 'Waiting for the active player to commit their move.'}
        </p>
      ) : null}
    </motion.div>
  );
}
