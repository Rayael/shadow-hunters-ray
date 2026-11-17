import { createHash, randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import express, { type Request, type Response } from 'express'
import { Server as IOServer, type Socket } from 'socket.io'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { rateLimit } from 'express-rate-limit'
import { authenticateSession } from './auth.js'
import { handleLobbyEvents } from './lobby.js'
import { handleGameEvents, games } from './game.js'
import { setupBotHandling } from './bot.js'
import { validatePassword, validateName, validateLobbyCapacity } from './validation.js'
import { createId, getPlayer, getPlayerForSession, lobby, publicLobby, removeSession, sessions, sessionsByToken } from './store.js'

const PORT = Number(process.env.PORT || 3001)
const LOBBY_PASSWORD = process.env.LOBBY_PASSWORD || 'EDGAR'
const SESSION_SECRET = process.env.SESSION_SECRET || 'changez-moi'
const PUBLIC_URL = process.env.PUBLIC_URL || ''
const NODE_ENV = process.env.NODE_ENV || 'development'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}
void hashPassword // Retain the helper for deployments that configure a password hash externally.

const app = express()
const httpServer = createServer(app)
const io = new IOServer(httpServer, { cors: { origin: PUBLIC_URL ? [PUBLIC_URL] : true, credentials: true }, allowEIO3: true })
app.use(express.json())
app.use(cookieParser(SESSION_SECRET))
app.use(cors({ origin: PUBLIC_URL ? [PUBLIC_URL] : true, credentials: true }))
app.set('trust proxy', 1)

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Trop de tentatives de connexion. Réessayez plus tard.' }, standardHeaders: true, legacyHeaders: false })
app.get('/healthz', (_req: Request, res: Response) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

if (NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../client/dist')
  app.use(express.static(clientDist))
}

app.post('/api/join', authLimiter, (req: Request, res: Response) => {
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const displayName = typeof req.body?.displayName === 'string' ? req.body.displayName : ''
  const passwordCheck = validatePassword(password, LOBBY_PASSWORD)
  if (!passwordCheck.ok) return res.status(401).json({ error: passwordCheck.error })
  const nameCheck = validateName(displayName)
  if (!nameCheck.ok) return res.status(400).json({ error: nameCheck.error })

  let player = getPlayer(nameCheck.normalized)
  const existingSession = player && Array.from(sessions.values()).find((candidate) => candidate.playerId === player!.id && candidate.connected && candidate.expiresAt > new Date())
  if (existingSession) return res.status(409).json({ error: 'Ce pseudo est déjà utilisé par un joueur connecté' })
  if (lobby.status === 'GAME' && !player) return res.status(403).json({ error: 'Une partie est déjà en cours' })
  if (!player) {
    const capacity = validateLobbyCapacity(lobby.players.length, 9)
    if (!capacity.ok) return res.status(403).json({ error: capacity.error })
    const isHost = !lobby.hostId || !Array.from(sessions.values()).some((candidate) => candidate.connected && getPlayerForSession(candidate)?.isHost)
    player = {
      id: createId(), userId: nameCheck.normalized, displayName: displayName.trim(),
      number: lobby.players.length + 1, color: COLORS[lobby.players.length] ?? '#FFFFFF', isBot: false, isHost,
    }
    lobby.players.push(player)
    if (isHost) lobby.hostId = player.userId
  } else {
    player.displayName = displayName.trim()
  }

  const token = randomBytes(32).toString('hex')
  const session = { id: createId(), token, lobbyId: lobby.id, playerId: player.id, socketId: null, connected: false, expiresAt: new Date(Date.now() + 60 * 60 * 1000) }
  sessions.set(session.id, session)
  sessionsByToken.set(token, session)
  const secure = NODE_ENV === 'production'
  res.cookie('session_token', token, { httpOnly: true, sameSite: secure ? 'strict' : 'lax', secure, path: '/', maxAge: 60 * 60 * 1000 })
  res.json({ player: { ...player }, lobby: publicLobby(), token })
})

app.get('/api/lobby', (_req: Request, res: Response) => res.json(publicLobby()))
app.post('/api/logout', (req: Request, res: Response) => {
  const token = req.cookies?.session_token
  const session = typeof token === 'string' ? sessionsByToken.get(token) : undefined
  if (session) removeSession(session)
  res.clearCookie('session_token', { path: '/' })
  res.json({ ok: true })
})
app.get('/api/me', (req: Request, res: Response) => {
  const token = req.cookies?.session_token
  const session = typeof token === 'string' ? sessionsByToken.get(token) : undefined
  if (!session || session.expiresAt < new Date()) {
    if (session) removeSession(session)
    return res.status(401).json({ error: 'Session invalide ou expirée' })
  }
  const player = getPlayerForSession(session)
  if (!player) return res.status(401).json({ error: 'Joueur introuvable' })
  session.expiresAt = new Date(Date.now() + 60 * 60 * 1000)
  res.json({ player: { ...player }, lobby: publicLobby(), token })
})

if (NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../client/dist')
  app.get('*', (_req: Request, res: Response) => res.sendFile(path.join(clientDist, 'index.html')))
}

io.use(authenticateSession)
io.on('connection', (socket: Socket) => {
  handleLobbyEvents(io, socket)
  handleGameEvents(io, socket)
})
setupBotHandling(io, games)

httpServer.listen(PORT, () => console.log(`Shadow Hunters server listening on port ${PORT} (in-memory state)`))

process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0))
})

const COLORS = ['#F5F5F5', '#646464', '#4FB64E', '#3E63AB', '#C561A3', '#DB3E3E', '#F9EA30', '#EF882B', '#9B59B6']
