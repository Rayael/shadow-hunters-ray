import type { Server as IOServer, Socket } from 'socket.io'
import { ActionType, GameEngine, type PlayerId } from '@shadow-hunters/shared'
import { getSocketPlayer, getSocketSession } from './auth.js'
import { lobby, sessions } from './store.js'

const games = new Map<string, GameEngine>()
export { games }

// State lives in memory; no database or disk persistence is required.
export async function saveGameState(_lobbyId: string, _engine: GameEngine) {}

export async function broadcastGameState(io: IOServer, engine: GameEngine, lobbyId: string) {
  for (const session of sessions.values()) {
    if (session.lobbyId !== lobbyId || !session.connected || !session.socketId) continue
    const player = lobby.players.find((candidate) => candidate.id === session.playerId)
    const pid = (player?.userId ?? null) as PlayerId | null
    io.to(session.socketId).emit('game:state', { public: engine.getPublicView(pid) })
    if (pid) {
      const privateView = engine.getPrivateView(pid)
      if (privateView) io.to(session.socketId).emit('game:private', { private: privateView })
    }
  }
}

export function handleGameEvents(io: IOServer, socket: Socket) {
  const player = getSocketPlayer(socket)
  const session = getSocketSession(socket)
  if (!player || !session) return
  socket.join(`game:${session.lobbyId}`)

  socket.on('game:chat', (data: { text?: string } = {}) => {
    const text = (data.text || '').trim().slice(0, 500)
    if (text) io.to(`game:${session.lobbyId}`).emit('game:chat', { from: player.displayName, text, at: new Date().toISOString() })
  })

  socket.on('game:end', () => {
    if (!player.isHost) return
    games.delete(session.lobbyId)
    lobby.status = 'LOBBY'
    lobby.players = lobby.players.filter((candidate) => !candidate.isBot)
    lobby.players.sort((a, b) => a.number - b.number).forEach((candidate, i) => { candidate.number = i + 1 })
    io.to(`game:${session.lobbyId}`).emit('game:ended')
    io.to(`lobby:${session.lobbyId}`).emit('game:ended')
    io.to(`lobby:${session.lobbyId}`).emit('lobby:sync', {
      id: lobby.id, status: lobby.status, hostId: lobby.hostId,
      players: lobby.players.map((candidate) => ({ ...candidate })),
    })
  })

  socket.on('game:start', async (data: { playerCount?: number; botCount?: number } = {}) => {
    if (!player.isHost) return socket.emit('game:error', { error: 'Seul l’hôte peut démarrer la partie' })
    if (games.has(session.lobbyId)) return socket.emit('game:error', { error: 'Une partie est déjà en cours' })
    const totalPlayers = Number(data.playerCount)
    if (!Number.isInteger(totalPlayers) || totalPlayers < 4 || totalPlayers > 8) {
      return socket.emit('game:error', { error: 'Nombre de joueurs invalide (4-8)' })
    }
    const humans = lobby.players.filter((candidate) => !candidate.isBot)
    if (totalPlayers < humans.length || totalPlayers < lobby.players.length) {
      return socket.emit('game:error', { error: 'Le nombre choisi est inférieur au nombre de joueurs actuels' })
    }
    while (lobby.players.length < totalPlayers) {
      const number = lobby.players.length + 1
      lobby.players.push({
        id: `bot_${number}_${Date.now()}`, userId: `cpu_${number}`,
        displayName: BOT_NAMES[number - 1] ?? `CPU_${number}`, number,
        color: COLORS[number - 1] ?? '#FFFFFF', isBot: true, isHost: false,
      })
    }
    const engine = GameEngine.createGame(`game_${session.lobbyId}`, lobby.players.map((candidate) => ({
      id: candidate.userId as PlayerId, name: candidate.displayName, number: candidate.number,
      color: candidate.color, isBot: candidate.isBot,
    })))
    games.set(session.lobbyId, engine)
    lobby.status = 'GAME'
    engine.assignCharacters()
    await broadcastGameState(io, engine, session.lobbyId)
    io.to(`game:${session.lobbyId}`).emit('game:log', { type: 'message', text: 'La partie a commencé !' })
    io.to(`lobby:${session.lobbyId}`).emit('lobby:sync', {
      id: lobby.id, status: lobby.status, hostId: lobby.hostId,
      players: lobby.players.map((candidate) => ({ ...candidate })),
    })
  })

  socket.on('game:action', async (data: { type?: string; payload?: any } = {}) => {
    const engine = games.get(session.lobbyId)
    if (!engine) return socket.emit('game:error', { error: 'Aucune partie en cours' })
    const actorId = player.userId as PlayerId
    const payload = data.payload ?? {}
    try {
      let result: any
      switch (data.type) {
        case 'roll_die': result = engine.rollDie(actorId); break
        case 'choose_area': result = engine.chooseArea(actorId, payload.areaId); break
        case 'use_area_action': result = engine.useAreaAction(actorId, payload.targetId, payload.choice); break
        case 'use_card': result = engine.useCard(actorId, payload.cardId, payload.targetId); break
        case 'use_special': result = engine.useSpecial(actorId, payload.targetId); break
        case 'decline_area_action': result = engine.declineAreaAction(actorId); break
        case 'attack_player': result = engine.attackPlayer(actorId, payload.targetId); break
        case 'decline_attack': result = engine.declineAttack(actorId); break
        case 'end_turn': result = engine.endTurn(actorId); break
        case 'reveal': result = engine.revealCharacter(actorId); break
        default: return socket.emit('game:error', { error: `Action inconnue: ${data.type}` })
      }
      await broadcastGameState(io, engine, session.lobbyId)
      if (result.events?.length) io.to(`game:${session.lobbyId}`).emit('game:events', { events: result.events })
    } catch (error) {
      socket.emit('game:error', { error: error instanceof Error ? error.message : 'Action impossible' })
    }
  })

  socket.on('game:reconnect', async () => {
    const engine = games.get(session.lobbyId)
    if (!engine) return
    const pid = player.userId as PlayerId
    socket.emit('game:state', { public: engine.getPublicView(pid) })
    const privateView = engine.getPrivateView(pid)
    if (privateView) socket.emit('game:private', { private: privateView })
  })

  socket.on('disconnect', () => {
    session.connected = false
    session.socketId = null
  })
}

const COLORS = ['#F5F5F5', '#646464', '#4FB64E', '#3E63AB', '#C561A3', '#DB3E3E', '#F9EA30', '#EF882B', '#9B59B6']
const BOT_NAMES = ['Bernard le coquin', 'Skull Kingounet', 'Sarkozy', 'Bismillah', 'Kaèr Ache !', 'Macron', 'Michel Forever', 'Gertrude']
