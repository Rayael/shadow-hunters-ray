import { describe, it, expect } from 'vitest'
import { GameEngine } from '@shadow-hunters/shared'
import { Phase, PlayerState } from '@shadow-hunters/shared'

function makePlayers(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}` as any,
    name: `Joueur ${i + 1}`,
    number: i + 1,
    color: '#FFFFFF',
    isBot: false,
  }))
}

describe('Client - filtrage des informations secrètes', () => {
  it('la vue publique cache lidentité des personnages non révélés', () => {
    const engine = GameEngine.createGame('g1', makePlayers(4))
    engine.assignCharacters()

    const publicView = engine.getPublicView()
    for (const p of publicView.players) {
      // Aucun personnage ne doit être révélé au départ
      expect(p.character?.revealed).toBe(false)
      // Le nom doit être masqué pour les autres (et pour soi-même aussi au début)
      expect(p.character?.name).toBe('Personnage secret')
    }
  })

  it('la vue privée révèle lidentité au propriétaire', () => {
    const engine = GameEngine.createGame('g1', makePlayers(4))
    engine.assignCharacters()

    const tp = engine.state.turnPlayerId!
    const privateView = engine.getPrivateView(tp)
    expect(privateView).not.toBeNull()
    expect(privateView?.character?.name).not.toBe('Personnage secret')
    expect(privateView?.character?.revealed).toBe(false) // pas encore révélé publiquement
  })

  it('après révélation, la vue publique montre lidentité', () => {
    const engine = GameEngine.createGame('g1', makePlayers(4))
    engine.assignCharacters()

    const tp = engine.state.turnPlayerId!
    engine.revealCharacter(tp)

    const publicView = engine.getPublicView()
    const tpView = publicView.players.find((p) => p.id === tp)
    expect(tpView?.character?.revealed).toBe(true)
    expect(tpView?.character?.name).not.toBe('Personnage secret')
  })

  it('un joueur mort est marqué comme mort dans la vue publique', () => {
    const engine = GameEngine.createGame('g1', makePlayers(4))
    engine.assignCharacters()

    const target = engine.state.turnOrder[1]!
    const p = engine.state.players.get(target)!
    p.state = PlayerState.Dead

    const publicView = engine.getPublicView()
    const targetView = publicView.players.find((p) => p.id === target)
    expect(targetView?.isAlive).toBe(false)
    expect(targetView?.state).toBe(PlayerState.Dead)
  })

  it('la phase de jeu est correctement exposée', () => {
    const engine = GameEngine.createGame('g1', makePlayers(4))
    expect(engine.getPublicView().phase).toBe(Phase.Setup)

    engine.assignCharacters()
    expect(engine.getPublicView().phase).toBe(Phase.TurnStart)
  })
})