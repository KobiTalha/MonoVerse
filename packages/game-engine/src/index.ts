import { CHANCE_CARDS, COMMUNITY_CARDS } from './cards';
import { JAIL_BAIL, MONOVERSE_BOARD, PASS_GO_REWARD, STARTING_CASH } from './board';
import type {
  CardDefinition,
  CardDeckType,
  GameAction,
  GameLogEntry,
  GamePlayer,
  GamePlayerInput,
  GameState,
  PropertyTile,
  PublicGameState
} from './types';
import { makeLogId, shuffleArray } from './utils';

export * from './ai';
export * from './board';
export * from './cards';
export * from './types';

const cardMap = new Map(
  [...CHANCE_CARDS, ...COMMUNITY_CARDS].map((card) => [card.id, card])
);

function cloneState(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((player) => ({ ...player, properties: [...player.properties] })),
    chanceDeck: { ...state.chanceDeck, order: [...state.chanceDeck.order] },
    communityDeck: { ...state.communityDeck, order: [...state.communityDeck.order] },
    log: [...state.log],
    pendingPurchase: state.pendingPurchase ? { ...state.pendingPurchase } : undefined
  };
}

function appendLog(state: GameState, text: string) {
  const entry: GameLogEntry = {
    id: makeLogId(state.turn, state.log.length),
    turn: state.turn,
    text,
    timestamp: Date.now()
  };

  state.log = [...state.log.slice(-19), entry];
}

function getCurrentPlayer(state: GameState) {
  return state.players[state.currentPlayerIndex];
}

function getPlayer(state: GameState, playerId: string) {
  return state.players.find((player) => player.id === playerId);
}

function requireTurn(state: GameState, actorId: string) {
  const player = getCurrentPlayer(state);

  if (!player || player.id !== actorId) {
    throw new Error('It is not your turn.');
  }

  if (player.bankrupt) {
    throw new Error('Bankrupt players cannot act.');
  }

  return player;
}

function getTile(state: GameState, position: number) {
  const tile = state.board.find((entry) => entry.position === position);

  if (!tile) {
    throw new Error(`Unknown tile at position ${position}.`);
  }

  return tile;
}

function getTileById(state: GameState, tileId: string) {
  const tile = state.board.find((entry) => entry.id === tileId);

  if (!tile) {
    throw new Error(`Unknown tile ${tileId}.`);
  }

  return tile;
}

function getOwner(state: GameState, tileId: string) {
  return state.players.find((player) => player.properties.includes(tileId));
}

function getLivingPlayers(state: GameState) {
  return state.players.filter((player) => !player.bankrupt);
}

function bankruptPlayer(state: GameState, playerId: string, creditorId?: string) {
  const player = getPlayer(state, playerId);
  if (!player || player.bankrupt) {
    return;
  }

  const creditor = creditorId ? getPlayer(state, creditorId) : undefined;

  if (creditor) {
    creditor.cash += Math.max(player.cash, 0);
    creditor.properties = [...creditor.properties, ...player.properties];
  }

  player.cash = 0;
  player.properties = [];
  player.bankrupt = true;
  player.inJail = false;
  player.jailTurns = 0;
  player.consecutiveDoubles = 0;

  appendLog(state, `${player.name} goes bankrupt${creditor ? ` to ${creditor.name}` : ''}.`);
}

function chargePlayer(state: GameState, playerId: string, amount: number, reason: string, creditorId?: string) {
  const player = getPlayer(state, playerId);

  if (!player) {
    throw new Error(`Unknown player ${playerId}.`);
  }

  player.cash -= amount;
  appendLog(state, `${player.name} pays ${amount} credits for ${reason}.`);

  if (creditorId) {
    const creditor = getPlayer(state, creditorId);
    if (creditor) {
      creditor.cash += amount;
    }
  } else {
    state.freeParkingPot += amount;
  }

  if (player.cash < 0) {
    bankruptPlayer(state, playerId, creditorId);
  }
}

function creditPlayer(state: GameState, playerId: string, amount: number, reason: string) {
  const player = getPlayer(state, playerId);

  if (!player) {
    throw new Error(`Unknown player ${playerId}.`);
  }

  player.cash += amount;
  appendLog(state, `${player.name} gains ${amount} credits from ${reason}.`);
}

function groupOwnedCount(state: GameState, playerId: string, group: PropertyTile['group']) {
  return state.players
    .find((player) => player.id === playerId)
    ?.properties.map((propertyId) => getTileById(state, propertyId))
    .filter((tile): tile is PropertyTile => tile.type === 'property' || tile.type === 'utility')
    .filter((tile) => tile.group === group).length ?? 0;
}

