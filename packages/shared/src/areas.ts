import {
  AreaId,
  AreaRecord,
  GameState,
  PlayerRecord,
  SpecialResult,
} from './types.js'

function noAreaAction(): SpecialResult {
  return { success: true, message: 'Aucune action disponible sur ce lieu.' }
}

export const AREAS: AreaRecord[] = [
  {
    id: 'hermits_cabin' as AreaId, name: 'Cabane de l\'Ermite',
    description: 'Piochez une carte Ermite.',
    domain: [2, 3], resourceId: 'hermits-cabin', action: noAreaAction,
  },
  {
    id: 'underworld_gate' as AreaId, name: 'Porte des Enfers',
    description: 'Piochez une carte dans le deck de votre choix.',
    domain: [4, 5], resourceId: 'underworld-gate', action: noAreaAction,
  },
  {
    id: 'church' as AreaId, name: 'Église',
    description: 'Piochez une carte Blanche.',
    domain: [6], resourceId: 'church', action: noAreaAction,
  },
  {
    id: 'cemetery' as AreaId, name: 'Cimetière',
    description: 'Piochez une carte Noire.',
    domain: [8], resourceId: 'cemetery', action: noAreaAction,
  },
  {
    id: 'weird_woods' as AreaId, name: 'Bois Étrangers',
    description: 'Soignez 1 dégât ou infligez 2 dégâts à n\'importe quel joueur.',
    domain: [9], resourceId: 'weird-woods', action: noAreaAction,
  },
  {
    id: 'erstwhile_altar' as AreaId, name: 'Autel d\'Antan',
    description: 'Volez une carte d\'équipement à n\'importe quel joueur.',
    domain: [10], resourceId: 'erstwhile-altar', action: noAreaAction,
  },
]

export function getAreaByDomain(domain: number[]): AreaRecord[] {
  return AREAS.filter((a) => domain.some((d) => a.domain.includes(d)))
}

export function getAreaById(id: AreaId): AreaRecord | undefined {
  return AREAS.find((a) => a.id === id)
}

export function areaForRoll(roll: number): AreaRecord | undefined {
  return AREAS.find((a) => a.domain.includes(roll))
}

export function getDefaultAreas(): AreaRecord[] {
  return AREAS.map((a) => ({ ...a }))
}