import { useState, useEffect } from 'react'
import { getAllCards } from '@shadow-hunters/shared'

function formatEvent(e: any, state: any): string {
  const players = state?.players || []
  const areas = state?.areas || []
  const name = (id: string) => players.find((p: any) => p.id === id)?.name || id
  const areaName = (id: string) => areas.find((a: any) => a.id === id)?.name || id
  switch (e.type) {
    case 'message':
      return e.data?.text || 'Message'
    case 'roll':
      if (e.data?.roll === 7) return `${name(e.actor)} lance le dé et fait : 7 (choix de lieu)`
      return `${name(e.actor)} a lancé le dé et fait : ${e.data?.roll}, arrivant au ${e.data?.area || areaName(e.data?.areaId)}`
    case 'move':
      return `${name(e.data?.playerId || e.actor)} se déplace vers ${areaName(e.data?.areaId)}`
    case 'area_action':
      return `${name(e.actor)} utilise l'action de ${e.data?.areaName || areaName(e.data?.areaId)}`
    case 'card_drawn':
      return `${name(e.data?.player || e.actor)} pioche une carte ${e.data?.type || ''} : ${e.data?.card}`
    case 'card_used':
      return e.data?.target
        ? `${name(e.actor)} a utilisé ${e.data?.card} sur ${name(e.data.target)} !`
        : `${name(e.actor)} a utilisé ${e.data?.card} !`
    case 'damage':
      return `${name(e.data?.attacker || e.actor)} inflige ${e.data?.amount} dégât(s) à ${name(e.data?.target)}`
    case 'death':
      return `${name(e.data?.target)} est mort`
    case 'reveal':
      return `${name(e.actor)} révèle son personnage (${e.data?.character || ''})`
    case 'turn_start':
      return `Tour de ${name(e.data?.turnPlayerId || e.actor)}`
    case 'attack':
      return `${name(e.actor)} attaque ${name(e.target || e.data?.target)}`
    case 'interrupt':
      return e.data?.text || 'Interruption'
    case 'equipment_stolen':
      return `${name(e.actor)} vole un équipement à ${name(e.data?.from)}`
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
  const [selectedTarget, setSelectedTarget] = useState<string>('') // retained for compatibility
const [attackChoosing, setAttackChoosing] = useState(false)
const [areaDamageChoosing, setAreaDamageChoosing] = useState(false)
const [areaStealChoosing, setAreaStealChoosing] = useState(false)
const [cardChoosing, setCardChoosing] = useState<string | null>(null)
const isChoosing = attackChoosing || areaDamageChoosing || areaStealChoosing || !!cardChoosing
  const [chatMessages, setChatMessages] = useState<{ from: string; text: string; at: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [hoveredCard, setHoveredCard] = useState<any>(null)
  useEffect(() => {
    setAttackChoosing(false)
    setAreaDamageChoosing(false)
    setAreaStealChoosing(false)
    setCardChoosing(null)
  }, [publicState?.turnPlayerId, publicState?.phase])
  const allCards = getAllCards()

  useEffect(() => {
    if (!socket) return
    const handler = (msg: any) => setChatMessages((prev) => [...prev, msg])
    socket.on('game:chat', handler)
    return () => { socket.off('game:chat', handler) }
  }, [socket])

  const handleSendChat = () => {
    const text = chatInput.trim()
    if (!text || !socket) return
    socket.emit('game:chat', { text })
    setChatInput('')
  }

  return (
    <div className="game-screen">
      <header className="game-header">
        <h1>Shadow Hunters</h1>
        <button onClick={onRulesOpen}>Règles</button>
        {player?.isHost && (
          <button onClick={() => socket.emit('game:end')}>Mettre fin à la partie</button>
        )}
        <span className="turn-indicator">
          {isMyTurn ? 'Votre tour' : `Tour du joueur ${publicState?.turnPlayerNumber}`}
        </span>
      </header>

      <div className="game-body">
        <aside className="players-panel">
          <h2>Joueurs</h2>
          {publicState?.players.map((p: any) => (
            <div key={p.id} className={`player-card ${p.state === 'dead' ? 'dead' : ''} ${p.id === player.userId ? 'me' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 8, marginBottom: 8 }}>
              <span className="chip" style={{ backgroundColor: p.color, marginRight: 8, marginLeft: 2 }}>{p.number}</span>
              <strong style={{ color: (p.character?.revealed || p.id === player.userId) ? (p.character?.allegiance === 'shadow' ? '#ff6b6b' : p.character?.allegiance === 'hunter' ? '#4cc9f0' : '#f9c74f') : undefined }}>
                {p.name}
              </strong>{p.isBot ? ' (bot)' : ''}
              <div className="health">Dégâts: {p.damage}{p.maxDamage ? `/${p.maxDamage}` : ''}</div>
              <div className="state">État: {p.state === 'hidden' ? 'Secret' : p.state === 'revealed' ? 'Révélé' : 'Mort'}</div>
              <div className="character">
                {p.character?.revealed || p.id === player.userId
                  ? `Personnage: ${p.character?.name || '?'}${p.character?.revealed ? ' — Spécial: ' + (p.character?.specialDesc || '') : ''}`
                  : 'Personnage: secret'}
              </div>
              <div className="equipment">
                Équipements: {p.equipment.map((c: any, i: number) => (
                  <span
                    key={c.id}
                    className="card-link"
                    onMouseEnter={() => setHoveredCard(allCards.find((x: any) => x.id === c.id) || c)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    {i > 0 ? ', ' : ''}{c.title}
                  </span>
                )) || '—'}
              </div>
            </div>
          ))}
          <div className="chat-box">
          <h3>Chat</h3>
          <div className="chat-messages">
            {chatMessages.map((m, i) => (
              <div key={i} className="chat-message">
                <strong>{m.from}:</strong> {m.text}
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input
              type="text"
              placeholder="Message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat() }}
            />
            <button onClick={handleSendChat}>Envoyer</button>
          </div>
        </div>
      </aside>

        <main className="board-area">
          <div className="board">
            {(publicState?.areaPairs || []).map((pair: any, idx: number) => {
              const ids = Array.isArray(pair) ? pair : [pair[0], pair[1]]
              const areas = ids.map((id: string) => publicState?.areas?.find((a: any) => a.id === id)).filter(Boolean)
              return (
                <div key={idx} className="area-pair" style={{ border: '2px solid #888', borderRadius: 8, padding: 8, margin: 8, display: 'inline-block', verticalAlign: 'top' }}>
                  {areas.map((area: any) => (
                    <div key={area.id} className="area" style={{ backgroundColor: `hsl(${(area.id.charCodeAt(0) * 47) % 360}, 35%, 22%)`, margin: 4, padding: 6, borderRadius: 6 }}>
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
              )
            })}
          </div>

          <div className="my-character">
            <h3>Votre personnage</h3>
            {privateView?.character ? (
              <div>
                <strong>{privateView.character.name}</strong> ({privateView.character.allegiance})
                <div>{privateView.character.winConditionDesc}</div>
                <div>Spécial : {privateView.character.specialDesc}</div>
              </div>
            ) : (
              <div>Chargement du personnage…</div>
            )}
          {privateView?.hand?.length > 0 && (
            <div className="hand-cards">
              <h3>Cartes en main</h3>
              {privateView.hand.map((c: any) => (
                <div key={c.id} className="hand-card">
                  <span
                    className="card-link"
                    onMouseEnter={() => setHoveredCard(allCards.find((x: any) => x.id === c.id) || c)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    {c.emoji || (c.type === 'white' ? '?' : c.type === 'black' ? '?' : '??')} {c.title}
                  </span>
                  {cardChoosing === c.id ? (
                    <div>
                      <button onClick={() => { onAction({ type: 'use_card', payload: { cardId: c.id } }); setCardChoosing(null) }}>Sans cible</button>
                      {publicState?.players?.filter((p: any) => p.id !== player.userId && p.state !== 'dead').map((p: any) => (
                        <button key={p.id} onClick={() => { onAction({ type: 'use_card', payload: { cardId: c.id, targetId: p.id } }); setCardChoosing(null) }}>
                          {p.name || p.id}
                        </button>
                      ))}
                      <button onClick={() => setCardChoosing(null)}>Retour</button>
                    </div>
                  ) : (
                    <button onClick={() => setCardChoosing(c.id)}>Utiliser</button>
                  )}
                </div>
              ))}
            </div>
          )}
          </div>
          {isMyTurn && (
            <div className="actions-panel">
              <h3>Actions disponibles</h3>
              {!isChoosing && publicState?.availableActions.includes('roll_die') && (
                <button onClick={() => onAction({ type: 'roll_die', payload: {} })}>Lancer le dé</button>
              )}
              {!isChoosing && publicState?.availableActions.includes('choose_area') && (
                <div>
                  <p>Choisir un lieu :</p>
                  {publicState?.areas?.map((a: any) => (
                    <button key={a.id} onClick={() => onAction({ type: 'choose_area', payload: { areaId: a.id } })}>
                      {a.name}
                    </button>
                  ))}
                </div>
              )}
              {(!isChoosing || areaDamageChoosing || areaStealChoosing) && publicState?.availableActions.includes('use_area_action') && (
                <div className="area-actions">
                  <p>Action du lieu :</p>
                  {myPublic?.location === 'hermits_cabin' && (
                    <button onClick={() => onAction({ type: 'use_area_action', payload: {} })}>Piocher une carte Ermite</button>
                  )}
                  {myPublic?.location === 'church' && (
                    <button onClick={() => onAction({ type: 'use_area_action', payload: {} })}>Piocher une carte Blanche</button>
                  )}
                  {myPublic?.location === 'cemetery' && (
                    <button onClick={() => onAction({ type: 'use_area_action', payload: {} })}>Piocher une carte Noire</button>
                  )}
                  {myPublic?.location === 'underworld_gate' && (
                    <>
                      <button onClick={() => onAction({ type: 'use_area_action', payload: { choice: 'white' } })}>Piocher Blanc</button>
                      <button onClick={() => onAction({ type: 'use_area_action', payload: { choice: 'black' } })}>Piocher Noir</button>
                      <button onClick={() => onAction({ type: 'use_area_action', payload: { choice: 'hermit' } })}>Piocher Ermite</button>
                    </>
                  )}
                  {myPublic?.location === 'weird_woods' && (
                    <>
                      <button onClick={() => onAction({ type: 'use_area_action', payload: {} })}>Soigner 1 dégât</button>
                      {areaDamageChoosing ? (
                        <>
                          <p>Infliger 2 dégâts à :</p>
                          {publicState?.players
                            ?.filter((p: any) => p.id !== player.userId && p.state !== 'dead')
                            .map((p: any) => (
                              <button key={p.id} onClick={() => { onAction({ type: 'use_area_action', payload: { targetId: p.id } }); setAreaDamageChoosing(false) }}>
                                {p.name || p.id}
                              </button>
                            ))}
                          <button onClick={() => setAreaDamageChoosing(false)}>Retour</button>
                        </>
                      ) : (
                        <button onClick={() => setAreaDamageChoosing(true)}>Infliger 2 dégâts à un joueur...</button>
                      )}
                    </>
                  )}
                  {myPublic?.location === 'erstwhile_altar' && (
                    <>
                      {areaStealChoosing ? (
                        <>
                          <p>Voler un équipement à :</p>
                          {publicState?.players
                            ?.filter((p: any) => p.id !== player.userId && p.state !== 'dead')
                            .map((p: any) => (
                              <button key={p.id} onClick={() => { onAction({ type: 'use_area_action', payload: { targetId: p.id } }); setAreaStealChoosing(false) }}>
                                {p.name || p.id}
                              </button>
                            ))}
                          <button onClick={() => setAreaStealChoosing(false)}>Retour</button>
                        </>
                      ) : (
                        <button onClick={() => setAreaStealChoosing(true)}>Voler un équipement...</button>
                      )}
                    </>
                  )}
                </div>
              )}
              {!isChoosing && publicState?.availableActions.includes('decline_area_action') && (
                <button onClick={() => onAction({ type: 'decline_area_action', payload: {} })}>Refuser le lieu</button>
              )}
              {(!isChoosing || attackChoosing) && publicState?.availableActions.includes('attack_player') && (
                <div>
                  {!attackChoosing ? (
                    <button onClick={() => setAttackChoosing(true)}>Attaquer</button>
                  ) : (
                    <>
                      <p>Choisir une cible :</p>
                      {publicState?.players
                        ?.filter((p: any) => {
                          if (p.id === player.userId || p.state === 'dead') return false
                          const myLoc = myPublic?.location
                          const paired = publicState?.areaPairs?.find((pair: any) => pair[0] === myLoc)?.[1] || publicState?.areaPairs?.find((pair: any) => pair[1] === myLoc)?.[0]
                          const hasHandgun = (privateView?.fullEquipment || []).some((c: any) => c.id === 'handgun')
                          const sameOrPaired = p.location === myLoc || p.location === paired
                          return hasHandgun ? !sameOrPaired : sameOrPaired
                        })
                        .map((p: any) => (
                          <button key={p.id} onClick={() => { onAction({ type: 'attack_player', payload: { targetId: p.id } }); setAttackChoosing(false) }}>
                            {p.name || p.id}
                          </button>
                        ))}
                      <button onClick={() => setAttackChoosing(false)}>Retour</button>
                    </>
                  )}
                </div>
              )}
              {!isChoosing && publicState?.availableActions.includes('decline_attack') && (
                <button onClick={() => onAction({ type: 'decline_attack', payload: {} })}>Refuser l'attaque</button>
              )}
              {!isChoosing && publicState?.availableActions.includes('use_special') && (
                <div>
                  <p>Capacité spéciale :</p>
                  <button onClick={() => onAction({ type: 'use_special', payload: {} })}>Sans cible</button>
                  {publicState?.players
                    ?.filter((p: any) => p.id !== player.userId && p.state !== 'dead')
                    .map((p: any) => (
                      <button key={p.id} onClick={() => onAction({ type: 'use_special', payload: { targetId: p.id } })}>
                        {p.name || p.id}
                      </button>
                    ))}
                </div>
              )}
              {(attackChoosing || areaDamageChoosing || areaStealChoosing || cardChoosing) && (
                <button onClick={() => { setAttackChoosing(false); setAreaDamageChoosing(false); setAreaStealChoosing(false); setCardChoosing(null) }}>Retour</button>
              )}
              {!isChoosing && publicState?.availableActions.includes('end_turn') && (
                <button onClick={() => onAction({ type: 'end_turn', payload: {} })}>Fin de tour</button>
              )}
              {!isMyTurn && (
                <div className="actions-panel" style={{ marginTop: 8 }}>
                  <h3>Capacité spéciale (hors tour)</h3>
                  <button onClick={() => onAction({ type: 'use_special', payload: {} })}>Sans cible</button>
                  {publicState?.players
                    ?.filter((p: any) => p.id !== player.userId && p.state !== 'dead')
                    .map((p: any) => (
                      <button key={p.id} onClick={() => onAction({ type: 'use_special', payload: { targetId: p.id } })}>
                        {p.name || p.id}
                      </button>
                    ))}
                </div>
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
              {publicState?.eventLog.slice(-20).map((e: any, i: number) => (
                <div key={i} className={`log-entry ${e.type === 'damage' ? 'damage' : ''} ${e.type === 'interrupt' ? 'interrupt' : ''}`}
                  style={e.type === 'interrupt' ? { fontWeight: 'bold' } : undefined}>
                  {e.type === 'card_drawn' || e.type === 'card_used' ? (
                    <>
                      {formatEvent(e, publicState).split(e.data?.card || '').map((part, idx, arr) =>
                        idx < arr.length - 1 ? (
                          <span key={idx}>
                            {part}
                            <span
                              className="card-link"
                              onMouseEnter={() => setHoveredCard(allCards.find((x: any) => x.id === e.data?.cardId) || { title: e.data?.card, description: '' })}
                              onMouseLeave={() => setHoveredCard(null)}
                            >
                              {e.data?.card}
                            </span>
                          </span>
                        ) : (
                          <span key={idx}>{part}</span>
                        )
                      )}
                    </>
                  ) : (
                    formatEvent(e, publicState)
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
      {hoveredCard && (
        <div className="card-tooltip">
          <strong>{hoveredCard.title}</strong>
          <div>{hoveredCard.description || 'Aucune description'}</div>
          {hoveredCard.type && <div>Type: {hoveredCard.type}</div>}
        </div>
      )}
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