function groupSize(state: GameState, group: PropertyTile['group']) {
  return state.board.filter(
    (tile): tile is PropertyTile => (tile.type === 'property' || tile.type === 'utility') && tile.group === group
  ).length;
}

function calculateRent(state: GameState, tile: PropertyTile, ownerId: string, diceTotal: number) {
  if (tile.type === 'utility') {
    return diceTotal * 6;
  }

  const ownsFullGroup = groupOwnedCount(state, ownerId, tile.group) === groupSize(state, tile.group);
  return ownsFullGroup ? tile.baseRent * 2 : tile.baseRent;
}

function movePlayerToPosition(state: GameState, player: GamePlayer, targetPosition: number, collectGo = true) {
  const oldPosition = player.position;

  if (targetPosition < oldPosition && collectGo) {
    player.cash += PASS_GO_REWARD;
    appendLog(state, `${player.name} loops through Launch Pad and collects ${PASS_GO_REWARD} credits.`);
  }

  player.position = ((targetPosition % state.board.length) + state.board.length) % state.board.length;
}

function movePlayerBySteps(state: GameState, player: GamePlayer, steps: number) {
  const rawTarget = player.position + steps;

  if (rawTarget >= state.board.length) {
    player.cash += PASS_GO_REWARD;
    appendLog(state, `${player.name} loops through Launch Pad and collects ${PASS_GO_REWARD} credits.`);
  }

  player.position = ((rawTarget % state.board.length) + state.board.length) % state.board.length;
}

function sendToJail(state: GameState, player: GamePlayer, reason: string) {
  player.position = 5;
  player.inJail = true;
  player.jailTurns = 0;
  player.consecutiveDoubles = 0;
  state.pendingPurchase = undefined;
  state.extraTurnPending = false;
  appendLog(state, `${player.name} is sent to Detention Loop for ${reason}.`);
}

function drawCard(state: GameState, deckType: CardDeckType) {
  const deckState = deckType === 'chance' ? state.chanceDeck : state.communityDeck;
  const cardId = deckState.order[deckState.cursor];

  if (!cardId) {
    throw new Error(`No ${deckType} cards remaining.`);
  }

  deckState.cursor = (deckState.cursor + 1) % deckState.order.length;

  const card = cardMap.get(cardId);
  if (!card) {
    throw new Error(`Unknown card ${cardId}.`);
  }

  return card;
}

function resolveCard(state: GameState, player: GamePlayer, card: CardDefinition) {
  appendLog(state, `${player.name} draws ${card.title}.`);

  switch (card.effect.kind) {
    case 'money': {
      if (card.effect.amount >= 0) {
        creditPlayer(state, player.id, card.effect.amount, card.title);
      } else {
        chargePlayer(state, player.id, Math.abs(card.effect.amount), card.title);
      }
      break;
    }
    case 'move': {
      movePlayerToPosition(state, player, card.effect.position, card.effect.collectGo ?? true);
      resolveLanding(state, player, 0);
      break;
    }
    case 'move_relative': {
      movePlayerBySteps(state, player, card.effect.steps);
      resolveLanding(state, player, 0);
      break;
    }
    case 'go_to_jail': {
      sendToJail(state, player, card.title);
      state.phase = 'waiting_for_end_turn';
      break;
    }
    case 'jail_free': {
      player.jailFreeCards += 1;
      appendLog(state, `${player.name} stores a release card for later.`);
      break;
    }
    case 'repairs': {
      const portfolioCost = Math.max(player.properties.length, 1) * card.effect.amount;
      chargePlayer(state, player.id, portfolioCost, card.title);
      break;
    }
  }
}

function resolveLanding(state: GameState, player: GamePlayer, diceTotal: number) {
  if (player.bankrupt) {
    state.phase = 'waiting_for_end_turn';
    return;
  }

  const tile = getTile(state, player.position);

  switch (tile.type) {
    case 'go':
    case 'jail': {
      state.phase = 'waiting_for_end_turn';
      appendLog(state, `${player.name} settles on ${tile.name}.`);
      break;
    }
    case 'free_parking': {
      const reward = state.freeParkingPot;
      if (reward > 0) {
        state.freeParkingPot = 0;
        creditPlayer(state, player.id, reward, tile.name);
      } else {
        appendLog(state, `${player.name} cruises through ${tile.name} with nothing to claim.`);
      }
      state.phase = 'waiting_for_end_turn';
      break;
    }
    case 'tax': {
      chargePlayer(state, player.id, tile.amount, tile.name);
      state.phase = 'waiting_for_end_turn';
      break;
    }
    case 'chance':
    case 'community': {
      const card = drawCard(state, tile.type);
      resolveCard(state, player, card);
      if (state.phase !== 'game_over' && !state.pendingPurchase && !player.bankrupt && !player.inJail) {
        state.phase = 'waiting_for_end_turn';
      }
      break;
    }
    case 'go_to_jail': {
      sendToJail(state, player, tile.name);
      state.phase = 'waiting_for_end_turn';
      break;
    }
    case 'property':
    case 'utility': {
      const owner = getOwner(state, tile.id);

      if (!owner) {
        state.pendingPurchase = { playerId: player.id, tileId: tile.id };
        state.phase = 'waiting_for_purchase';
        appendLog(state, `${player.name} may acquire ${tile.name} for ${tile.price} credits.`);
        return;
      }

      if (owner.id === player.id) {
        appendLog(state, `${player.name} lands on their own holding at ${tile.name}.`);
        state.phase = 'waiting_for_end_turn';
        return;
      }

      const rent = calculateRent(state, tile, owner.id, diceTotal);
      chargePlayer(state, player.id, rent, `${tile.name} rent`, owner.id);
      appendLog(state, `${owner.name} collects ${rent} credits from ${player.name}.`);
      state.phase = 'waiting_for_end_turn';
      break;
    }
  }
}

