import { Server as IOServer, Socket } from 'socket.io'
import { prisma } from './index.js'
import { getSocketPlayer, getSocketSession } from './auth.js'

export function handleLobbyEvents(io: IOServer, socket: Socket) {
  const player = getSocketPlayer(socket)
  const session = getSocketSession(socket)
  if (!player || !session) return

  socket.join(`lobby:${session.lobbyId}`)

  // Diffuser l'état du lobby à tous
  async function broadcastLobby() {
    const lobby = await prisma.lobby.findUnique({
      where: { id: session.lobbyId },
      include: { players: { orderBy: { number: 'asc' } } },
    })
    if (!lobby) return
    io.to(`lobby:${session.lobbyId}`).emit('lobby:sync', {
      id: lobby.id,
      status: lobby.status,
      hostId: lobby.hostId,
      players: lobby.players.map((p) => ({
        id: p.id,
        userId: p.userId,
        displayName: p.displayName,
        number: p.number,
        color: p.color,
        isHost: p.isHost,
        isBot: p.isBot,
      })),
    })
  }

  broadcastLobby()

  socket.on('lobby:add_bot', async () => {
    if (!player.isHost) {
      socket.emit('lobby:error', { error: 'Seul l\'hôte peut ajouter un bot' })
      return
    }
    const count = await prisma.lobbyPlayer.count({
      where: { lobbyId: session.lobbyId },
    })
    if (count >= 9) {
      socket.emit('lobby:error', { error: 'Lobby complet' })
      return
    }
    const botNumber = count + 1
    const colors = ['#F5F5F5', '#646464', '#4FB64E', '#3E63AB', '#C561A3', '#DB3E3E', '#F9EA30', '#EF882B', '#9B59B6']
    await prisma.lobbyPlayer.create({
      data: {
        lobbyId: session.lobbyId,
        userId: `cpu_${botNumber}`,
        displayName: `CPU_${botNumber}`,
        number: botNumber,
        color: colors[botNumber - 1] ?? '#FFFFFF',
        isBot: true,
      },
    })
    await broadcastLobby()
  })

  socket.on('lobby:remove_bot', async (data: { userId: string }) => {
    if (!player.isHost) {
      socket.emit('lobby:error', { error: 'Seul l\'hôte peut retirer un bot' })
      return
    }
    await prisma.lobbyPlayer.deleteMany({
      where: { lobbyId: session.lobbyId, userId: data.userId, isBot: true },
    })
    await broadcastLobby()
  })

  socket.on('lobby:set_host', async (data: { userId: string }) => {
    if (!player.isHost) return
    await prisma.lobby.update({
      where: { id: session.lobbyId },
      data: { hostId: data.userId },
    })
    await prisma.lobbyPlayer.updateMany({
      where: { lobbyId: session.lobbyId },
      data: { isHost: false },
    })
    await prisma.lobbyPlayer.updateMany({
      where: { lobbyId: session.lobbyId, userId: data.userId },
      data: { isHost: true },
    })
    await broadcastLobby()
  })

  socket.on('disconnect', async () => {
    await prisma.session.updateMany({
      where: { id: session.id },
      data: { connected: false, socketId: null },
    })
    await broadcastLobby()
  })
}