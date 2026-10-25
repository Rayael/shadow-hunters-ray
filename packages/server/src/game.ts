import { Server as IOServer, Socket } from 'socket.io'
import { GameEngine, PlayerId, ActionType } from '@shadow-hunters/shared'
import { prisma } from './index.js'
import { getSocketPlayer, getSocketSession } from './auth.js'

const games = new Map<string, GameEngine>()

export { games }

export function handleGameEvents(io: IOServer, socket: Socket) {
  const player = getSocketPlayer(socket)
  const session = getSocketSession(socket)
  if (!player || !session) return

  socket.join(`game:${session.lobbyId}`)

  function getEngine(): GameEngine | undefined {
    return games.get(session.lobbyId)
  }

  async function saveState(engine: GameEngine) {
    await prisma.game.upsert({
      where: { lobbyId: session.lobbyId },
      create: {
        lobbyId: session.lobbyId,
        status: engine.state.phase,
        round: engine.state.round,
        turnPlayerId: engine.state.turnPlayerId ?? null,
        currentRoll: engine.state.currentRoll ?? null,
        gameOver: engine.state.gameOver,
        stateJson: engine.state as any,
      },
      update: {
        status: engine.state.phase,
        round: engine.state.round,
        turnPlayerId: engine.state.turnPlayerId ?? null,
        currentRoll: engine.state.currentRoll ?? null,
        gameOver: engine.state.gameOver,
        stateJson: engine.state as any,
        updatedAt: new Date(),
      },
    })
  }

  socket.on('game:start', async (data: { playerCount: number; botCount: number }) => {
    const p = getSocketPlayer(socket)
    if (!p?.isHost) {
      socket.emit('game:error', { error: 'Seul l\'hôte peut démarrer la partie' })
      return
    }
    if (getEngine()) {
      socket.emit('game:error', { error: 'Une partie est déjà en cours' })
      return
    }

    const totalPlayers = data.playerCount
    if (totalPlayers < 4 || totalPlayers > 8) {
      socket.emit('game:error', { error: 'Nombre de joueurs invalide (4-8)' })
      return
    }

    const lobbyPlayers = await prisma.lobbyPlayer.findMany({
      where: { lobbyId: session.lobbyId },
      orderBy: { number: 'asc' },
    })

    type LobbyPlayerRow = {
      id: string
      userId: string
      displayName: string
      number: number
      color: string
      isBot: boolean
      isHost: boolean
    }

    const humans = lobbyPlayers.filter((lp: LobbyPlayerRow) => !lp.isBot)
    const existingBots = lobbyPlayers.filter((lp: LobbyPlayerRow) => lp.isBot).length
    const neededBots = Math.max(0, totalPlayers - humans.length)

    if (neededBots > data.botCount) {
      socket.emit('game:error', { error: 'Pas assez de bots demandés' })
      return
    }

    const currentCount = lobbyPlayers.length
    for (let i = 0; i < neededBots; i++) {
      const botNum = currentCount + i + 1
      const colors = ['#F5F5F5', '#646464', '#4FB64E', '#3E63AB', '#C561A3', '#DB3E3E', '#F9EA30', '#EF882B', '#9B59B6']
      await prisma.lobbyPlayer.create({
        data: {
          lobbyId: session.lobbyId,
          userId: `cpu_${botNum}`,
          displayName: `CPU_${botNum}`,
          number: botNum,
          color: colors[botNum - 1] ?? '#FFFFFF',
          isBot: true,
        },
      })
    }

    const allPlayers = await prisma.lobbyPlayer.findMany({
      where: { lobbyId: session.lobbyId },
      orderBy: { number: 'asc' },
    }) as LobbyPlayerRow[]
    if (allPlayers.length !== totalPlayers) {
      socket.emit('game:error', { error: 'Le nombre de joueurs ne correspond pas' })
      return
    }
    const engine = GameEngine.createGame(
      `game_${session.lobbyId}`,
      allPlayers.map((lp: LobbyPlayerRow) => ({
        id: lp.userId as PlayerId,
        name: lp.displayName,
        number: lp.number,
        color: lp.color,
        isBot: lp.isBot,
      }))
    )

    games.set(session.lobbyId, engine)

    await prisma.lobby.update({
      where: { id: session.lobbyId },
      data: { status: 'GAME' },
    })

    engine.assignCharacters()
    await saveState(engine)

    const publicView = engine.getPublicView()
    io.to(`game:${session.lobbyId}`).emit('game:state', { public: publicView })

    for (const lp of allPlayers) {
      const privateView = engine.getPrivateView(lp.userId as PlayerId)
      const s = await prisma.session.findFirst({
        where: { playerId: lp.id, connected: true },
      })
      if (s?.socketId && privateView) {
        io.to(s.socketId).emit('game:private', { private: privateView })
      }
    }

    io.to(`game:${session.lobbyId}`).emit('game:log', {
      type: 'message', text: 'La partie a commencé !',
    })
  })

  socket.on('game:action', (data: { type: string; payload: any }) => {
    const engine = getEngine()
    if (!engine) {
      socket.emit('game:error', { error: 'Aucune partie en cours' })
      return
    }

    const p = getSocketPlayer(socket)
    if (!p) {
      socket.emit('game:error', { error: 'Non authentifié' })
      return
    }
    const actorId = p.userId as PlayerId

    try {
      let result: any = null
      switch (data.type) {
        case 'roll_die': result = engine.rollDie(actorId); break
        case 'choose_area': result = engine.chooseArea(actorId, data.payload.areaId); break
        case 'use_area_action': result = engine.useAreaAction(actorId); break
        case 'decline_area_action': result = engine.declineAreaAction(actorId); break
        case 'attack_player': result = engine.attackPlayer(actorId, data.payload.targetId); break
        case 'decline_attack': result = engine.declineAttack(actorId); break
        case 'end_turn': result = engine.endTurn(actorId); break
        case 'reveal': result = engine.revealCharacter(actorId); break
        default:
          socket.emit('game:error', { error: `Action inconnue: ${data.type}` })
          return
      }

      saveState(engine)

      const publicView = engine.getPublicView()
      io.to(`game:${session.lobbyId}`).emit('game:state', { public: publicView })

      if (result.events && result.events.length > 0) {
        io.to(`game:${session.lobbyId}`).emit('game:events', { events: result.events })
      }
    } catch (err: any) {
      socket.emit('game:error', { error: err.message })
    }
  })

  socket.on('game:reconnect', async () => {
    const engine = getEngine()
    if (!engine) return
    const p = getSocketPlayer(socket)
    if (!p) return
    const privateView = engine.getPrivateView(p.userId)
    const publicView = engine.getPublicView(p.userId)
    socket.emit('game:state', { public: publicView })
    if (privateView) socket.emit('game:private', { private: privateView })
    await prisma.session.update({ where: { id: session.id }, data: { socketId: socket.id } })
  })

  socket.on('disconnect', async () => {
    await prisma.session.updateMany({
      where: { id: session.id },
      data: { connected: false, socketId: null },
    })
  })
}