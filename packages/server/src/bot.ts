import { Server as IOServer, Socket } from 'socket.io'
import { GameEngine, PlayerId, ActionType } from '@shadow-hunters/shared'
import { prisma } from './index.js'
import { saveGameState, broadcastGameState } from './game.js'

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
  const lobbyId = engine.state.id.replace('game_', '')
  const room = `game:${lobbyId}`

  if (bot.state === 'hidden' && Math.random() < 0.3) {
    if (engine.canExecute(bot.id, ActionType.Reveal)) {
      engine.revealCharacter(bot.id)
      await broadcastGameState(io, engine, lobbyId)
    }
  }

  if (engine.canExecute(bot.id, ActionType.RollDie)) {
    const { roll } = engine.rollDie(bot.id)
    await broadcastGameState(io, engine, lobbyId)
    io.to(room).emit('game:events', { events: [{ type: 'roll', timestamp: Date.now(), actor: bot.id, data: { roll } }] })

    await new Promise((r) => setTimeout(r, BOT_THINK_MS))

    if (roll === 7 && engine.canExecute(bot.id, ActionType.ChooseArea)) {
      const areas = Array.from(engine.state.areas.keys())
      const areaId = areas[Math.floor(Math.random() * areas.length)]
      engine.chooseArea(bot.id, areaId)
      await broadcastGameState(io, engine, lobbyId)
    }

    await new Promise((r) => setTimeout(r, BOT_THINK_MS))

if (engine.canExecute(bot.id, ActionType.UseAreaAction)) {
      const botPlayer = engine.state.players.get(bot.id)
      const areaId = botPlayer?.location
      if (areaId === 'weird_woods') {
        // sometimes heal, sometimes damage a random player
        if (Math.random() < 0.5) {
          engine.useAreaAction(bot.id)
        } else {
          const targets = Array.from(engine.state.players.values()).filter((p) => p.id !== bot.id && p.state !== 'dead')
          if (targets.length > 0) {
            const t = targets[Math.floor(Math.random() * targets.length)]
            engine.useAreaAction(bot.id, t.id)
          } else {
            engine.useAreaAction(bot.id)
          }
        }
      } else if (areaId === 'erstwhile_altar') {
        const targets = Array.from(engine.state.players.values()).filter((p) => p.id !== bot.id && p.state !== 'dead')
        if (targets.length > 0) {
          const t = targets[Math.floor(Math.random() * targets.length)]
          engine.useAreaAction(bot.id, t.id)
        } else {
          engine.declineAreaAction(bot.id)
        }
      } else if (areaId === 'underworld_gate') {
        const choices = ['white', 'black', 'hermit']
        engine.useAreaAction(bot.id, undefined, choices[Math.floor(Math.random() * choices.length)])
      } else {
        engine.useAreaAction(bot.id)
      }
      await broadcastGameState(io, engine, lobbyId)
    } else if (engine.canExecute(bot.id, ActionType.DeclineAreaAction)) {
      engine.declineAreaAction(bot.id)
      await broadcastGameState(io, engine, lobbyId)
    }

    await new Promise((r) => setTimeout(r, BOT_THINK_MS))

    if (engine.canExecute(bot.id, ActionType.AttackPlayer)) {
      const botPlayer = engine.state.players.get(bot.id)
      const allPlayers = Array.from(engine.state.players.values())
      const pairedArea = botPlayer?.location ? engine.state.areaPairs.get(botPlayer.location as any) : undefined
      const targets = allPlayers.filter(
        (p: { id: PlayerId; state: string; location: string | null }) => p.id !== bot.id && p.state !== 'dead' &&
          (p.location === botPlayer?.location || (pairedArea !== undefined && p.location === pairedArea))
      )
      if (targets.length > 0) {
        const target = targets[Math.floor(Math.random() * targets.length)]
        engine.attackPlayer(bot.id, target.id)
        await broadcastGameState(io, engine, lobbyId)
      } else {
        engine.declineAttack(bot.id)
        await broadcastGameState(io, engine, lobbyId)
      }
    } else if (engine.canExecute(bot.id, ActionType.DeclineAttack)) {
      engine.declineAttack(bot.id)
      await broadcastGameState(io, engine, lobbyId)
    }

    await new Promise((r) => setTimeout(r, BOT_THINK_MS))

    if (engine.canExecute(bot.id, ActionType.EndTurn)) {
      engine.endTurn(bot.id)
      await saveGameState(lobbyId, engine)
      await broadcastGameState(io, engine, lobbyId)
    }
  }
}