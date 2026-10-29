import { useState, useEffect, useCallback, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import JoinScreen from './components/JoinScreen'
import LobbyScreen from './components/LobbyScreen'
import GameScreen from './components/GameScreen'
import RulesModal from './components/RulesModal'

const API_URL = import.meta.env.VITE_API_URL || window.location.origin
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin

const SFX: Record<string, string> = {
  dice: '/sounds/dice.mp3',
  damage: '/sounds/damage.mp3',
  death: '/sounds/death.mp3',
  heal: '/sounds/heal.mp3',
  reveal: '/sounds/reveal.mp3',
}

function playSfx(name: string) {
  const src = SFX[name]
  if (!src) return
  try {
    const a = new Audio(src)
    a.volume = 0.45
    a.play().catch(() => {})
  } catch {}
}

type Screen = 'join' | 'lobby' | 'game'

export default function App() {
  const [screen, setScreen] = useState<Screen>('join')
  const [player, setPlayer] = useState<any>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [lobby, setLobby] = useState<any>(null)
  const [gameState, setGameState] = useState<any>(null)
  const [privateView, setPrivateView] = useState<any>(null)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [musicEnabled, setMusicEnabled] = useState(() => localStorage.getItem('musicEnabled') !== 'false')
  const [theme, setTheme] = useState<'normal' | 'halloween'>(() => (localStorage.getItem('theme') as 'normal' | 'halloween') || 'normal')
  const musicRef = useRef<HTMLAudioElement | null>(null)
  const socketRef = useRef<Socket | null>(null)

  const connectSocket = useCallback((token: string, playerData: any, lobbyData: any) => {
    if (socketRef.current) {
      socketRef.current.disconnect()
    }
    setPlayer(playerData)
    setLobby(lobbyData)
    const socket = io(SOCKET_URL, {
      auth: { token },
      withCredentials: true,
    })
    socketRef.current = socket
    setSocket(socket)

    socket.on('connect', () => {
      console.log('Connecté au serveur Socket.IO')
      if (lobbyData?.status === 'GAME') {
        socket.emit('game:reconnect')
      }
    })

    socket.on('lobby:sync', (data: any) => {
      setLobby(data)
    })

    socket.on('game:state', (data: any) => {
      setGameState(data.public)
      setScreen('game')
    })

    socket.on('game:private', (data: any) => {
      setPrivateView(data.private)
    })

    socket.on('game:events', (data: any) => {
      const events = data?.events || []
      for (const e of events) {
        if (e.type === 'roll') playSfx('dice')
        else if (e.type === 'damage') playSfx('damage')
        else if (e.type === 'death') playSfx('death')
        else if (e.type === 'heal') playSfx('heal')
        else if (e.type === 'reveal') playSfx('reveal')
      }
    })

    socket.on('game:error', (data: any) => {
      alert(data.error)
    })

  socket.on('game:ended', () => {
    socket.disconnect()
    socketRef.current = null
    setSocket(null)
    setPlayer(null)
    setLobby(null)
    setGameState(null)
    setPrivateView(null)
    setScreen('join')
  })

    socket.on('disconnect', () => {
      console.log('Déconnecté du serveur')
    })

    if (lobbyData?.status === 'GAME') {
      setScreen('game')
    } else {
      setScreen('lobby')
    }
    return socket
  }, [])

  useEffect(() => {
    // Tentative de reconnexion automatique via le cookie de session
    fetch(`${API_URL}/api/me`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.token && json?.player && json?.lobby) {
          connectSocket(json.token, json.player, json.lobby)
        }
      })
      .catch(() => {})
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [connectSocket])

  const handleJoin = useCallback(async (data: { password: string; displayName: string }) => {
    const res = await fetch(`${API_URL}/api/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) {
      alert(json.error || 'Erreur de connexion')
      return
    }
    connectSocket(json.token, json.player, json.lobby)
  }, [connectSocket])

  const handleStartGame = useCallback(async (data: { playerCount: number; botCount: number }) => {
    if (!socket) return
    socket.emit('game:start', data)
  }, [socket])

  const handleGameAction = useCallback((data: { type: string; payload: any }) => {
    if (!socket) return
    socket.emit('game:action', data)
  }, [socket])

  const handleReconnect = useCallback(() => {
    if (!socket) return
    socket.emit('game:reconnect')
  }, [socket])


  useEffect(() => {
    document.body.classList.toggle('theme-halloween', theme === 'halloween')
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    if (!musicRef.current) {
      musicRef.current = new Audio()
      musicRef.current.loop = true
    }
    const track = theme === 'halloween' ? '/music/bgmusic2.mp3' : '/music/bgmusic1.mp3'
    if (!musicRef.current.src.endsWith(track)) {
      musicRef.current.src = track
    }
    if (musicEnabled) {
      musicRef.current.play().catch(() => {})
    } else {
      musicRef.current.pause()
    }
    localStorage.setItem('musicEnabled', String(musicEnabled))
  }, [musicEnabled, theme])

  return (
    <div className="app">
      {screen === 'join' && (
        <JoinScreen onJoin={handleJoin} />
      )}
      {screen === 'lobby' && player && lobby && socket && (
        <LobbyScreen
          player={player}
          lobby={lobby}
          socket={socket}
          onStartGame={handleStartGame}
          onRulesOpen={() => setRulesOpen(true)}
        />
      )}
      {screen === 'game' && gameState && socket && (
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
      <div className="audio-controls">
        <button onClick={() => setMusicEnabled((v) => !v)} title="Musique">
          {musicEnabled ? '🔊' : '🔇'}
        </button>
        <button onClick={() => setTheme((t) => (t === 'normal' ? 'halloween' : 'normal'))} title="Thème">
          {theme === 'halloween' ? '🎃' : '🌙'}
        </button>
      </div>
    </div>
  )
}
