import { Server as IOServer, Socket } from 'socket.io'
import { GameEngine, PlayerId, ActionType } from '@shadow-hunters/shared'
import { prisma } from './index.js'
import { getSocketPlayer, getSocketSession } from './auth.js'

const games = new Map<string, GameEngine>()

export { games }

export async function saveGameState(lobbyId: string, engine: GameEngine) {
  const data = {
    status: engine.state.phase,
    round: engine.state.round,
    turnPlayerId: engine.state.turnPlayerId ?? null,
    currentRoll: engine.state.currentRoll ?? null,
    gameOver: engine.state.gameOver,
    stateJson: JSON.parse(JSON.stringify(engine.state)) as any,
    updatedAt: new Date(),
  }
  const existing = await prisma.game.findFirst({ where: { lobbyId } })
  if (existing) {
    await prisma.game.update({ where: { id: existing.id }, data })
  } else {
    await prisma.game.create({ data: { lobbyId, ...data } })
  }
}

export async function broadcastGameState(io: IOServer, engine: GameEngine, lobbyId: string) {
  const sessions = await prisma.session.findMany({
    where: { lobbyId, connected: true },
    include: { player: true },
  })
  for (const s of sessions) {
    if (!s.socketId) continue
    const pid = (s.player?.userId ?? null) as PlayerId | null
    io.to(s.socketId).emit('game:state', { public: engine.getPublicView(pid) })
    if (pid) {
      const pv = engine.getPrivateView(pid)
      if (pv) io.to(s.socketId).emit('game:private', { private: pv })
    }
  }
}
export function handleGameEvents(io: IOServer, socket: Socket) {
  const player = getSocketPlayer(socket)
  const session = getSocketSession(socket)
  if (!player || !session) return

  socket.join(`game:${session.lobbyId}`)

  function getEngine(): GameEngine | undefined {
    return games.get(session.lobbyId)
  }

  async function saveState(engine: GameEngine) {
    await saveGameState(session.lobbyId, engine)
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

    if (totalPlayers < humans.length) {
      socket.emit('game:error', { error: 'Trop de joueurs humains pour ce nombre total' })
      return
    }

    const toCreate = totalPlayers - lobbyPlayers.length
    if (toCreate > 0) {
      const colors = ['#F5F5F5', '#646464', '#4FB64E', '#3E63AB', '#C561A3', '#DB3E3E', '#F9EA30', '#EF882B', '#9B59B6']
      for (let i = 0; i < toCreate; i++) {
        const botNum = lobbyPlayers.length + i + 1
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

    await broadcastGameState(io, engine, session.lobbyId)

    io.to(`game:${session.lobbyId}`).emit('game:log', {
      type: 'message', text: 'La partie a commencé !',
    })
  })

  socket.on('game:action', async (data: { type: string; payload: any }) => {
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
        case 'use_area_action': result = engine.useAreaAction(actorId, data.payload.targetId); break
        case 'use_card': result = engine.useCard(actorId, data.payload.cardId, data.payload.targetId); break
        case 'use_special': result = engine.useSpecial(actorId, data.payload.targetId); break
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

      await broadcastGameState(io, engine, session.lobbyId)

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