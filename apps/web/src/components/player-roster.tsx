'use client';

import type { PublicRoomState } from '../lib/contracts';

export function PlayerRoster({
  room,
  currentPlayerId,
  viewerId
}: {
  room?: PublicRoomState;
  currentPlayerId?: string;
  viewerId?: string;
}) {
  if (!room) {
    return null;
  }

  return (
    <div className="roster">
      {room.players.map((player) => (
        <div
          key={player.id}
          className={`roster-card ${player.id === currentPlayerId ? 'roster-card-active' : ''} ${player.bankrupt ? 'roster-card-bankrupt' : ''}`}
        >
          <div className="roster-card-top">
            <div>
              <h4>{player.name}</h4>
              <p>{player.token}</p>
            </div>
            <div className="roster-flags">
              {player.id === room.hostPlayerId ? <span>Host</span> : null}
              {player.id === viewerId ? <span>You</span> : null}
              {player.isBot ? <span>AI</span> : null}
            </div>
          </div>
          <div className="roster-card-bottom">
            <span>{player.ready ? 'Ready' : 'Waiting'}</span>
            <strong>{player.cash ?? '—'}¢</strong>
            <span>{player.isConnected ? 'Online' : 'Reconnecting'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
