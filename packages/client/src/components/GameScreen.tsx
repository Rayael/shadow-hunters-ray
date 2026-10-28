import { useState, useEffect } from 'react'

function formatEvent(e: any, players: any[]): string {
  const name = (id: string) => players?.find((p: any) => p.id === id)?.name || id
  switch (e.type) {
    case 'message':
      return e.data?.text || 'Message'
    case 'roll':
      return `${name(e.actor)} lance le dé : ${e.data?.roll}${e.data?.area ? ' → ' + e.data.area : ''}`
    case 'move':
      return `${name(e.data?.playerId || e.actor)} se déplace vers ${e.data?.areaId}`
    case 'damage':
      return `${name(e.data?.attacker || e.actor)} inflige ${e.data?.amount} dégât(s) à ${name(e.data?.target)}`
    case 'death':
      return `${name(e.data?.target)} est mort`
    case 'reveal':
      return `${name(e.actor)} révèle son personnage (${e.data?.character || ''})`
    case 'card_used':
      return `${name(e.actor)} utilise ${e.data?.card}`
    case 'turn_start':
      return `Tour de ${name(e.data?.turnPlayerId || e.actor)}`
    case 'attack':
      return `${name(e.actor)} attaque ${name(e.data?.target)}`
    default:
      return e.type
  }
}
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
  const [selectedTarget, setSelectedTarget] = useState<string>('')

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
          {isMyTurn && (
            <div className="actions-panel">
              <h3>Actions disponibles</h3>
              {publicState?.availableActions.includes('roll_die') && (
                <button onClick={() => onAction({ type: 'roll_die', payload: {} })}>Lancer le dé</button>
              )}
              {publicState?.availableActions.includes('choose_area') && (
                <div>
                  <p>Choisir un lieu :</p>
                  {publicState?.areas?.map((a: any) => (
                    <button key={a.id} onClick={() => onAction({ type: 'choose_area', payload: { areaId: a.id } })}>
                      {a.name}
                    </button>
                  ))}
                </div>
              )}
              {publicState?.availableActions.includes('use_area_action') && (
                <div>
                  <button onClick={() => onAction({ type: 'use_area_action', payload: { targetId: selectedTarget || undefined } })}>
                    Utiliser l'action du lieu
                  </button>
                  <select value={selectedTarget} onChange={(e) => setSelectedTarget(e.target.value)}>
                    <option value="">(aucune cible)</option>
                    {publicState?.players
                      ?.filter((p: any) => p.id !== player.userId && p.state !== 'dead')
                      .map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name || p.id}</option>
                      ))}
                  </select>
                </div>
              )}
              {publicState?.availableActions.includes('decline_area_action') && (
                <button onClick={() => onAction({ type: 'decline_area_action', payload: {} })}>Refuser le lieu</button>
              )}
              {publicState?.availableActions.includes('attack_player') && (
                <div>
                  <p>Attaquer :</p>
                  {publicState?.players
                    ?.filter((p: any) => p.id !== player.userId && p.state !== 'dead' && p.location === myPublic?.location)
                    .map((p: any) => (
                      <button key={p.id} onClick={() => onAction({ type: 'attack_player', payload: { targetId: p.id } })}>
                        {p.name || p.id}
                      </button>
                    ))}
                </div>
              )}
              {publicState?.availableActions.includes('decline_attack') && (
                <button onClick={() => onAction({ type: 'decline_attack', payload: {} })}>Refuser l'attaque</button>
              )}
              {publicState?.availableActions.includes('end_turn') && (
                <button onClick={() => onAction({ type: 'end_turn', payload: {} })}>Fin de tour</button>
              )}
              {!isRevealed && (
                <button onClick={() => onAction({ type: 'reveal', payload: {} })}>Révéler son identité</button>
              )}
            </div>
          )}
          {!isMyTurn && !isRevealed && (
            <div className="actions-panel">
              <button onClick={() => onAction({ type: 'reveal', payload: {} })}>Révéler son identité</button>
            </div>
          )}
          {publicState?.gameOver && (
            <div className="game-over">
              Partie terminée ! Gagnants: {publicState.winners.join(', ')}
            </div>
          )}

          <div className="log">
            <h3>Journal</h3>
            <div className="log-entries">
              {publicState?.eventLog.slice(-15).map((e: any, i: number) => (
                <div key={i} className="log-entry">{formatEvent(e, publicState?.players)}</div>
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