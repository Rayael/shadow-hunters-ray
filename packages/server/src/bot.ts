import { Server as IOServer, Socket } from 'socket.io'
import { GameEngine } from '../shared/src/index.js'
import { prisma } from './index.js'
import { getSocketPlayer, getSocketSession } from './auth.js'

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

      // Le bot a déjà joué ou est en train de jouer : on skip
      const socketId = player.socketId
      if (!socketId) continue

      try {
        await playBotTurn(io, engine, player)
      } catch (err) {
        console.error(`Erreur bot ${player.name}:`, err)
      }
    }
  }, BOT_THINK_MS)
}

async function playBotTurn(io: IOServer, engine: GameEngine, bot: any) {
  const { canExecute } = engine

  // 1. Révélation au début du tour (aléatoire selon progression)
  if (bot.state === 'hidden' && Math.random() < 0.3) {
    if (canExecute(bot.id, 'reveal')) {
      engine.revealCharacter(bot.id)
      io.to(`game:${engine.state.id.replace('game_', '')}`).emit('game:state', {
        public: engine.getPublicView(),
      })
    }
  }

  // 2. Lancer le dé
  if (canExecute(bot.id, 'roll_die')) {
    const { roll } = engine.rollDie(bot.id)
    io.to(`game:${engine.state.id.replace('game_', '')}`).emit('game:state', {
      public: engine.getPublicView(),
    })
    io.to(`game:${engine.state.id.replace('game_', '')}`).emit('game:events', {
      events: [{ type: 'roll', timestamp: Date.now(), actor: bot.id, data: { roll } }],
    })

    // Attendre un peu pour simuler la réflexion
    await new Promise((r) => setTimeout(r, BOT_THINK_MS))

    // 3. Si 7, choisir une zone aléatoire
    if (roll === 7 && canExecute(bot.id, 'choose_area')) {
      const areas = Array.from(engine.state.areas.keys())
      const areaId = areas[Math.floor(Math.random() * areas.length)]
      engine.chooseArea(bot.id, areaId)
      io.to(`game:${engine.state.id.replace('game_', '')}`).emit('game:state', {
        public: engine.getPublicView(),
      })
    }

    await new Promise((r) => setTimeout(r, BOT_THINK_MS))

    // 4. Action de lieu (si disponible)
    if (canExecute(bot.id, 'use_area_action')) {
      engine.useAreaAction(bot.id)
      io.to(`game:${engine.state.id.replace('game_', '')}`).emit('game:state', {
        public: engine.getPublicView(),
      })
    } else if (canExecute(bot.id, 'decline_area_action')) {
      engine.declineAreaAction(bot.id)
      io.to(`game:${engine.state.id.replace('game_', '')}`).emit('game:state', {
        public: engine.getPublicView(),
      })
    }

    await new Promise((r) => setTimeout(r, BOT_THINK_MS))

    // 5. Attaque (si disponible et cible sur même zone)
    if (canExecute(bot.id, 'attack_player')) {
      const botPlayer = engine.state.players.get(bot.id)
      const targets = Array.from(engine.state.players.values()).filter(
        (p) => p.id !== bot.id && p.state !== 'dead' && p.location === botPlayer?.location
      )
      if (targets.length > 0) {
        const target = targets[Math.floor(Math.random() * targets.length)]
        engine.attackPlayer(bot.id, target.id)
        io.to(`game:${engine.state.id.replace('game_', '')}`).emit('game:state', {
          public: engine.getPublicView(),
        })
      } else {
        // Pas de cible, on passe
        engine.declineAttack(bot.id)
        io.to(`game:${engine.state.id.replace('game_', '')}`).emit('game:state', {
          public: engine.getPublicView(),
        })
      }
    } else if (canExecute(bot.id, 'decline_attack')) {
      engine.declineAttack(bot.id)
      io.to(`game:${engine.state.id.replace('game_', '')}`).emit('game:state', {
        public: engine.getPublicView(),
      })
    }

    await new Promise((r) => setTimeout(r, BOT_THINK_MS))

    // 6. Fin de tour
    if (canExecute(bot.id, 'end_turn')) {
      engine.endTurn(bot.id)
      io.to(`game:${engine.state.id.replace('game_', '')}`).emit('game:state', {
        public: engine.getPublicView(),
      })
    }
  }
}