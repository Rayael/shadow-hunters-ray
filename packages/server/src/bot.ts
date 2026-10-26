import { Server as IOServer, Socket } from 'socket.io'
import { GameEngine, PlayerId, ActionType } from '@shadow-hunters/shared'
import { prisma } from './index.js'
import { saveGameState } from './game.js'

const BOT_THINK_MS = 1500

export function setupBotHandling(io: IOServer, games: Map<string, GameEngine>) {
  // Vérifie périodiquement si c'est le tour d'un bot et joue automatiquement
  setInterval(async () => {
    for (const [lobbyId, engine] of games) {
      if (engine.state.gameOver) continue
      const turnPlayerId = engine.state.turnPlayerId
      if (!turnPlayerId) continue

      const player = engine.state.players.get(turnPlayerId)
      if (!player || !player.isBot) continue

      try {
        await playBotTurn(io, engine, player)
      } catch (err) {
        console.error(`Erreur bot ${player.name}:`, err)
      }
    }
  }, BOT_THINK_MS)
}

async function playBotTurn(io: IOServer, engine: GameEngine, bot: { id: PlayerId; state: string; location: string | null; isBot: boolean }) {
  const { canExecute } = engine
  const lobbyId = engine.state.id.replace('game_', '')
  const room = `game:${lobbyId}`

  if (bot.state === 'hidden' && Math.random() < 0.3) {
    if (canExecute(bot.id, ActionType.Reveal)) {
      engine.revealCharacter(bot.id)
      io.to(room).emit('game:state', { public: engine.getPublicView() })
    }
  }

  if (canExecute(bot.id, ActionType.RollDie)) {
    const { roll } = engine.rollDie(bot.id)
    io.to(room).emit('game:state', { public: engine.getPublicView() })
    io.to(room).emit('game:events', { events: [{ type: 'roll', timestamp: Date.now(), actor: bot.id, data: { roll } }] })

    await new Promise((r) => setTimeout(r, BOT_THINK_MS))

    if (roll === 7 && canExecute(bot.id, ActionType.ChooseArea)) {
      const areas = Array.from(engine.state.areas.keys())
      const areaId = areas[Math.floor(Math.random() * areas.length)]
      engine.chooseArea(bot.id, areaId)
      io.to(room).emit('game:state', { public: engine.getPublicView() })
    }

    await new Promise((r) => setTimeout(r, BOT_THINK_MS))

    if (canExecute(bot.id, ActionType.UseAreaAction)) {
      engine.useAreaAction(bot.id)
      io.to(room).emit('game:state', { public: engine.getPublicView() })
    } else if (canExecute(bot.id, ActionType.DeclineAreaAction)) {
      engine.declineAreaAction(bot.id)
      io.to(room).emit('game:state', { public: engine.getPublicView() })
    }

    await new Promise((r) => setTimeout(r, BOT_THINK_MS))

    if (canExecute(bot.id, ActionType.AttackPlayer)) {
      const botPlayer = engine.state.players.get(bot.id)
      const allPlayers = Array.from(engine.state.players.values())
      const targets = allPlayers.filter(
        (p: { id: PlayerId; state: string; location: string | null }) => p.id !== bot.id && p.state !== 'dead' && p.location === botPlayer?.location
      )
      if (targets.length > 0) {
        const target = targets[Math.floor(Math.random() * targets.length)]
        engine.attackPlayer(bot.id, target.id)
        io.to(room).emit('game:state', { public: engine.getPublicView() })
      } else {
        engine.declineAttack(bot.id)
        io.to(room).emit('game:state', { public: engine.getPublicView() })
      }
    } else if (canExecute(bot.id, ActionType.DeclineAttack)) {
      engine.declineAttack(bot.id)
      io.to(room).emit('game:state', { public: engine.getPublicView() })
    }

    await new Promise((r) => setTimeout(r, BOT_THINK_MS))

    if (canExecute(bot.id, ActionType.EndTurn)) {
      engine.endTurn(bot.id)
      await saveGameState(lobbyId, engine)
      io.to(room).emit('game:state', { public: engine.getPublicView() })
    }
  }
}