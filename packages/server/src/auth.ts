import { Server as IOServer, Socket } from 'socket.io'
import { NextFunction, Request, Response } from 'express'
import { prisma } from './index.js'

export async function authenticateSession(
  socket: Socket,
  next: (err?: Error) => void
) {
  const token = socket.handshake.auth?.token || socket.handshake.headers.cookie
    ?.split('; ')
    .find((c) => c.startsWith('session_token='))
    ?.split('=')[1]

  if (!token) {
    return next(new Error('Non authentifié'))
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: { player: true },
  })

  if (!session || !session.connected) {
    return next(new Error('Session invalide ou expirée'))
  }

  if (session.expiresAt < new Date()) {
    return next(new Error('Session expirée'))
  }

  ;(socket as any).session = session
  ;(socket as any).player = session.player
  next()
}

export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies?.session_token
  if (token) {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { player: true },
    })
    if (session && session.connected && session.expiresAt >= new Date()) {
      ;(req as any).session = session
      ;(req as any).player = session.player
    }
  }
  next()
}

export function getSocketPlayer(socket: Socket) {
  return (socket as any).player
}

export function getSocketSession(socket: Socket) {
  return (socket as any).session
}