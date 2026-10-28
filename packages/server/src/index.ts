import { createHash, randomBytes } from 'crypto'
import { createServer } from 'http'
import express, { Request, Response } from 'express'
import { Server as IOServer, Socket } from 'socket.io'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { rateLimit } from 'express-rate-limit'
import { authenticateSession } from './auth.js'
import { handleLobbyEvents } from './lobby.js'
import { handleGameEvents, games } from './game.js'
import {
  validatePassword,
  validateName,
  validateLobbyCapacity,
  validateUniqueName,
  normalizeName,
} from './validation.js'
import { setupBotHandling } from './bot.js'

export const prisma = new PrismaClient()

const PORT = Number(process.env.PORT || 3001)
const LOBBY_PASSWORD = process.env.LOBBY_PASSWORD || 'EDGAR'
const SESSION_SECRET = process.env.SESSION_SECRET || 'changez-moi'
const PUBLIC_URL = process.env.PUBLIC_URL || ''
const NODE_ENV = process.env.NODE_ENV || 'development'

function hashPassword(pw: string): string {
  return createHash('sha256').update(pw).digest('hex')
}

const app = express()
const httpServer = createServer(app)
const io = new IOServer(httpServer, {
  cors: { origin: PUBLIC_URL ? [PUBLIC_URL] : true, credentials: true },
  allowEIO3: true,
})

app.use(express.json())
app.use(cookieParser(SESSION_SECRET))
app.use(cors({
  origin: PUBLIC_URL ? [PUBLIC_URL] : true,
  credentials: true,
}))

