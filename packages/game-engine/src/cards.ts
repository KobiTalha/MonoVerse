import type { CardDefinition } from './types';

export const CHANCE_CARDS: CardDefinition[] = [
  { id: 'chance-advance-go', deck: 'chance', title: 'Fast Lane', effect: { kind: 'move', position: 0, collectGo: true, description: 'Take the fast lane back to Launch Pad.' } },
  { id: 'chance-investor-dividend', deck: 'chance', title: 'Investor Dividend', effect: { kind: 'money', amount: 120, description: 'A strategic investor sends a dividend payout.' } },
  { id: 'chance-detour', deck: 'chance', title: 'Detour', effect: { kind: 'move_relative', steps: -3, description: 'Construction forces a three-space detour.' } },
  { id: 'chance-go-jail', deck: 'chance', title: 'Compliance Hold', effect: { kind: 'go_to_jail', description: 'Regulators freeze your account pending review.' } },
  { id: 'chance-jail-free', deck: 'chance', title: 'Executive Privilege', effect: { kind: 'jail_free', description: 'Bank this card and skip one detention later.' } }
];

export const COMMUNITY_CARDS: CardDefinition[] = [
  { id: 'community-rebate', deck: 'community', title: 'Sustainability Rebate', effect: { kind: 'money', amount: 100, description: 'The city rewards your clean infrastructure upgrades.' } },
  { id: 'community-repair-fee', deck: 'community', title: 'System Repairs', effect: { kind: 'repairs', amount: 40, description: 'Pay maintenance fees across your portfolio.' } },
  { id: 'community-move-meridian', deck: 'community', title: 'VIP Shopping Invite', effect: { kind: 'move', position: 12, description: 'Advance to Meridian Mall for an exclusive launch event.' } },
  { id: 'community-pay-fee', deck: 'community', title: 'Network Fee', effect: { kind: 'money', amount: -80, description: 'A sudden network outage triggers service credits.' } },
  { id: 'community-jail-free', deck: 'community', title: 'Legal Shield', effect: { kind: 'jail_free', description: 'Hold this counsel-backed release card for later.' } }
];

