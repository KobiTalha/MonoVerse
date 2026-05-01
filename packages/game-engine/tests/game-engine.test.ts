import { describe, expect, it } from 'vitest';

import { createGame, reduceGameState, serializePublicState } from '../src/index';

describe('game engine', () => {
  it('supports buying a property and charging rent', () => {
    let state = createGame(
      [
        { id: 'p1', name: 'Ava', token: 'Comet' },
        { id: 'p2', name: 'Noah', token: 'Cipher' }
      ],
      99
    );

    state.players[0].position = 1;
    state.phase = 'waiting_for_purchase';
    state.pendingPurchase = { playerId: 'p1', tileId: 'neon-harbor' };

    state = reduceGameState(state, { type: 'BUY_PROPERTY', actorId: 'p1' });
    expect(state.players[0].cash).toBe(1420);

    state = reduceGameState(state, { type: 'END_TURN', actorId: 'p1' });
    state.players[1].position = 19;

    state = reduceGameState(state, { type: 'ROLL_DICE', actorId: 'p2', dice: [1, 1] });

    expect(state.players[1].cash).toBe(1690);
    expect(state.players[0].cash).toBe(1430);

    const publicState = serializePublicState(state);
    expect(publicState.board.find((tile) => tile.id === 'neon-harbor')?.ownerId).toBe('p1');
  });

  it('keeps a player in jail without doubles', () => {
    let state = createGame(
      [
        { id: 'p1', name: 'Ava', token: 'Comet' },
        { id: 'p2', name: 'Noah', token: 'Cipher' }
      ],
      99
    );

    state.players[0].inJail = true;
    state.players[0].position = 5;

    state = reduceGameState(state, { type: 'ROLL_DICE', actorId: 'p1', dice: [2, 3] });

    expect(state.players[0].inJail).toBe(true);
    expect(state.players[0].jailTurns).toBe(1);
    expect(state.phase).toBe('waiting_for_end_turn');
  });

  it('sends a player to jail after a third double roll', () => {
    let state = createGame(
      [
        { id: 'p1', name: 'Ava', token: 'Comet' },
        { id: 'p2', name: 'Noah', token: 'Cipher' }
      ],
      99
    );

    state.players[0].consecutiveDoubles = 2;
    state.players[0].position = 4;

    state = reduceGameState(state, { type: 'ROLL_DICE', actorId: 'p1', dice: [4, 4] });

    expect(state.players[0].inJail).toBe(true);
    expect(state.players[0].position).toBe(5);
    expect(state.phase).toBe('waiting_for_end_turn');
  });

  it('declares bankruptcy when rent cannot be covered', () => {
    let state = createGame(
      [
        { id: 'p1', name: 'Ava', token: 'Comet' },
        { id: 'p2', name: 'Noah', token: 'Cipher' }
      ],
      99
    );

    state.players[0].cash = 10;
    state.players[0].position = 17;
    state.players[1].properties = ['zenith-tower'];

    state = reduceGameState(state, { type: 'ROLL_DICE', actorId: 'p1', dice: [1, 1] });

    expect(state.players[0].bankrupt).toBe(true);
    expect(state.winnerId).toBe('p2');
    expect(state.phase).toBe('game_over');
  });
});
