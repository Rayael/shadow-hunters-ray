import { useState } from 'react'

export default function JoinScreen({ onJoin }: { onJoin: (data: { password: string; displayName: string }) => void }) {
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!password) { setError('Veuillez saisir le mot de passe'); return }
    if (!displayName.trim()) { setError('Veuillez saisir un pseudo'); return }
    onJoin({ password, displayName: displayName.trim() })
  }

  return (
    <div className="join-screen">
      <div className="join-card">
        <h1>Shadow Hunters</h1>
        <p>Entrez le mot de passe et votre pseudo pour rejoindre le lobby unique.</p>
        <form onSubmit={handleSubmit}>
          <label>
            Mot de passe
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <label>
            Pseudo
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength="32" />
          </label>
          {error && <div className="error">{error}</div>}
          <button type="submit">Rejoindre le lobby</button>
        </form>
        <p className="hint">Mot de passe commun : EDGAR</p>
      </div>
    </div>
  )
}