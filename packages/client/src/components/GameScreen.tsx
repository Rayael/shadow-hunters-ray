import { useEffect } from 'react'

export default function GameScreen({
  player,
  public: publicState,
  private: privateView,
  socket,
  onAction,
  onReconnect,
  onRulesOpen,
}: {
  player: any
  public: any
  private: any
  socket: any
  onAction: (data: { type: string; payload: any }) => void
  onReconnect: () => void
  onRulesOpen: () => void
}) {
  useEffect(() => {
    if (socket && publicState?.phase === 'turn_start' && publicState.turnPlayerId === player.userId) {
      // C'est le tour du joueur
    }
  }, [publicState, socket, player.userId])

  const isMyTurn = publicState?.turnPlayerId === player.userId
  const myNumber = publicState?.players.find((p: any) => p.id === player.userId)?.number
  const myPublic = publicState?.players.find((p: any) => p.id === player.userId)
  const isRevealed = myPublic?.state === 'revealed'

  return (
    <div className="game-screen">
      <header className="game-header">
        <h1>Shadow Hunters</h1>
        <button onClick={onRulesOpen}>Règles</button>
        <span className="turn-indicator">
          {isMyTurn ? 'Votre tour' : `Tour du joueur ${publicState?.turnPlayerNumber}`}
        </span>
      </header>

      <div className="game-body">
        <aside className="players-panel">
          <h2>Joueurs</h2>
          {publicState?.players.map((p: any) => (
            <div key={p.id} className={`player-card ${p.state === 'dead' ? 'dead' : ''} ${p.id === player.userId ? 'me' : ''}`}>
              <span className="chip" style={{ backgroundColor: p.color }}>{p.number}</span>
              <strong>{p.name}</strong>{p.isBot ? ' (bot)' : ''}
              <div className="health">Dégâts: {p.damage}{p.maxDamage ? `/${p.maxDamage}` : ''}</div>
              <div className="state">État: {p.state === 'hidden' ? 'Secret' : p.state === 'revealed' ? 'Révélé' : 'Mort'}</div>
              <div className="character">
                {p.character?.revealed || p.id === player.userId
                  ? `Personnage: ${p.character?.name || '?'}`
                  : 'Personnage: secret'}
              </div>
              <div className="equipment">
                Équipements: {p.equipment.map((e: any) => e.title).join(', ') || '—'}
              </div>
            </div>
          ))}
        </aside>

        <main className="board-area">
          <div className="board">
            {publicState?.areas.map((area: any) => (
              <div key={area.id} className="area">
                <div className="area-name">{area.name}</div>
                <div className="area-domain">Dé: {area.domain.join(', ')}</div>
                <div className="area-players">
                  {area.playersHere.map((pid: any) => {
                    const pl = publicState.players.find((p: any) => p.id === pid)
                    return <span key={pid} className="pion" style={{ backgroundColor: pl?.color }}>{pl?.number}</span>
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="my-character">
            <h3>Votre personnage</h3>
            {privateView?.character ? (
              <div>
                <strong>{privateView.character.name}</strong> ({privateView.character.allegiance})
                <div>{privateView.character.winConditionDesc}</div>
              </div>
            ) : (
              <div>Chargement du personnage…</div>
            )}
          </div>
          <div className="actions-panel">
            <h3>Actions disponibles</h3>
            {publicState?.availableActions.map((a: any) => (
              <button key={a} onClick={() => handleAction(a)} disabled={!isMyTurn && a !== 'reveal'}>
                {labelAction(a)}
              </button>
            ))}
            {!isRevealed && (
              <button onClick={() => onAction({ type: 'reveal', payload: {} })}>Révéler son identité</button>
            )}
            {publicState?.gameOver && (
              <div className="game-over">
                Partie terminée ! Gagnants: {publicState.winners.join(', ')}
              </div>
            )}
          </div>

          <div className="log">
            <h3>Journal</h3>
            <div className="log-entries">
              {publicState?.eventLog.slice(-10).map((e: any, i: number) => (
                <div key={i} className="log-entry">{e.type}</div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )

  function handleAction(type: string) {
    if (type === 'roll_die') {
      onAction({ type: 'roll_die', payload: {} })
    } else if (type === 'end_turn') {
      onAction({ type: 'end_turn', payload: {} })
    } else if (type === 'reveal') {
      onAction({ type: 'reveal', payload: {} })
    } else if (type === 'decline_attack') {
      onAction({ type: 'decline_attack', payload: {} })
    } else if (type === 'decline_area_action') {
      onAction({ type: 'decline_area_action', payload: {} })
    }
  }

  function labelAction(type: string): string {
    const labels: Record<string, string> = {
      roll_die: 'Lancer le dé',
      choose_area: 'Choisir une zone',
      use_area_action: 'Action du lieu',
      decline_area_action: 'Refuser le lieu',
      attack_player: 'Attaquer',
      decline_attack: 'Refuser l\'attaque',
      end_turn: 'Fin de tour',
      reveal: 'Révéler son identité',
    }
    return labels[type] || type
  }
}