function checkForWinner(state: GameState) {
  const living = getLivingPlayers(state);

  if (living.length === 1) {
    state.phase = 'game_over';
    state.winnerId = living[0].id;
    appendLog(state, `${living[0].name} wins MonoVerse.`);
  }
}

function advanceToNextPlayer(state: GameState) {
  if (state.phase === 'game_over') {
    return;
  }

  const living = getLivingPlayers(state);
  if (living.length <= 1) {
    checkForWinner(state);
    return;
  }

  if (state.extraTurnPending) {
    state.extraTurnPending = false;
    getCurrentPlayer(state).consecutiveDoubles = 0;
    state.phase = 'waiting_for_roll';
    appendLog(state, `${getCurrentPlayer(state).name} keeps the initiative with an extra turn.`);
    return;
  }

  let nextIndex = state.currentPlayerIndex;
  do {
    nextIndex = (nextIndex + 1) % state.players.length;
  } while (state.players[nextIndex].bankrupt);

  state.currentPlayerIndex = nextIndex;
  state.turn += 1;
  state.phase = 'waiting_for_roll';
  state.pendingPurchase = undefined;
  state.lastRoll = undefined;
  appendLog(state, `${state.players[nextIndex].name} is now on the clock.`);
}

export function createGame(players: GamePlayerInput[], seed = 42): GameState {
  if (players.length < 2) {
    throw new Error('At least two players are required to start.');
  }

  const state: GameState = {
    seed,
    phase: 'waiting_for_roll',
    turn: 1,
    currentPlayerIndex: 0,
    players: players.map((player) => ({
      id: player.id,
      name: player.name,
      token: player.token,
      cash: STARTING_CASH,
      position: 0,
      properties: [],
      bankrupt: false,
      inJail: false,
      jailTurns: 0,
      jailFreeCards: 0,
      consecutiveDoubles: 0,
      isBot: Boolean(player.isBot)
    })),
    board: MONOVERSE_BOARD,
    chanceDeck: { order: shuffleArray(CHANCE_CARDS.map((card) => card.id), seed + 11), cursor: 0 },
    communityDeck: { order: shuffleArray(COMMUNITY_CARDS.map((card) => card.id), seed + 17), cursor: 0 },
    freeParkingPot: 0,
    extraTurnPending: false,
    log: []
  };

  appendLog(state, `${state.players[0].name} opens the first MonoVerse round.`);
  return state;
}

