export type TileType =
  | 'go'
  | 'property'
  | 'utility'
  | 'tax'
  | 'chance'
  | 'community'
  | 'jail'
  | 'go_to_jail'
  | 'free_parking';

export type PropertyGroup =
  | 'teal'
  | 'indigo'
  | 'rose'
  | 'amber'
  | 'emerald'
  | 'gold'
  | 'utility';

export type GamePhase =
  | 'waiting_for_roll'
  | 'waiting_for_purchase'
  | 'waiting_for_end_turn'
  | 'game_over';

export type CardDeckType = 'chance' | 'community';

export interface TileBase {
  id: string;
  position: number;
  name: string;
  description: string;
}

export interface SimpleTile extends TileBase {
  type: 'go' | 'jail' | 'go_to_jail' | 'free_parking';
}

export interface PropertyTile extends TileBase {
  type: 'property' | 'utility';
  price: number;
  baseRent: number;
  group: PropertyGroup;
}

export interface TaxTile extends TileBase {
  type: 'tax';
  amount: number;
}

export interface DeckTile extends TileBase {
  type: 'chance' | 'community';
}

export type BoardTile = SimpleTile | PropertyTile | TaxTile | DeckTile;

export interface GamePlayerInput {
  id: string;
  name: string;
  token: string;
  isBot?: boolean;
}

export interface GamePlayer {
  id: string;
  name: string;
  token: string;
  cash: number;
  position: number;
  properties: string[];
  bankrupt: boolean;
  inJail: boolean;
  jailTurns: number;
  jailFreeCards: number;
  consecutiveDoubles: number;
  isBot: boolean;
}

export type CardEffect =
  | { kind: 'money'; amount: number; description: string }
  | { kind: 'move'; position: number; description: string; collectGo?: boolean }
  | { kind: 'move_relative'; steps: number; description: string }
  | { kind: 'go_to_jail'; description: string }
  | { kind: 'jail_free'; description: string }
  | { kind: 'repairs'; amount: number; description: string };

export interface CardDefinition {
  id: string;
  deck: CardDeckType;
  title: string;
  effect: CardEffect;
}

export interface DeckState {
  order: string[];
  cursor: number;
}

export interface GameLogEntry {
  id: string;
  turn: number;
  text: string;
  timestamp: number;
}

export interface PendingPurchase {
  playerId: string;
  tileId: string;
}

export interface GameState {
  seed: number;
  phase: GamePhase;
  turn: number;
  currentPlayerIndex: number;
  players: GamePlayer[];
  board: BoardTile[];
  chanceDeck: DeckState;
  communityDeck: DeckState;
  freeParkingPot: number;
  winnerId?: string;
  lastRoll?: [number, number];
  pendingPurchase?: PendingPurchase;
  extraTurnPending: boolean;
  log: GameLogEntry[];
}

export type GameAction =
  | { type: 'ROLL_DICE'; actorId: string; dice: [number, number] }
  | { type: 'BUY_PROPERTY'; actorId: string }
  | { type: 'END_TURN'; actorId: string }
  | { type: 'PAY_BAIL'; actorId: string };

export type PublicBoardTile = BoardTile & {
  ownerId?: string;
};

export interface PublicGameState {
  phase: GamePhase;
  turn: number;
  currentPlayerId?: string;
  players: GamePlayer[];
  board: PublicBoardTile[];
  freeParkingPot: number;
  winnerId?: string;
  lastRoll?: [number, number];
  pendingPurchase?: PendingPurchase;
  extraTurnPending: boolean;
  log: GameLogEntry[];
}
