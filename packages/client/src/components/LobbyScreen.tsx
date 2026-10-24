import { useState } from 'react'

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
  onAddBot: () => void
  onRemoveBot: (userId: string) => void
  onRulesOpen: () => void
}) {
  const [playerCount, setPlayerCount] = useState(4)
  const [botCount, setBotCount] = useState(0)
  const [error, setError] = useState('')

  const isHost = player.isHost
  const humanCount = lobby.players.filter((p: any) => !p.isBot).length
  const botCountCurrent = lobby.players.filter((p: any) => p.isBot).length
  const total = lobby.players.length
  const canStart = total >= 4 && total <= 8

  const handleStart = () => {
    setError('')
    if (!canStart) {
      setError(`Nombre de joueurs invalide (${total}, il faut 4 à 8)`)
      return
    }
    onStartGame({ playerCount: total, botCount: botCountCurrent })
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
            {lobby.players.map((p: any) => (
              <li key={p.userId} className={p.isBot ? 'bot' : ''}>
                <span className="chip" style={{ backgroundColor: p.color }}>{p.number}</span>
                {p.displayName}{p.isBot ? ' (bot)' : ''}{p.isHost ? ' — hôte' : ''}
                {p.isBot && isHost && <button onClick={() => onRemoveBot(p.userId)}>Retirer</button>}
              </li>
            ))}
          </ul>
          {isHost && (
            <div className="host-controls">
              <h3>Contrôles de l'hôte</h3>
              <button onClick={onAddBot} disabled={total >= 9}>Ajouter un bot</button>
              <p>Nombre total de joueurs : {total}</p>
            </div>
          )}
        </aside>

        <main className="lobby-main">
          <div className="chat-box">
            <h3>Chat</h3>
            <div className="chat-messages">Bienvenue dans le lobby unique.</div>
            <div className="chat-input">
              <input type="text" placeholder="Écrire un message..." />
              <button>Envoyer</button>
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