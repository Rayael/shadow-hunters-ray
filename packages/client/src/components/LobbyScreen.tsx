import { useState, useEffect } from 'react'

export default function LobbyScreen({
  player,
  lobby,
  socket,
  onStartGame,
  onAddBot,
  onRemoveBot,
  onRulesOpen,
}: {
  player: any
  lobby: any
  socket: any
  onStartGame: (data: { playerCount: number; botCount: number }) => void
  onAddBot?: () => void
  onRemoveBot?: (userId: string) => void
  onRulesOpen: () => void
}) {
  const [playerCount, setPlayerCount] = useState(4)
  const [botCount, setBotCount] = useState(0)
  const [error, setError] = useState('')
  const [chatMessages, setChatMessages] = useState<{ from: string; text: string; at: string }[]>([])
  const [chatInput, setChatInput] = useState('')

  useEffect(() => {
    if (!socket) return
    const handler = (msg: any) => {
      setChatMessages((prev) => [...prev, msg])
    }
    socket.on('lobby:chat', handler)
    return () => {
      socket.off('lobby:chat', handler)
    }
  }, [socket])

  const handleSendChat = () => {
    const text = chatInput.trim()
    if (!text || !socket) return
    socket.emit('lobby:chat', { text })
    setChatInput('')
  }

  const isHost = player.isHost
  const humanCount = lobby.players?.filter((p: any) => !p.isBot).length ?? 0
  const botCountCurrent = lobby.players?.filter((p: any) => p.isBot).length ?? 0
  const total = lobby.players?.length ?? 0
  const canStart = playerCount >= 4 && playerCount <= 8 && playerCount >= total

  const handleStart = () => {
    setError('')
    const totalPlayers = Math.max(playerCount, total)
    if (totalPlayers < 4 || totalPlayers > 8) {
      setError(`Nombre de joueurs invalide (${totalPlayers}, il faut 4 à 8)`)
      return
    }
    if (totalPlayers < total) {
      setError(`Le nombre choisi (${totalPlayers}) est inférieur au nombre de joueurs actuels (${total})`)
      return
    }
    onStartGame({ playerCount: totalPlayers, botCount: 0 })
  }

  return (
    <div className="lobby-screen">
      <header className="lobby-header">
        <h1>Shadow Hunters — Lobby</h1>
        <button onClick={onRulesOpen}>Règles</button>
      </header>

      <div className="lobby-body">
        <aside className="lobby-sidebar">
          <h2>Joueurs ({total}/9)</h2>
          <ul>
            {lobby.players?.map((p: any) => (
              <li key={p.userId} className={p.isBot ? 'bot' : ''}>
                <span className="chip" style={{ backgroundColor: p.color }}>{p.number}</span>
                {p.displayName}{p.isBot ? ' (bot)' : ''}{p.isHost ? ' — hôte' : ''}
                {p.isBot && isHost && <button onClick={() => onRemoveBot?.(p.userId)}>Retirer</button>}
              </li>
            ))}
          </ul>
          {isHost && (
            <div className="host-controls">
              <h3>Contrôles de l'hôte</h3>
              <label>Nombre de joueurs pour la partie :
                <select value={playerCount} onChange={(e) => setPlayerCount(Number(e.target.value))}>
                  {[4,5,6,7,8].map((n) => (<option key={n} value={n}>{n}</option>))}
                </select>
              </label>
              <p>Nombre total de joueurs : {total}</p>
            </div>
          )}
        </aside>

        <main className="lobby-main">
          <div className="chat-box">
            <h3>Chat</h3>
            <div className="chat-messages">{chatMessages.map((m, i) => (
                 <div key={i} className="chat-message">
                   <strong>{m.from}:</strong> {m.text}
                 </div>
               ))}</div>
            <div className="chat-input">
              <input type="text" placeholder="Écrire un message..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat() }} />
              <button onClick={handleSendChat}>Envoyer</button>
            </div>
          </div>

          {isHost && (
            <div className="start-panel">
              <h3>Lancer la partie</h3>
              <p>Joueurs actuels : {total} (min 4, max 8)</p>
              <button onClick={handleStart} disabled={!canStart}>
                Démarrer la partie
              </button>
              {error && <div className="error">{error}</div>}
            </div>
          )}

          {!isHost && (
            <div className="wait-panel">
              <p>En attente que l'hôte démarre la partie…</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}