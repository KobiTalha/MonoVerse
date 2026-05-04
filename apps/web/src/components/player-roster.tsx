'use client';

import { motion } from 'framer-motion';
import type { PublicGameState } from '@monoverse/game-engine';

import { tokenColor } from '../lib/board-layout';
import type { PublicRoomState } from '../lib/contracts';
import { MoneyValue } from './money-value';

export function PlayerRoster({
  room,
  game,
  currentPlayerId,
  viewerId,
  compact = false
}: {
  room?: PublicRoomState;
  game?: PublicGameState;
  currentPlayerId?: string;
  viewerId?: string;
  compact?: boolean;
}) {
  if (!room) {
    return null;
  }

  const liveById = new Map(game?.players.map((player) => [player.id, player]));

  return (
    <div className={`roster ${compact ? 'roster-compact' : ''}`}>
      {room.players.map((player, index) => {
        const live = liveById.get(player.id);
        const cash = live?.cash ?? player.cash ?? 1500;
        const propertyCount = live?.properties.length ?? 0;
        const isActive = player.id === currentPlayerId;
        const isViewer = player.id === viewerId;
        const color = tokenColor(index);

        return (
          <motion.div
            key={player.id}
            layout
            className={[
              'roster-card',
              compact ? 'roster-card-compact' : '',
              isActive ? 'roster-card-active' : '',
              isViewer ? 'roster-card-viewer' : '',
              player.bankrupt || live?.bankrupt ? 'roster-card-bankrupt' : ''
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ ['--player-color' as string]: color }}
          >
            <div className="roster-card-head">
              <div className="roster-token" aria-hidden>
                <span>{player.name.slice(0, 1).toUpperCase()}</span>
              </div>
              <div className="roster-id">
                <h4>{player.name}</h4>
                <p>
                  <span className="roster-id-token">{player.token}</span>
                  {isViewer ? <span className="roster-id-tag">You</span> : null}
                  {player.id === room.hostPlayerId ? (
                    <span className="roster-id-tag">Host</span>
                  ) : null}
                  {player.isBot ? <span className="roster-id-tag roster-id-tag-bot">AI</span> : null}
                </p>
              </div>
              {isActive ? (
                <span className="roster-active-mark" aria-label="Currently playing">
                  ●
                </span>
              ) : null}
            </div>

            {!compact ? (
              <div className="roster-card-body">
                <div className="roster-stat">
                  <span>Cash</span>
                  <strong>
                    <MoneyValue value={cash} />¢
                  </strong>
                </div>
                <div className="roster-stat">
                  <span>Properties</span>
                  <strong>{propertyCount}</strong>
                </div>
                <div className="roster-stat">
                  <span>Status</span>
                  <strong className={live?.inJail ? 'roster-status-jail' : ''}>
                    {live?.bankrupt
                      ? 'Bankrupt'
                      : live?.inJail
                      ? 'In jail'
                      : player.isConnected
                      ? 'Online'
                      : 'Reconnecting'}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="roster-card-body roster-card-body-compact">
                <span className={player.ready ? 'status-ready' : 'status-waiting'}>
                  {player.ready ? 'Ready' : 'Waiting'}
                </span>
                <strong>
                  <MoneyValue value={cash} />¢
                </strong>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
