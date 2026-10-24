import { describe, it, expect } from 'vitest'
import { GameEngine } from './engine.js'
import { CHARACTERS } from './characters.js'
import { Phase, ActionType, PlayerState, Allegiance } from './types.js'

function makePlayers(n: number, bots: number = 0) {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}` as any,
    name: `Joueur ${i + 1}`,
    number: i + 1,
    color: '#FFFFFF',
    isBot: i < bots,
  }))
}

describe('GameEngine - creation', () => {
  it('crée une partie avec 4 à 8 joueurs', () => {
    for (const n of [4, 5, 6, 7, 8]) {
      const engine = GameEngine.createGame('g1', makePlayers(n))
      expect(engine.state.config.playerCount).toBe(n)
      expect(engine.state.phase).toBe(Phase.Setup)
    }
  })

  it('refuse moins de 4 ou plus de 8 joueurs', () => {
    expect(() => GameEngine.createGame('g1', makePlayers(3))).toThrow()
    expect(() => GameEngine.createGame('g1', makePlayers(9))).toThrow()
  })

  it('attribue les personnages selon les factions officielles', () => {
    const engine = GameEngine.createGame('g1', makePlayers(4))
    const { assignments } = engine.assignCharacters()
    expect(assignments.size).toBe(4)
    expect(engine.state.phase).toBe(Phase.TurnStart)
    expect(engine.state.turnPlayerId).toBeDefined()
  })

  it('refuse l\'attribution en dehors de la phase Setup', () => {
    const engine = GameEngine.createGame('g1', makePlayers(4))
    engine.state.phase = Phase.TurnStart
    expect(() => engine.assignCharacters()).toThrow()
  })
})

describe('GameEngine - actions', () => {
  it('le joueur dont c\'est le tour peut lancer le dé', () => {
    const engine = GameEngine.createGame('g1', makePlayers(4))
    engine.assignCharacters()
    const tp = engine.state.turnPlayerId!
    const { roll } = engine.rollDie(tp)
    expect(roll).toBeGreaterThanOrEqual(1)
    expect(roll).toBeLessThanOrEqual(4)
    expect(engine.state.currentRoll).toBe(roll)
  })

  it('refuse le lancer de dé hors de son tour', () => {
    const engine = GameEngine.createGame('g1', makePlayers(4))
    engine.assignCharacters()
    const tp = engine.state.turnPlayerId!
    const other = engine.state.turnOrder.find((id) => id !== tp)!
    expect(() => engine.rollDie(other)).toThrow()
  })

  it('permet de choisir une zone après un 7', () => {
    const engine = GameEngine.createGame('g1', makePlayers(4))
    engine.assignCharacters()
    const tp = engine.state.turnPlayerId!
    engine.state.currentRoll = 7
    engine.state.availableActions = [ActionType.ChooseArea]
    const areaId = Array.from(engine.state.areas.keys())[0]
    const { events } = engine.chooseArea(tp, areaId)
    expect(engine.state.players.get(tp)?.location).toBe(areaId)
    expect(events.some((e) => e.type === 'move')).toBe(true)
  })

  it('gère les dégâts et la mort', () => {
    const engine = GameEngine.createGame('g1', makePlayers(4))
    engine.assignCharacters()
    const tp = engine.state.turnPlayerId!
    const target = engine.state.turnOrder.find((id) => id !== tp)!
    engine.state.players.get(target)!.damage = 9
    engine.state.players.get(target)!.maxDamage = 10
    engine.state.players.get(tp)!.location = 'zone1' as any
    engine.state.players.get(target)!.location = 'zone1' as any
    engine.state.availableActions = [ActionType.AttackPlayer]
    engine.state.phase = Phase.Attack
    engine.attackPlayer(tp, target)
    expect(engine.state.players.get(target)!.state).toBe(PlayerState.Dead)
  })

  it('révèle un personnage', () => {
    const engine = GameEngine.createGame('g1', makePlayers(4))
    engine.assignCharacters()
    const tp = engine.state.turnPlayerId!
    const { events } = engine.revealCharacter(tp)
    expect(engine.state.players.get(tp)!.state).toBe(PlayerState.Revealed)
    expect(events.some((e) => e.type === 'reveal')).toBe(true)
  })

  it('refuse de révéler un personnage mort', () => {
    const engine = GameEngine.createGame('g1', makePlayers(4))
    engine.assignCharacters()
    const tp = engine.state.turnPlayerId!
    const p = engine.state.players.get(tp)!
    p.state = PlayerState.Dead
    expect(() => engine.revealCharacter(tp)).toThrow()
  })

  it('fin de tour passe au joueur suivant', () => {
    const engine = GameEngine.createGame('g1', makePlayers(4))
    engine.assignCharacters()
    const tp = engine.state.turnPlayerId!
    engine.endTurn(tp)
    expect(engine.state.turnPlayerId).not.toBe(tp)
    expect(engine.state.turnPlayerId).toBe(engine.state.turnOrder[1])
  })
})

describe('GameEngine - vues et sécurité', () => {
  it('donne une vue publique filtrée (identité cachée)', () => {
    const engine = GameEngine.createGame('g1', makePlayers(4))
    engine.assignCharacters()
    const tp = engine.state.turnPlayerId!
    const other = engine.state.turnOrder.find((id) => id !== tp)!
    const publicView = engine.getPublicView()
    const tpView = publicView.players.find((p) => p.id === tp)
    const otherView = publicView.players.find((p) => p.id === other)
    expect(tpView?.character?.revealed).toBe(false)
    expect(otherView?.character?.revealed).toBe(false)
  })

  it('donne une vue privée avec identité au propriétaire', () => {
    const engine = GameEngine.createGame('g1', makePlayers(4))
    engine.assignCharacters()
    const tp = engine.state.turnPlayerId!
    const privateView = engine.getPrivateView(tp)
    expect(privateView?.character?.name).not.toBe('Personnage secret')
  })

  it('canExecute retourne false hors de son tour', () => {
    const engine = GameEngine.createGame('g1', makePlayers(4))
    engine.assignCharacters()
    const tp = engine.state.turnPlayerId!
    const other = engine.state.turnOrder.find((id) => id !== tp)!
    expect(engine.canExecute(other, ActionType.RollDie)).toBe(false)
    expect(engine.canExecute(tp, ActionType.RollDie)).toBe(true)
  })
})

describe('GameEngine - victoire', () => {
  it('détecte la victoire des Chasseurs quand toutes les Ombres sont mortes', () => {
    const engine = GameEngine.createGame('g1', makePlayers(4))
    engine.assignCharacters()
    engine.state.players.forEach((p) => {
      const cid = engine.state.characterAssignments.get(p.id)
      if (cid) {
        const ch = CHARACTERS.find((c) => c.id === cid)
        if (ch?.allegiance === Allegiance.Shadow) {
          p.state = PlayerState.Dead
        }
      }
    })
    const { winners, gameOver } = engine.checkWinConditions()
    expect(gameOver).toBe(true)
    expect(winners.length).toBeGreaterThan(0)
  })

  it('pioche une carte', () => {
    const engine = GameEngine.createGame('g1', makePlayers(4))
    const tp = engine.state.turnOrder[0]
    const { card } = engine.drawCard(tp, 'white')
    expect(card).not.toBeNull()
    expect(card?.holder).toBe(tp)
  })
})