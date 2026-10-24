import { useState, useEffect, useCallback } from 'react'
import { io, type Socket } from 'socket.io-client'
import JoinScreen from './components/JoinScreen'
import LobbyScreen from './components/LobbyScreen'
import GameScreen from './components/GameScreen'
import RulesModal from './components/RulesModal'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'

type Screen = 'join' | 'lobby' | 'game'

export default function App() {
  const [screen, setScreen] = useState<Screen>('join')
  const [player, setPlayer] = useState<any>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [lobby, setLobby] = useState<any>(null)
  const [gameState, setGameState] = useState<any>(null)
  const [privateView, setPrivateView] = useState<any>(null)
  const [rulesOpen, setRulesOpen] = useState(false)

  useEffect(() => {
    const socket = io(SOCKET_URL, { auth: { token: document.cookie.match(/session_token=([^;]+)/)?.[1] } })
    setSocket(socket)

    socket.on('connect', () => {
      console.log('Connecté au serveur Socket.IO')
    })

    socket.on('lobby:sync', (data: any) => {
      setLobby(data)
    })

    socket.on('game:state', (data: any) => {
      setGameState(data.public)
    })

    socket.on('game:private', (data: any) => {
      setPrivateView(data.private)
    })

    socket.on('game:error', (data: any) => {
      alert(data.error)
    })

    socket.on('disconnect', () => {
      console.log('Déconnecté du serveur')
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const handleJoin = useCallback(async (data: { password: string; displayName: string }) => {
    const res = await fetch(`${API_URL}/api/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    })
    const json = await res.json()
    if (!res.ok) {
      alert(json.error || 'Erreur de connexion')
      return
    }
    setPlayer(json.player)
    setScreen('lobby')
  }, [])

  const handleStartGame = useCallback(async (data: { playerCount: number; botCount: number }) => {
    if (!socket) return
    socket.emit('game:start', data)
    setScreen('game')
  }, [socket])

  const handleAddBot = useCallback(() => {
    if (!socket) return
    socket.emit('lobby:add_bot')
  }, [socket])

  const handleRemoveBot = useCallback((userId: string) => {
    if (!socket) return
    socket.emit('lobby:remove_bot', { userId })
  }, [socket])

  const handleGameAction = useCallback((data: { type: string; payload: any }) => {
    if (!socket) return
    socket.emit('game:action', data)
  }, [socket])

  const handleReconnect = useCallback(() => {
    if (!socket) return
    socket.emit('game:reconnect')
  }, [socket])

  return (
    <div className="app">
      {screen === 'join' && (
        <JoinScreen onJoin={handleJoin} />
      )}
      {screen === 'lobby' && player && lobby && (
        <LobbyScreen
          player={player}
          lobby={lobby}
          socket={socket}
          onStartGame={handleStartGame}
          onAddBot={handleAddBot}
          onRemoveBot={handleRemoveBot}
          onRulesOpen={() => setRulesOpen(true)}
        />
      )}
      {screen === 'game' && gameState && (
        <GameScreen
          player={player}
          public={gameState}
          private={privateView}
          socket={socket}
          onAction={handleGameAction}
          onReconnect={handleReconnect}
          onRulesOpen={() => setRulesOpen(true)}
        />
      )}
      {rulesOpen && (
        <RulesModal onClose={() => setRulesOpen(false)} />
      )}
    </div>
  )
}