import * as z from 'zod'

export const joinSchema = z.object({
  password: z.string().min(1, 'Mot de passe requis'),
  displayName: z.string().min(1, 'Pseudo requis').max(32, 'Pseudo trop long (32 caractères max)'),
})

export const RESERVED_NAMES = ['shadow', 'hunter', 'neutral', 'decline', 'cpu', 'bot']

export function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

export function validateName(name: string): { ok: true; normalized: string } | { ok: false; error: string } {
  const trimmed = name.trim()
  if (!trimmed) {
    return { ok: false, error: 'Veuillez saisir un pseudo' }
  }
  if (trimmed.length < 2) {
    return { ok: false, error: 'Pseudo trop court (2 caractères minimum)' }
  }
  if (trimmed.length > 32) {
    return { ok: false, error: 'Pseudo trop long (32 caractères maximum)' }
  }
  const normalized = normalizeName(trimmed)
  if (RESERVED_NAMES.includes(normalized)) {
    return { ok: false, error: 'Ce pseudo est réservé' }
  }
  if (normalized.startsWith('cpu')) {
    return { ok: false, error: 'Ce pseudo est réservé' }
  }
  return { ok: true, normalized }
}

export function validatePassword(password: string, expected: string): { ok: true } | { ok: false; error: string } {
  if (!password) {
    return { ok: false, error: 'Veuillez saisir le mot de passe' }
  }
  if (password !== expected) {
    return { ok: false, error: 'Mot de passe incorrect' }
  }
  return { ok: true }
}

export function validateLobbyCapacity(currentCount: number, max: number = 9): { ok: true } | { ok: false; error: string } {
  if (currentCount >= max) {
    return { ok: false, error: `Le lobby est complet (${max} places maximum)` }
  }
  return { ok: true }
}

export function validateUniqueName(normalized: string, existing: boolean): { ok: true } | { ok: false; error: string } {
  if (existing) {
    return { ok: false, error: 'Ce pseudo est déjà pris' }
  }
  return { ok: true }
}