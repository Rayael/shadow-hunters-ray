# Shadow Hunters — current application

This repository contains the current web-based multiplayer version of Shadow Hunters. The active application is the Node.js/TypeScript workspace under `packages/`:

- `packages/client`: React/Vite browser UI for joining, lobby, board, cards, chat, and rules.
- `packages/server`: Express and Socket.IO API, login/session handling, lobby coordination, and bot turn automation.
- `packages/shared`: framework-independent TypeScript rules engine, game entities, cards, areas, characters, and engine tests.

## Run locally

Use Node.js 20 or newer:

```sh
npm install
npm run build
npm run server:start
```

The server serves the built client in production mode. For frontend development, use `npm run client:dev` in another terminal. Configure `LOBBY_PASSWORD`, `SESSION_SECRET`, `PUBLIC_URL`, and `PORT` as needed; `.env.example` lists the variables.

## Storage and deployment note

The active multiplayer server does not connect to a database. Lobby members, sessions, and game state are held in the running Node process. **They are temporary:** a server restart, redeploy, or instance replacement clears the lobby and ends any active game. This is suitable for a single-instance, casual game, but does not support durable game recovery, multiple server instances, or shared state across instances. Environment variables configure the app; they are not a place to store changing player/game data.

Render deploys the Node workspace using `render.yaml`. Set a strong `SESSION_SECRET`, a private `LOBBY_PASSWORD`, and your public app URL in the Render environment settings.

## How a game runs

A host joins the shared lobby, then starts a game for 4–8 players. Missing seats are filled by bots. The shared engine assigns hidden characters and factions, then advances the current player through roll/movement, optional location action, attack or decline, and end turn. Player identities are private until revealed; the server sends each connected player a public view plus that player's own private character/cards. The server validates actions through the engine and broadcasts resulting state over Socket.IO.

## Tests

Run `npm run test:all` for the workspace unit tests. The rules engine tests are the most valuable protection for the game mechanics; the server validation tests cover input rules. A successful build/test run should be performed before deploying a change.
