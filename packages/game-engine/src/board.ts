import type { BoardTile } from './types';

export const STARTING_CASH = 1500;
export const PASS_GO_REWARD = 200;
export const JAIL_BAIL = 50;

export const MONOVERSE_BOARD: BoardTile[] = [
  { id: 'launch-pad', position: 0, name: 'Launch Pad', type: 'go', description: 'Collect 200 credits when you pass through.' },
  { id: 'neon-harbor', position: 1, name: 'Neon Harbor', type: 'property', description: 'An oceanfront nightlife district pulsing with holograms.', price: 80, baseRent: 10, group: 'teal' },
  { id: 'citizen-fund', position: 2, name: 'Citizen Fund', type: 'community', description: 'Draw from the city support network.' },
  { id: 'aurora-avenue', position: 3, name: 'Aurora Avenue', type: 'property', description: 'Fashion, galleries, and impossible lighting design.', price: 100, baseRent: 12, group: 'teal' },
  { id: 'quantum-tax', position: 4, name: 'Quantum Tax', type: 'tax', description: 'City infrastructure surcharge.', amount: 100 },
  { id: 'detention-loop', position: 5, name: 'Detention Loop', type: 'jail', description: 'You can visit or spend some time detained here.' },
  { id: 'orbit-station', position: 6, name: 'Orbit Station', type: 'property', description: 'A premium transit hub with luxury concourses.', price: 140, baseRent: 16, group: 'indigo' },
  { id: 'chance-node', position: 7, name: 'Chance Node', type: 'chance', description: 'High-volatility opportunity event.' },
  { id: 'nova-plaza', position: 8, name: 'Nova Plaza', type: 'property', description: 'The skyline centerpiece for late-stage founders.', price: 160, baseRent: 20, group: 'indigo' },
  { id: 'skyline-row', position: 9, name: 'Skyline Row', type: 'property', description: 'High-margin real estate for design-conscious moguls.', price: 190, baseRent: 24, group: 'rose' },
  { id: 'commons-gift', position: 10, name: 'Commons Gift', type: 'free_parking', description: 'Claim the pooled city bonus.' },
  { id: 'flux-utility', position: 11, name: 'Flux Utility', type: 'utility', description: 'Powers the city with renewable fusion grids.', price: 200, baseRent: 28, group: 'utility' },
  { id: 'meridian-mall', position: 12, name: 'Meridian Mall', type: 'property', description: 'Flagship retail for ambitious luxury brands.', price: 230, baseRent: 28, group: 'amber' },
  { id: 'broadcast-square', position: 13, name: 'Broadcast Square', type: 'community', description: 'News travels fast in MonoVerse.' },
  { id: 'halo-heights', position: 14, name: 'Halo Heights', type: 'property', description: 'A cloudline district with elite residences.', price: 250, baseRent: 32, group: 'amber' },
  { id: 'security-sweep', position: 15, name: 'Security Sweep', type: 'go_to_jail', description: 'Teleport directly to Detention Loop.' },
  { id: 'warp-gate', position: 16, name: 'Warp Gate', type: 'chance', description: 'A route-changing anomaly waits here.' },
  { id: 'chromatic-court', position: 17, name: 'Chromatic Court', type: 'property', description: 'Creators, agencies, and premium studios cluster here.', price: 290, baseRent: 38, group: 'emerald' },
  { id: 'circuit-works', position: 18, name: 'Circuit Works', type: 'property', description: 'Industrial intelligence park with strong yield.', price: 320, baseRent: 42, group: 'emerald' },
  { id: 'zenith-tower', position: 19, name: 'Zenith Tower', type: 'property', description: 'The most prestigious address in the city.', price: 380, baseRent: 52, group: 'gold' }
];
