import express, { Request, Response } from 'express'
import { createServer } from 'http'
import { Server as IOServer, Socket } from 'socket.io'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import { rateLimit } from 'express-rate-limit'
import * as z from 'zod'
import { authenticateSession } from './auth.js'
import { handleLobbyEvents } from './lobby.js'
import { handleGameEvents } from './game.js'

export const prisma = new PrismaClient()

const PORT = Number(process.env.PORT || 3001)
const LOBBY_PASSWORD = process.env.LOBBY_PASSWORD || 'EDGAR'
const SESSION_SECRET = process.env.SESSION_SECRET || 'changez-moi'
const PUBLIC_URL = process.env.PUBLIC_URL || ''
const NODE_ENV = process.env.NODE_ENV || 'development'

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
const joinSchema = z.object({
  password: z.string().min(1),
  displayName: z.string().min(1).max(32),
})

app.post('/api/join', authLimiter, async (req: Request, res: Response) => {
  const result = joinSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: 'Données invalides', details: result.error.flatten() })
  }

  const { password, displayName } = result.data
  if (password !== LOBBY_PASSWORD) {
    return res.status(401).json({ error: 'Mot de passe incorrect' })
  }

  const normalized = displayName.trim().toLowerCase()
  if (!normalized || normalized.length < 2) {
    return res.status(400).json({ error: 'Pseudo trop court (2 caractères minimum)' })
  }

  const reserved = ['shadow', 'hunter', 'neutral', 'decline', 'cpu', 'bot']
  if (reserved.includes(normalized)) {
    return res.status(400).json({ error: 'Pseudo réservé' })
  }

  let lobby = await prisma.lobby.findFirst()
  if (!lobby) {
    lobby = await prisma.lobby.create({
      data: { status: 'LOBBY', passwordHash: LOBBY_PASSWORD },
    })
  }

  const existing = await prisma.lobbyPlayer.findFirst({
    where: { lobbyId: lobby.id, userId: normalized },
  })
  if (existing) {
    return res.status(409).json({ error: 'Ce pseudo est déjà pris' })
  }

  const playerCount = await prisma.lobbyPlayer.count({
    where: { lobbyId: lobby.id },
  })
  if (playerCount >= 9) {
    return res.status(403).json({ error: 'Le lobby est complet (9 places maximum)' })
  }

  const colors = ['#F5F5F5', '#646464', '#4FB64E', '#3E63AB', '#C561A3', '#DB3E3E', '#F9EA30', '#EF882B', '#9B59B6']
  const player = await prisma.lobbyPlayer.create({
    data: {
      lobbyId: lobby.id,
      userId: normalized,
      displayName: displayName.trim(),
      number: playerCount + 1,
      color: colors[playerCount] ?? '#FFFFFF',
      isHost: playerCount === 0,
    },
  })

  const token = crypto.randomBytes(32).toString('hex')
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
    players: lobby.players.map((p) => ({
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

io.use(authenticateSession)
io.on('connection', (socket: Socket) => {
  handleLobbyEvents(io, socket)
  handleGameEvents(io, socket)
})

httpServer.listen(PORT, () => {
  console.log(`Shadow Hunters server listening on port ${PORT}`)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  httpServer.close()
  process.exit(0)
})