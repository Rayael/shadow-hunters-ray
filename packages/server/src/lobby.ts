import type { Server as IOServer, Socket } from 'socket.io'
import { getSocketPlayer, getSocketSession } from './auth.js'
import { createId, getPlayer, lobby, publicLobby, sessions, sessionsByToken } from './store.js'

const COLORS = ['#F5F5F5', '#646464', '#4FB64E', '#3E63AB', '#C561A3', '#DB3E3E', '#F9EA30', '#EF882B', '#9B59B6']
const BOT_NAMES = ['Bernard le coquin', 'Skull Kingounet', 'Sarkozy', 'Bismillah', 'Kaèr Ache !', 'Macron', 'Michel Forever', 'Gertrude']

export function handleLobbyEvents(io: IOServer, socket: Socket) {
  const player = getSocketPlayer(socket)
  const session = getSocketSession(socket)
  if (!player || !session) return

  socket.join(`lobby:${session.lobbyId}`)
  if (lobby.status === 'GAME') socket.join(`game:${session.lobbyId}`)

  function broadcastLobby() {
    io.to(`lobby:${session.lobbyId}`).emit('lobby:sync', publicLobby())
  }
  broadcastLobby()

  socket.on('lobby:add_bot', () => {
    if (!player.isHost) return socket.emit('lobby:error', { error: 'Seul l’hôte peut ajouter un bot' })
    if (lobby.players.length >= 9) return socket.emit('lobby:error', { error: 'Lobby complet' })
    const number = lobby.players.length + 1
    lobby.players.push({
      id: createId(), userId: `cpu_${number}`, displayName: BOT_NAMES[number - 1] ?? `CPU_${number}`,
      number, color: COLORS[number - 1] ?? '#FFFFFF', isBot: true, isHost: false,
    })
    broadcastLobby()
  })

  socket.on('lobby:remove_bot', (data: { userId?: string } = {}) => {
    if (!player.isHost) return socket.emit('lobby:error', { error: 'Seul l’hôte peut retirer un bot' })
    const index = lobby.players.findIndex((candidate) => candidate.userId === data.userId && candidate.isBot)
    if (index >= 0) lobby.players.splice(index, 1)
    lobby.players.sort((a, b) => a.number - b.number).forEach((candidate, i) => { candidate.number = i + 1 })
    broadcastLobby()
  })

  socket.on('lobby:set_host', (data: { userId?: string } = {}) => {
    if (!player.isHost) return
    const selected = data.userId ? getPlayer(data.userId) : undefined
    if (!selected || selected.isBot) return socket.emit('lobby:error', { error: 'Joueur introuvable' })
    lobby.hostId = selected.userId
    lobby.players.forEach((candidate) => { candidate.isHost = candidate.id === selected.id })
    broadcastLobby()
  })

  socket.on('lobby:chat', (data: { text?: string } = {}) => {
    const text = (data.text || '').trim().slice(0, 500)
    if (text) io.to(`lobby:${session.lobbyId}`).emit('lobby:chat', { from: player.displayName, text, at: new Date().toISOString() })
  })

  socket.on('disconnect', () => {
    session.connected = false
    session.socketId = null
    if (player.isHost) {
      const next = lobby.players.find((candidate) => !candidate.isBot && candidate.id !== player.id &&
        Array.from(sessions.values()).some((candidateSession) => candidateSession.playerId === candidate.id && candidateSession.connected))
      if (next) {
        lobby.hostId = next.userId
        lobby.players.forEach((candidate) => { candidate.isHost = candidate.id === next.id })
      }
    }
    broadcastLobby()
  })
}