app.set('trust proxy', 1)

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de tentatives de connexion. Réessayez plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.get('/healthz', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// En production, servir le frontend buildé depuis le serveur
if (NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../client/dist')
  app.use(express.static(clientDist))
}

app.post('/api/join', authLimiter, async (req: Request, res: Response) => {
  const { password, displayName } = req.body

  // Validation du mot de passe
  const pwCheck = validatePassword(password, LOBBY_PASSWORD)
  if (!pwCheck.ok) {
    return res.status(401).json({ error: pwCheck.error })
  }

  // Validation du pseudo
  const nameCheck = validateName(displayName)
  if (!nameCheck.ok) {
    return res.status(400).json({ error: nameCheck.error })
  }
  const normalized = nameCheck.normalized

  let lobby = await prisma.lobby.findFirst()
  if (!lobby) {
    lobby = await prisma.lobby.create({
      data: { status: 'LOBBY', passwordHash: hashPassword(LOBBY_PASSWORD) },
    })
  }

  // Purger le lobby s'il n'y a plus aucune session connectée (stale)
  const activeCount = await prisma.session.count({
    where: { lobbyId: lobby.id, connected: true },
  })
  if (activeCount === 0) {
    await prisma.session.deleteMany({ where: { lobbyId: lobby.id } })
    await prisma.game.deleteMany({ where: { lobbyId: lobby.id } })
    await prisma.lobbyPlayer.deleteMany({ where: { lobbyId: lobby.id } })
    await prisma.lobby.update({ where: { id: lobby.id }, data: { status: 'LOBBY', hostId: null } })
  }

  // Nettoyer les joueurs humains déconnectés si le lobby est plein
  const connectedSessions = await prisma.session.findMany({
    where: { lobbyId: lobby.id, connected: true },
    select: { playerId: true },
  })
  const connectedIds = new Set(connectedSessions.map((s) => s.playerId))
  const allPlayersNow = await prisma.lobbyPlayer.findMany({ where: { lobbyId: lobby.id } })
  if (allPlayersNow.length >= 9) {
    const toRemove = allPlayersNow.filter((p) => !p.isBot && !connectedIds.has(p.id))
    for (const p of toRemove) {
      await prisma.lobbyPlayer.delete({ where: { id: p.id } })
    }
  }

  // Vérifier doublon de pseudo (normalisé) : réutiliser si déconnecté
  let existing = await prisma.lobbyPlayer.findFirst({
    where: { lobbyId: lobby.id, userId: normalized },
  })
  if (existing) {
    const activeSession = await prisma.session.findFirst({
      where: { playerId: existing.id, connected: true },
    })
    if (activeSession) {
      return res.status(409).json({ error: 'Ce pseudo est déjà utilisé par un joueur connecté' })
    }
    await prisma.session.deleteMany({ where: { playerId: existing.id } })
  }

  // Vérifier capacité (max 9)
  const playerCount = await prisma.lobbyPlayer.count({
    where: { lobbyId: lobby.id },
  })
  const capacityCheck = validateLobbyCapacity(playerCount, 9)
  if (!capacityCheck.ok) {
    return res.status(403).json({ error: capacityCheck.error })
  }

  // Déterminer si un hôte est actuellement connecté
  const hostConnected = await prisma.session.findFirst({
    where: { lobbyId: lobby.id, connected: true, player: { isHost: true } },
  })
  const isHost = playerCount === 0 || !hostConnected

  const colors = ['#F5F5F5', '#646464', '#4FB64E', '#3E63AB', '#C561A3', '#DB3E3E', '#F9EA30', '#EF882B', '#9B59B6']

  let player
  if (existing) {
    player = await prisma.lobbyPlayer.update({
      where: { id: existing.id },
      data: { displayName: displayName.trim(), isHost },
    })
  } else {
    player = await prisma.lobbyPlayer.create({
      data: {
        lobbyId: lobby.id,
        userId: normalized,
        displayName: displayName.trim(),
        number: playerCount + 1,
        color: colors[playerCount] ?? '#FFFFFF',
        isHost: isHost,
      },
    })
  }

  if (isHost) {
    await prisma.lobby.update({ where: { id: lobby.id }, data: { hostId: normalized } })
  }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const session = await prisma.session.create({
    data: { token, lobbyId: lobby.id, playerId: player.id, expiresAt },
  })

  const isSecure = NODE_ENV === 'production'
  res.cookie('session_token', token, {
    httpOnly: true,
    sameSite: isSecure ? 'strict' : 'lax',
    secure: isSecure,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })

  res.json({
    player: {
      id: player.id, userId: player.userId, displayName: player.displayName,
      number: player.number, color: player.color, isHost: player.isHost, isBot: player.isBot,
    },
    lobby: { id: lobby.id, status: lobby.status, hostId: lobby.hostId },
    token,
  })
})

app.get('/api/lobby', async (_req: Request, res: Response) => {
  const lobby = await prisma.lobby.findFirst({
    include: { players: { orderBy: { number: 'asc' } } },
  })
  if (!lobby) return res.status(404).json({ error: 'Lobby introuvable' })
  res.json({
    id: lobby.id, status: lobby.status, hostId: lobby.hostId,
    players: lobby.players.map((p: { id: string; userId: string; displayName: string; number: number; color: string; isHost: boolean; isBot: boolean }) => ({
      id: p.id, userId: p.userId, displayName: p.displayName,
      number: p.number, color: p.color, isHost: p.isHost, isBot: p.isBot,
    })),
  })
})

app.post('/api/logout', async (req: Request, res: Response) => {
  const token = req.cookies?.session_token
  if (token) {
    await prisma.session.updateMany({ where: { token }, data: { connected: false } })
  }
  res.clearCookie('session_token')
  res.json({ ok: true })
})

// Fallback SPA : à placer après toutes les routes API
if (NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../client/dist')
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

app.get('/api/me', async (req: Request, res: Response) => {
  const token = req.cookies?.session_token
  if (!token) return res.status(401).json({ error: 'Non authentifié' })
  const session = await prisma.session.findUnique({
    where: { token },
    include: { player: true, lobby: true },
  })
  if (!session || session.expiresAt < new Date()) {
    return res.status(401).json({ error: 'Session invalide ou expirée' })
  }
  await prisma.session.update({
    where: { id: session.id },
    data: { connected: true, socketId: null },
  })
  res.json({
    player: {
      id: session.player.id, userId: session.player.userId, displayName: session.player.displayName,
      number: session.player.number, color: session.player.color, isHost: session.player.isHost, isBot: session.player.isBot,
    },
    lobby: { id: session.lobby.id, status: session.lobby.status, hostId: session.lobby.hostId },
    token,
  })
})

io.use(authenticateSession)
io.on('connection', (socket: Socket) => {
  handleLobbyEvents(io, socket)
  handleGameEvents(io, socket)
})

// Gestion automatique des bots (IA heuristique)
setupBotHandling(io, games)

// Démarrage et reprise de partie si existante
async function start() {
  // Tenter de restaurer une partie en cours depuis la DB
  const existingGame = await prisma.game.findFirst({
    where: { lobbyId: 'shadow-hunters' },
    orderBy: { updatedAt: 'desc' },
  })
  if (existingGame) {
    console.log('Partie existante trouvée, restauration…')
    // Le moteur sera recréé à la demande via game:start ou game:reconnect
  }

  httpServer.listen(PORT, () => {
    console.log(`Shadow Hunters server listening on port ${PORT}`)
  })
}

start()

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  httpServer.close()
  process.exit(0)
})