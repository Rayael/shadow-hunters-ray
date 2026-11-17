import type { Socket } from 'socket.io'
import { sessionsByToken, getPlayerForSession } from './store.js'

export async function authenticateSession(socket: Socket, next: (err?: Error) => void) {
  try {
    const cookieToken = socket.handshake.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('session_token='))
      ?.slice('session_token='.length)
    const token = socket.handshake.auth?.token || cookieToken
    if (typeof token !== 'string' || !token) return next(new Error('Non authentifié'))

    const session = sessionsByToken.get(token)
    if (!session || session.expiresAt < new Date()) return next(new Error('Session invalide ou expirée'))
    const player = getPlayerForSession(session)
    if (!player) return next(new Error('Joueur introuvable'))

    session.connected = true
    session.socketId = socket.id
    ;(socket as any).session = session
    ;(socket as any).player = player
    next()
  } catch (error) {
    next(error instanceof Error ? error : new Error('Erreur d’authentification'))
  }
}

export function getSocketPlayer(socket: Socket) {
  return (socket as any).player
}

export function getSocketSession(socket: Socket) {
  return (socket as any).session
}
