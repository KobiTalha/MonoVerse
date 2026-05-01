# MonoVerse

MonoVerse is a premium, real-time, Monopoly-inspired multiplayer platform built as a production-style monorepo. It combines a deterministic shared game engine, a server-authoritative Socket.io backend, and a polished Next.js client tuned for modern multiplayer play.

## Features

- Deterministic game engine with dice, turns, rent, jail, cards, taxes, and bankruptcy
- Server-authoritative multiplayer with room codes, lobby flow, ready states, AI seats, and reconnect support
- Premium dark-mode game UI with animated board tokens, dice, live event feed, and responsive layout
- Shared workspace architecture for frontend, backend, engine, and reusable UI primitives
- Unit coverage for core engine rules and room lifecycle behavior

## Architecture

```text
monoverse/
  apps/
    web/           Next.js App Router client
    server/        Express + Socket.io realtime server
  packages/
    game-engine/   Pure deterministic gameplay logic
    ui/            Reusable UI primitives
```

```text
Browser Client
  └─ Socket.io client
       └─ MonoVerse Server
            ├─ Lobby / room authority
            ├─ Reconnect session handling
            ├─ Dice generation + action validation
            └─ Shared game engine reducer
                  └─ Public state snapshot / delta sync
```

## Tech Stack

- Frontend: `Next.js`, `React`, `Zustand`, `Framer Motion`
- Backend: `Node.js`, `Express`, `Socket.io`
- Shared logic: `TypeScript`, `Vitest`
- Deployment: `Vercel` for `apps/web`, `Render` or `Railway` for `apps/server`

## Screenshots

- `docs/screenshots/lobby.png` — placeholder
- `docs/screenshots/game-board.png` — placeholder
- `docs/screenshots/mobile-view.png` — placeholder

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy:

- `apps/web/.env.example` → `apps/web/.env.local`
- `apps/server/.env.example` → `apps/server/.env`

### 3. Run the server

```bash
npm run dev:server
```

### 4. Run the web app

```bash
npm run dev:web
```

Frontend runs on `http://localhost:3000` and the websocket server runs on `http://localhost:4001`.

## Game Rules Included

- Turn-based dice flow with doubles and extra turns
- Property acquisition and group-based rent multipliers
- Utility rent scaling from dice totals
- Jail lockup, bail, and third-roll release handling
- Chance and community-style card effects
- Bankruptcy detection and winner resolution

## Deployment

### Frontend on Vercel

1. Import the repository into Vercel.
2. Set the root directory to `apps/web`.
3. Add:
   - `NEXT_PUBLIC_SERVER_URL=https://your-server-domain`
4. Deploy.

### Backend on Render

1. Create a new web service from the repository.
2. Use `apps/server/Dockerfile`.
3. Set:
   - `PORT=4001`
   - `CLIENT_ORIGIN=https://your-vercel-domain`
   - `ROOM_CAPACITY=4`
4. Deploy and copy the public URL into Vercel.

### Backend on Railway

Use the same environment variables and deploy `apps/server`. Railway works well with the Dockerfile or direct Node build commands.

## Testing

```bash
npm run test
```

Current automated coverage focuses on:

- engine purchase and rent logic
- jail handling
- bankruptcy resolution
- room start flow
- reconnect behavior

## Git Workflow

Initialize and create clean milestone commits:

```bash
git init
git add .
git commit -m "chore: initialize MonoVerse project"
```

Recommended progression:

```bash
feat: setup Next.js frontend structure
feat: implement core game engine module
feat: add WebSocket multiplayer system
feat: implement lobby and room system
feat: add dice roll and turn logic
feat: build game board UI
feat: add animations and polish
fix: handle multiplayer sync edge cases
```

## Notes

- The server is authoritative for gameplay actions to reduce cheating risk.
- The client stores `sessionId` and `roomCode` locally to support reconnects.
- The shared engine is UI-agnostic and can power bots, tests, or future native clients.
