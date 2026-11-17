import { Server as IOServer } from 'socket.io'
import { GameEngine, PlayerId, ActionType } from '@shadow-hunters/shared'
import { broadcastGameState } from './game.js'

const BOT_THINK_MS = 1500
const activeBotTurns = new Set<string>()

export function setupBotHandling(io: IOServer, games: Map<string, GameEngine>) {
  const timer = setInterval(async () => {
    for (const [lobbyId, engine] of games) {
      if (engine.state.gameOver || activeBotTurns.has(lobbyId)) continue
      const turnPlayerId = engine.state.turnPlayerId
      if (!turnPlayerId) continue
      const player = engine.state.players.get(turnPlayerId)
      if (!player || !player.isBot) continue
      activeBotTurns.add(lobbyId)
      try {
        await playBotTurn(io, engine, player, () => games.get(lobbyId) === engine)
      } catch (error) {
        console.error(`Erreur bot ${player.name}:`, error)
      } finally {
        activeBotTurns.delete(lobbyId)
      }
    }
  }, BOT_THINK_MS)
  timer.unref?.()
}

async function playBotTurn(
  io: IOServer,
  engine: GameEngine,
  bot: { id: PlayerId; state: string; location: string | null; isBot: boolean },
  isCurrentGame: () => boolean,
) {
  const lobbyId = engine.state.id.replace('game_', '')
  const room = `game:${lobbyId}`
  const botPlayerFull = engine.state.players.get(bot.id)
  const botHpLeft = botPlayerFull ? botPlayerFull.maxDamage - botPlayerFull.damage : 0
  if (bot.state === 'hidden' && botHpLeft < 3) {
    try { engine.revealCharacter(bot.id); await broadcastGameState(io, engine, lobbyId) } catch {}
  }

  if (!engine.canExecute(bot.id, ActionType.RollDie)) return
  const { roll } = engine.rollDie(bot.id)
  await broadcastGameState(io, engine, lobbyId)
  io.to(room).emit('game:events', { events: [{ type: 'roll', timestamp: Date.now(), actor: bot.id, data: { roll } }] })
  await wait()
  if (!isCurrentGame() || engine.state.gameOver) return
  if (roll === 7 && engine.canExecute(bot.id, ActionType.ChooseArea)) {
    const areas = Array.from(engine.state.areas.keys())
    engine.chooseArea(bot.id, areas[Math.floor(Math.random() * areas.length)])
    await broadcastGameState(io, engine, lobbyId)
  }
  await wait()
  if (!isCurrentGame() || engine.state.gameOver) return
  if (engine.canExecute(bot.id, ActionType.UseAreaAction)) {
    const areaId = engine.state.players.get(bot.id)?.location
    if (areaId === 'weird_woods') {
      const targets = Array.from(engine.state.players.values()).filter((p) => p.id !== bot.id && p.state !== 'dead')
      if (targets.length && Math.random() >= 0.5) engine.useAreaAction(bot.id, targets[Math.floor(Math.random() * targets.length)].id)
      else engine.useAreaAction(bot.id)
    } else if (areaId === 'erstwhile_altar') {
      const targets = Array.from(engine.state.players.values()).filter((p) => p.id !== bot.id && p.state !== 'dead')
      if (targets.length) engine.useAreaAction(bot.id, targets[Math.floor(Math.random() * targets.length)].id)
      else engine.declineAreaAction(bot.id)
    } else if (areaId === 'underworld_gate') {
      const choices = ['white', 'black', 'hermit']
      engine.useAreaAction(bot.id, undefined, choices[Math.floor(Math.random() * choices.length)])
    } else engine.useAreaAction(bot.id)
    await broadcastGameState(io, engine, lobbyId)
  } else if (engine.canExecute(bot.id, ActionType.DeclineAreaAction)) {
    engine.declineAreaAction(bot.id)
    await broadcastGameState(io, engine, lobbyId)
  }
  await wait()
  if (!isCurrentGame() || engine.state.gameOver) return
  if (engine.canExecute(bot.id, ActionType.AttackPlayer)) {
    const botPlayer = engine.state.players.get(bot.id)
    const pairedArea = botPlayer?.location ? engine.state.areaPairs.get(botPlayer.location as any) : undefined
    const botCid = engine.state.characterAssignments.get(bot.id)
    const botChar = botCid ? engine.state.charactersPool.find((c) => c.id === botCid) : null
    const targets = Array.from(engine.state.players.values()).filter((target) => {
      if (target.id === bot.id || target.state === 'dead') return false
      if (!(target.location === botPlayer?.location || (pairedArea !== undefined && target.location === pairedArea))) return false
      if (botPlayer?.state === 'revealed' && target.state === 'revealed') {
        const targetCid = engine.state.characterAssignments.get(target.id)
        const targetChar = targetCid ? engine.state.charactersPool.find((c) => c.id === targetCid) : null
        if (targetChar && botChar && targetChar.allegiance === botChar.allegiance) return false
      }
      return true
    })
    if (targets.length) engine.attackPlayer(bot.id, targets[Math.floor(Math.random() * targets.length)].id)
    else engine.declineAttack(bot.id)
    await broadcastGameState(io, engine, lobbyId)
  } else if (engine.canExecute(bot.id, ActionType.DeclineAttack)) {
    engine.declineAttack(bot.id)
    await broadcastGameState(io, engine, lobbyId)
  }
  await wait()
  if (!isCurrentGame() || engine.state.gameOver) return
  if (engine.canExecute(bot.id, ActionType.EndTurn)) {
    engine.endTurn(bot.id)
    await broadcastGameState(io, engine, lobbyId)
  }
}

function wait() { return new Promise((resolve) => setTimeout(resolve, BOT_THINK_MS)) }
