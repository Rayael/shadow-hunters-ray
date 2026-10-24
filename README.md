# Shadow Hunters — Version web multijoueur

Application web temps réel du jeu de plateau Shadow Hunters, pour un groupe privé d'amis.

## Stack

- **Front-end** : React 18, TypeScript, Vite, Socket.IO Client
- **Serveur** : Node.js, TypeScript, Express, Socket.IO, Prisma, PostgreSQL
- **Moteur de règles** : package partagé `@shadow-hunters/shared` (TypeScript, indépendant de l'interface)
- **Tests** : Vitest (unitaires), Playwright (parcours navigateur)
- **Déploiement** : Render ou Railway

## Structure

`packages/shared/` : moteur de règles — `packages/server/` : serveur Node — `packages/client/` : React Vite

## Installation locale

1. `npm install` (à la racine)
2. `cp .env.example .env` puis adapter (jamais de commit du `.env`)
3. `cd packages/server && npx prisma generate && npx prisma migrate dev --name init`
4. Deux terminaux : `npm run server:dev` et `npm run client:dev`
5. Tests : `npm run test:all` ; E2E : `npm run test:e2e`

Variables clés : `PORT`, `SESSION_SECRET`, `LOBBY_PASSWORD`, `DATABASE_URL`, `PUBLIC_URL`, `NODE_ENV`.

## Déploiement Render

1. Web Service Node depuis GitHub.
2. Base PostgreSQL Render, lier `DATABASE_URL`.
3. Build : `npm install && npm run server:build && npx prisma migrate deploy`
4. Start : `npm run server:start`
5. Variables d'environnement : `DATABASE_URL`, `SESSION_SECRET`, `LOBBY_PASSWORD`, `PUBLIC_URL`, `NODE_ENV=production`.
6. Vérifier `/healthz` retourne `{ "status": "ok" }`.

## Déploiement Railway

1. Projet Railway depuis GitHub, ajouter PostgreSQL.
2. Même variables d'environnement. Start : `npm run server:start`.

## Sauvegarde PostgreSQL

`pg_dump $DATABASE_URL > backup.sql` ; `psql $DATABASE_URL < backup.sql`.

## Fonctionnalités

Lobby unique (max 9), mot de passe côté serveur, session cookie HttpOnly, numéro+couleur par ordre d'arrivée, hôte = premier arrivé (bots, démarrage), 4-8 joueurs, factions officielles, moteur autoritaire, vues filtrées (secrets protégés), bots heuristiques, reconnexion, journal, chat, panneau règles, endpoint santé, tests Vitest + Playwright.

## Limites

Certaines capacités spéciales et victoires Neutres sont simplifiées ; déploiement à valider sur Render/Railway.