export function reduceGameState(previousState: GameState, action: GameAction): GameState {
  const state = cloneState(previousState);

  if (state.phase === 'game_over') {
    throw new Error('The game has already ended.');
  }

  switch (action.type) {
    case 'PAY_BAIL': {
      const player = requireTurn(state, action.actorId);
      if (!player.inJail || state.phase !== 'waiting_for_roll') {
        throw new Error('Bail cannot be paid right now.');
      }
      if (player.cash < JAIL_BAIL) {
        throw new Error('Insufficient funds for bail.');
      }

      player.cash -= JAIL_BAIL;
      player.inJail = false;
      player.jailTurns = 0;
      appendLog(state, `${player.name} pays ${JAIL_BAIL} credits to leave Detention Loop.`);
      return state;
    }
    case 'ROLL_DICE': {
      const player = requireTurn(state, action.actorId);

      if (state.phase !== 'waiting_for_roll') {
        throw new Error('Dice cannot be rolled right now.');
      }

      const [dieOne, dieTwo] = action.dice;
      const total = dieOne + dieTwo;
      const isDouble = dieOne === dieTwo;

      state.lastRoll = action.dice;
      appendLog(state, `${player.name} rolls ${dieOne} + ${dieTwo}.`);

      if (player.inJail) {
        if (isDouble) {
          player.inJail = false;
          player.jailTurns = 0;
          appendLog(state, `${player.name} rolls doubles and exits Detention Loop.`);
          movePlayerBySteps(state, player, total);
          resolveLanding(state, player, total);
          checkForWinner(state);
          return state;
        }

        player.jailTurns += 1;

        if (player.jailTurns >= 3) {
          if (player.cash < JAIL_BAIL) {
            bankruptPlayer(state, player.id);
            checkForWinner(state);
            return state;
          }

          player.cash -= JAIL_BAIL;
          player.inJail = false;
          player.jailTurns = 0;
          appendLog(state, `${player.name} pays ${JAIL_BAIL} credits after a third missed escape attempt.`);
          movePlayerBySteps(state, player, total);
          resolveLanding(state, player, total);
          checkForWinner(state);
          return state;
        }

        state.phase = 'waiting_for_end_turn';
        appendLog(state, `${player.name} remains in Detention Loop.`);
        return state;
      }

      player.consecutiveDoubles = isDouble ? player.consecutiveDoubles + 1 : 0;

      if (player.consecutiveDoubles >= 3) {
        sendToJail(state, player, 'rolling three consecutive doubles');
        state.phase = 'waiting_for_end_turn';
        return state;
      }

      state.extraTurnPending = isDouble;
      movePlayerBySteps(state, player, total);
      resolveLanding(state, player, total);
      checkForWinner(state);
      return state;
    }
    case 'BUY_PROPERTY': {
      const player = requireTurn(state, action.actorId);
      const pendingPurchase = state.pendingPurchase;

      if (state.phase !== 'waiting_for_purchase' || !pendingPurchase || pendingPurchase.playerId !== player.id) {
        throw new Error('No property is available to purchase.');
      }

      const tile = getTileById(state, pendingPurchase.tileId);
      if (tile.type !== 'property' && tile.type !== 'utility') {
        throw new Error('This tile cannot be purchased.');
      }
      if (getOwner(state, tile.id)) {
        throw new Error('This property is already owned.');
      }
      if (player.cash < tile.price) {
        throw new Error('Insufficient funds to buy this property.');
      }

      player.cash -= tile.price;
      player.properties = [...player.properties, tile.id];
      state.pendingPurchase = undefined;
      state.phase = 'waiting_for_end_turn';
      appendLog(state, `${player.name} acquires ${tile.name} for ${tile.price} credits.`);
      return state;
    }
    case 'END_TURN': {
      const player = requireTurn(state, action.actorId);

      if (state.phase !== 'waiting_for_purchase' && state.phase !== 'waiting_for_end_turn') {
        throw new Error('Turn cannot end right now.');
      }

      if (state.phase === 'waiting_for_purchase' && state.pendingPurchase?.playerId === player.id) {
        appendLog(state, `${player.name} passes on ${getTileById(state, state.pendingPurchase.tileId).name}.`);
        state.pendingPurchase = undefined;
      }

      advanceToNextPlayer(state);
      checkForWinner(state);
      return state;
    }
  }
}

export function getAvailableActions(state: GameState, playerId: string) {
  const player = getPlayer(state, playerId);
  const currentPlayer = getCurrentPlayer(state);

  if (!player || player.bankrupt || currentPlayer.id !== playerId || state.phase === 'game_over') {
    return [] as string[];
  }

  const actions: string[] = [];

  if (state.phase === 'waiting_for_roll') {
    actions.push('ROLL_DICE');
    if (player.inJail && player.cash >= JAIL_BAIL) {
      actions.push('PAY_BAIL');
    }
  }

  if (state.phase === 'waiting_for_purchase' && state.pendingPurchase?.playerId === playerId) {
    const tile = getTileById(state, state.pendingPurchase.tileId);
    if ((tile.type === 'property' || tile.type === 'utility') && player.cash >= tile.price) {
      actions.push('BUY_PROPERTY');
    }
    actions.push('END_TURN');
  }

  if (state.phase === 'waiting_for_end_turn') {
    actions.push('END_TURN');
  }

  return actions;
}

export function serializePublicState(state: GameState): PublicGameState {
  return {
    phase: state.phase,
    turn: state.turn,
    currentPlayerId: getCurrentPlayer(state)?.id,
    players: state.players.map((player) => ({ ...player, properties: [...player.properties] })),
    board: state.board.map((tile) => ({ ...tile, ownerId: getOwner(state, tile.id)?.id })),
    freeParkingPot: state.freeParkingPot,
    winnerId: state.winnerId,
    lastRoll: state.lastRoll,
    pendingPurchase: state.pendingPurchase ? { ...state.pendingPurchase } : undefined,
    extraTurnPending: state.extraTurnPending,
    log: [...state.log]
  };
}
