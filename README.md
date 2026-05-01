<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.io" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
</p>

# MonoVerse

A real-time, multiplayer board game platform inspired by Monopoly — built as a production-grade TypeScript monorepo. MonoVerse pairs a deterministic, shared game engine with a server-authoritative WebSocket backend and a responsive Next.js 16 client.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Key Features](#key-features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Testing](#testing)
- [Game Rules](#game-rules)
- [Design Decisions](#design-decisions)
- [License](#license)

---

## Overview

MonoVerse is structured as a monorepo containing four workspaces:

| Workspace | Path | Role |
|---|---|---|
| **Web Client** | `apps/web` | Next.js 16 App Router frontend with Zustand state and Framer Motion animations |
| **Game Server** | `apps/server` | Express + Socket.io realtime server (server-authoritative) |
| **Game Engine** | `packages/game-engine` | Pure, deterministic gameplay reducer — shared between client and server |
| **UI Primitives** | `packages/ui` | Reusable design-system components (`AccentButton`, `Surface`, `StatusPill`, etc.) |

The engine is completely UI-agnostic and can drive bots, tests, or alternative clients without modification.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                Browser Client               │
│  Next.js 16 · Zustand · Framer Motion       │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │        Socket.io Transport          │    │
│  └────────────────┬────────────────────┘    │
└───────────────────┼─────────────────────────┘
                    │ WebSocket
┌───────────────────┼─────────────────────────┐
│                   ▼                         │
│          MonoVerse Server                   │
│  Express · Socket.io · Session Manager      │
│                                             │
│  ├── Lobby / Room Authority                 │
│  ├── Reconnect Session Handling             │
│  ├── Dice Generation + Action Validation    │
│  └── Shared Game Engine Reducer             │
│        └── State Snapshot / Delta Sync      │
└─────────────────────────────────────────────┘
```

All gameplay mutations flow through the server. The client receives either full state snapshots or incremental deltas — never computing game logic independently. This architecture prevents cheating and ensures consistent state across all connected players.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Zustand, Framer Motion |
| Backend | Node.js, Express 5, Socket.io 4 |
| Shared Logic | TypeScript 5.9, Pure functional reducer |
| Testing | Vitest |
| Deployment | Vercel (web), Render / Railway (server) |
| Monorepo | npm workspaces |

---

## Key Features

### Multiplayer
- Room-based matchmaking with shareable room codes
- Lobby system with ready states and host controls
- AI bot seats for solo or partial lobbies
- Automatic session persistence and reconnect support

### Game Engine
- Deterministic reducer pattern — identical inputs always produce identical outputs
- Full Monopoly rule coverage: dice, turns, rent, jail, cards, taxes, bankruptcy
- Group-based rent multipliers and utility scaling from dice totals
- Chance and Community card decks with shuffle seeding

### Frontend
- 11×11 CSS Grid board with active tile and player highlights
- Tile-by-tile token animation (~300–500ms per step) with eased transitions
- Dice roll animation with settle behavior and input lockout
- Server-synced action panel — only valid turn actions are enabled
- Dark-mode palette with 8px spacing system and micro-interactions
- Responsive layout for desktop and mobile viewports

---

## Project Structure

```
monoverse/
├── apps/
│   ├── web/                    # Next.js 16 App Router client
│   │   ├── src/
│   │   │   ├── app/            # Root layout, page, global styles
│   │   │   ├── components/     # Game board, dice display, player roster
│   │   │   ├── lib/            # Board layout mapping, type contracts
│   │   │   └── store/          # Zustand state management
│   │   ├── next.config.mjs
│   │   └── package.json
│   │
│   └── server/                 # Express + Socket.io server
│       ├── src/                # Server entry, room manager, socket handlers
│       ├── tests/              # Server integration tests
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   ├── game-engine/            # Pure deterministic game logic
│   │   ├── src/
│   │   │   ├── index.ts        # Core reducer, state serialization
│   │   │   ├── types.ts        # Game state type definitions
│   │   │   ├── board.ts        # Board tile definitions and constants
│   │   │   ├── cards.ts        # Chance and Community card decks
│   │   │   ├── ai.ts           # Bot decision logic
│   │   │   └── utils.ts        # Shuffle, ID generation utilities
│   │   └── tests/              # Engine unit tests
│   │
│   └── ui/                     # Shared UI primitive components
│       └── src/
│           └── index.tsx        # AccentButton, GhostButton, Surface, etc.
│
├── vercel.json                 # Vercel deployment configuration
├── render.yaml                 # Render deployment blueprint
├── tsconfig.base.json          # Shared TypeScript configuration
└── package.json                # Root workspace configuration
```

---

## Getting Started

### Prerequisites

- **Node.js** 20.x or later
- **npm** 10.x or later

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
# Web client
cp apps/web/.env.example apps/web/.env.local

# Game server
cp apps/server/.env.example apps/server/.env
```

| Variable | Location | Default |
|---|---|---|
| `NEXT_PUBLIC_SERVER_URL` | `apps/web/.env.local` | `http://localhost:4001` |
| `PORT` | `apps/server/.env` | `4001` |
| `CLIENT_ORIGIN` | `apps/server/.env` | `http://localhost:3000` |
| `ROOM_CAPACITY` | `apps/server/.env` | `4` |

### 3. Start the game server

```bash
npm run dev:server
```

### 4. Start the web client

```bash
npm run dev:web
```

The client runs on `http://localhost:3000` and connects to the WebSocket server on `http://localhost:4001`.

---

## Deployment

### Frontend → Vercel

The repository includes a `vercel.json` that handles the monorepo build pipeline:

1. Import the repository into [Vercel](https://vercel.com).
2. The root directory should remain `/` (Vercel will use the config from `vercel.json`).
3. Add the environment variable:
   ```
   NEXT_PUBLIC_SERVER_URL=https://your-server-domain.com
   ```
4. Deploy.

Alternatively, deploy via the Vercel CLI:

```bash
npx vercel --prod
```

### Backend → Render

1. Create a new **Web Service** from the repository.
2. Set the Dockerfile path to `apps/server/Dockerfile`.
3. Configure environment variables:
   ```
   PORT=4001
   CLIENT_ORIGIN=https://your-vercel-domain.vercel.app
   ROOM_CAPACITY=4
   ```
4. Deploy and copy the resulting URL into your Vercel project's `NEXT_PUBLIC_SERVER_URL`.

### Backend → Railway

Use the same environment variables. Railway supports both the included Dockerfile and direct Node.js builds from `apps/server`.

---

## Testing

```bash
npm run test
```

Test coverage includes:

- **Engine**: Property purchase and rent calculations, jail handling (doubles escape, third-roll bail, voluntary bail), bankruptcy resolution and winner detection
- **Server**: Room lifecycle (create, join, ready, start), reconnect session restoration, action validation and error handling

---

## Game Rules

| Mechanic | Behavior |
|---|---|
| Dice | Two six-sided dice per roll. Doubles grant an extra turn. Three consecutive doubles send the player to jail. |
| Properties | Unowned tiles can be purchased on landing. Owning a full color group doubles rent. |
| Utilities | Rent scales from the dice total (× 6 multiplier). |
| Jail | Entered via tile, card, or triple doubles. Exit by rolling doubles (up to 3 attempts), paying bail, or using a release card. |
| Cards | Chance and Community decks with money, movement, jail, and repair effects. |
| Taxes | Fixed-amount charges that deposit into the Free Parking pot. |
| Free Parking | Collects accumulated tax and penalty funds. |
| Bankruptcy | Triggered when a player's cash drops below zero. Assets transfer to the creditor (if any). Last player standing wins. |

---

## Design Decisions

- **Server authority**: All game mutations happen server-side to prevent client-side cheating. The client is a rendering layer only.
- **Deterministic reducer**: The game engine is a pure function — `(previousState, action) → nextState`. This enables replay, testing, and future AI training.
- **Session persistence**: `sessionId` and `roomCode` are stored in `localStorage`, enabling automatic reconnection after disconnects or page refreshes.
- **Delta sync**: After the initial snapshot, the server sends minimal deltas instead of full state objects to reduce bandwidth.
- **Monorepo with npm workspaces**: Shared code (engine, UI primitives) lives in `packages/` and is consumed by both `apps/web` and `apps/server` with zero duplication.

---

## License

This project is provided for educational and portfolio purposes.
