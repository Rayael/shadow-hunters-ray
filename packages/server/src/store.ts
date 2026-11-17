import { randomBytes } from 'node:crypto'

export interface LobbyPlayer {
  id: string
  userId: string
  displayName: string
  number: number
  color: string
  isBot: boolean
  isHost: boolean
}

export interface LobbySession {
  id: string
  token: string
  lobbyId: string
  playerId: string
  socketId: string | null
  connected: boolean
  expiresAt: Date
}

export interface LobbyState {
  id: string
  status: 'LOBBY' | 'GAME'
  hostId: string | null
  players: LobbyPlayer[]
}

export const lobby: LobbyState = {
  id: 'shadow-hunters',
  status: 'LOBBY',
  hostId: null,
  players: [],
}

export const sessions = new Map<string, LobbySession>()
export const sessionsByToken = new Map<string, LobbySession>()

export function createId(): string {
  return randomBytes(16).toString('hex')
}

export function getPlayer(userId: string): LobbyPlayer | undefined {
  return lobby.players.find((player) => player.userId === userId)
}

export function getPlayerForSession(session: LobbySession): LobbyPlayer | undefined {
  return lobby.players.find((player) => player.id === session.playerId)
}

export function removeSession(session: LobbySession): void {
  sessions.delete(session.id)
  sessionsByToken.delete(session.token)
}

export function clearLobby(): void {
  sessions.clear()
  sessionsByToken.clear()
  lobby.players = []
  lobby.status = 'LOBBY'
  lobby.hostId = null
}

export function publicLobby() {
  return {
    id: lobby.id,
    status: lobby.status,
    hostId: lobby.hostId,
    players: lobby.players
      .slice()
      .sort((a, b) => a.number - b.number)
      .map((player) => ({ ...player })),
  }
}
