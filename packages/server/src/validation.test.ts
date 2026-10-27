// @ts-ignore
import { describe, it, expect } from 'vitest'
import {
  validatePassword,
  validateName,
  validateLobbyCapacity,
  validateUniqueName,
  normalizeName,
} from './validation.js'

describe('validatePassword', () => {
  it('refuse un mot de passe incorrect', () => {
    const r = validatePassword('mauvais', 'EDGAR')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('Mot de passe incorrect')
  })

  it('refuse un mot de passe vide', () => {
    const r = validatePassword('', 'EDGAR')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('Veuillez saisir le mot de passe')
  })

  it('accepte le bon mot de passe', () => {
    const r = validatePassword('EDGAR', 'EDGAR')
    expect(r.ok).toBe(true)
  })

  it('refuse un pseudo vide', () => {
    const r = validateName('')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('Veuillez saisir un pseudo')
  })
})

describe('validateName', () => {
  it('refuse un pseudo vide', () => {
    const r = validateName('')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('Veuillez saisir un pseudo')
  })

  it('refuse un pseudo trop court', () => {
    const r = validateName('A')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('Pseudo trop court (2 caractères minimum)')
  })

  it('refuse un pseudo réservé', () => {
    const r = validateName('shadow')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('Ce pseudo est réservé')
  })

  it('refuse un pseudo commençant par CPU', () => {
    const r = validateName('CPU_1')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('Ce pseudo est réservé')
  })

  it('accepte un pseudo valide et le normalise', () => {
    const r = validateName('  Raphael  ')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.normalized).toBe('raphael')
  })

  it('normalise les majuscules', () => {
    const r = validateName('RAPHAEL')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.normalized).toBe('raphael')
  })
})

describe('validateLobbyCapacity', () => {
  it('autorise la 9ème place', () => {
    const r = validateLobbyCapacity(8, 9)
    expect(r.ok).toBe(true)
  })

  it('refuse la 10ème place', () => {
    const r = validateLobbyCapacity(9, 9)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('9 places maximum')
  })
})

describe('validateUniqueName', () => {
  it('refuse un doublon', () => {
    const r = validateUniqueName('raphael', true)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('Ce pseudo est déjà pris')
  })

  it('accepte un pseudo libre', () => {
    const r = validateUniqueName('raphael', false)
    expect(r.ok).toBe(true)
  })
})