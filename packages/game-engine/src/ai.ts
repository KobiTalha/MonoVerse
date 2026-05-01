import type { GameAction, GameState, PropertyTile } from './types';

function getNetWorth(state: GameState, playerId: string) {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player) return 0;

  const portfolioValue = player.properties.reduce((total, propertyId) => {
    const tile = state.board.find((entry) => entry.id === propertyId);
    if (!tile || (tile.type !== 'property' && tile.type !== 'utility')) return total;
    return total + tile.price;
  }, 0);

  return player.cash + portfolioValue;
}

export function chooseAiAction(state: GameState, playerId: string): GameAction | null {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player || player.bankrupt) return null;

  if (state.phase === 'waiting_for_roll') {
    if (player.inJail && player.cash > 500) {
      return { type: 'PAY_BAIL', actorId: playerId };
    }
    return null;
  }

  if (state.phase === 'waiting_for_purchase' && state.pendingPurchase?.playerId === playerId) {
    const tile = state.board.find(
      (entry): entry is PropertyTile =>
        entry.id === state.pendingPurchase?.tileId &&
        (entry.type === 'property' || entry.type === 'utility')
    );
    if (!tile) return { type: 'END_TURN', actorId: playerId };

    const projectedCash = player.cash - tile.price;
    const reserve = getNetWorth(state, playerId) > 1200 ? 150 : 250;
    return projectedCash >= reserve ? { type: 'BUY_PROPERTY', actorId: playerId } : { type: 'END_TURN', actorId: playerId };
  }

  if (state.phase === 'waiting_for_end_turn') {
    return { type: 'END_TURN', actorId: playerId };
  }

  return null;
}
