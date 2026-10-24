import {
  Allegiance,
  CharacterId,
  CharacterRecord,
  GameState,
  PlayerRecord,
  SpecialContext,
  SpecialResult,
} from './types.js'

function countAliveByAllegiance(state: GameState, alleg: Allegiance): number {
  return Array.from(state.players.values()).filter((p) => {
    if (p.state === 'dead') return false
    const cid = state.characterAssignments.get(p.id)
    if (!cid) return false
    const ch = state.charactersPool.find((c) => c.id === cid)
    return ch?.allegiance === alleg
  }).length
}

function noSpecial(): SpecialResult {
  return { success: true }
}

export const SHADOWS: CharacterRecord[] = [
  {
    id: 'anna' as CharacterId, name: 'Anna', allegiance: Allegiance.Shadow,
    maxDamage: 10, specialUsed: false, resourceId: 'anna',
    winCondition: (s) => countAliveByAllegiance(s, Allegiance.Hunter) === 0,
    winConditionDesc: 'Tous les Chasseurs sont morts.',
    special: () => noSpecial(),
    specialDesc: 'Aucune capacité spéciale.',
  },
  {
    id: 'bob' as CharacterId, name: 'Bob', allegiance: Allegiance.Shadow,
    maxDamage: 10, specialUsed: false, resourceId: 'bob',
    winCondition: (s) => countAliveByAllegiance(s, Allegiance.Hunter) === 0,
    winConditionDesc: 'Tous les Chasseurs sont morts.',
    special: () => noSpecial(),
    specialDesc: 'Aucune capacité spéciale.',
  },
  {
    id: 'hans' as CharacterId, name: 'Hans', allegiance: Allegiance.Shadow,
    maxDamage: 8, specialUsed: false, resourceId: 'hans',
    winCondition: (s) => countAliveByAllegiance(s, Allegiance.Hunter) === 0,
    winConditionDesc: 'Tous les Chasseurs sont morts.',
    special: () => noSpecial(),
    specialDesc: 'Aucune capacité spéciale.',
  },
  {
    id: 'hiroshi' as CharacterId, name: 'Hiroshi', allegiance: Allegiance.Shadow,
    maxDamage: 8, specialUsed: false, resourceId: 'hiroshi',
    winCondition: (s) => countAliveByAllegiance(s, Allegiance.Hunter) === 0,
    winConditionDesc: 'Tous les Chasseurs sont morts.',
    special: () => noSpecial(),
    specialDesc: 'Aucune capacité spéciale.',
  },
  {
    id: 'michael' as CharacterId, name: 'Michael', allegiance: Allegiance.Shadow,
    maxDamage: 10, specialUsed: false, resourceId: 'michael',
    winCondition: (s) => countAliveByAllegiance(s, Allegiance.Hunter) === 0,
    winConditionDesc: 'Tous les Chasseurs sont morts.',
    special: () => noSpecial(),
    specialDesc: 'Aucune capacité spéciale.',
  },
  {
    id: 'mister_h' as CharacterId, name: 'Mister H', allegiance: Allegiance.Shadow,
    maxDamage: 12, specialUsed: false, resourceId: 'mister_h',
    winCondition: (s) => countAliveByAllegiance(s, Allegiance.Hunter) === 0,
    winConditionDesc: 'Tous les Chasseurs sont morts.',
    special: () => noSpecial(),
    specialDesc: 'Aucune capacité spéciale.',
  },
  {
    id: 'sakura' as CharacterId, name: 'Sakura', allegiance: Allegiance.Shadow,
    maxDamage: 10, specialUsed: false, resourceId: 'sakura',
    winCondition: (s) => countAliveByAllegiance(s, Allegiance.Hunter) === 0,
    winConditionDesc: 'Tous les Chasseurs sont morts.',
    special: () => noSpecial(),
    specialDesc: 'Aucune capacité spéciale.',
  },
  {
    id: 'the_unknown' as CharacterId, name: 'The Unknown', allegiance: Allegiance.Shadow,
    maxDamage: 12, specialUsed: false, resourceId: 'the_unknown',
    winCondition: (s) => countAliveByAllegiance(s, Allegiance.Hunter) === 0,
    winConditionDesc: 'Tous les Chasseurs sont morts.',
    special: () => noSpecial(),
    specialDesc: 'Aucune capacité spéciale.',
  },
]

export const HUNTERS: CharacterRecord[] = [
  {
    id: 'chris' as CharacterId, name: 'Chris', allegiance: Allegiance.Hunter,
    maxDamage: 12, specialUsed: false, resourceId: 'chris',
    winCondition: (s) => countAliveByAllegiance(s, Allegiance.Shadow) === 0,
    winConditionDesc: 'Toutes les Ombres sont mortes.',
    special: () => noSpecial(),
    specialDesc: 'Aucune capacité spéciale.',
  },
  {
    id: 'george' as CharacterId, name: 'George', allegiance: Allegiance.Hunter,
    maxDamage: 12, specialUsed: false, resourceId: 'george',
    winCondition: (s) => countAliveByAllegiance(s, Allegiance.Shadow) === 0,
    winConditionDesc: 'Toutes les Ombres sont mortes.',
    special: () => noSpecial(),
    specialDesc: 'Une fois par partie, inflige les dégâts d\'un dé 4 faces à un joueur.',
  },
  {
    id: 'fu_ka' as CharacterId, name: 'Fu-ka', allegiance: Allegiance.Hunter,
    maxDamage: 12, specialUsed: false, resourceId: 'fu-ka',
    winCondition: (s) => countAliveByAllegiance(s, Allegiance.Shadow) === 0,
    winConditionDesc: 'Toutes les Ombres sont mortes.',
    special: () => noSpecial(),
    specialDesc: 'Une fois par partie, fixez les dégâts d\'un joueur à 7.',
  },
  {
    id: 'franklin' as CharacterId, name: 'Franklin', allegiance: Allegiance.Hunter,
    maxDamage: 12, specialUsed: false, resourceId: 'franklin',
    winCondition: (s) => countAliveByAllegiance(s, Allegiance.Shadow) === 0,
    winConditionDesc: 'Toutes les Ombres sont mortes.',
    special: () => noSpecial(),
    specialDesc: 'Une fois par partie, inflige les dégâts d\'un dé 6 faces à un joueur.',
  },
  {
    id: 'ellen' as CharacterId, name: 'Ellen', allegiance: Allegiance.Hunter,
    maxDamage: 10, specialUsed: false, resourceId: 'ellen',
    winCondition: (s) => countAliveByAllegiance(s, Allegiance.Shadow) === 0,
    winConditionDesc: 'Toutes les Ombres sont mortes.',
    special: () => noSpecial(),
    specialDesc: 'Une fois par partie, annulez définitivement la capacité spéciale d\'un joueur.',
  },
]

export const NEUTRALS: CharacterRecord[] = [
  {
    id: 'victor' as CharacterId, name: 'Victor', allegiance: Allegiance.Neutral,
    maxDamage: 10, specialUsed: false, resourceId: 'victor',
    winCondition: () => true,
    winConditionDesc: 'Objectif personnel de Victor.',
    special: () => noSpecial(),
    specialDesc: 'Aucune capacité spéciale.',
  },
  {
    id: 'mary' as CharacterId, name: 'Mary', allegiance: Allegiance.Neutral,
    maxDamage: 8, specialUsed: false, resourceId: 'mary',
    winCondition: () => true,
    winConditionDesc: 'Objectif personnel de Mary.',
    special: () => noSpecial(),
    specialDesc: 'Aucune capacité spéciale.',
  },
]

export const CHARACTERS: CharacterRecord[] = [
  ...SHADOWS,
  ...HUNTERS,
  ...NEUTRALS,
]

export function getCharacterById(id: CharacterId): CharacterRecord | undefined {
  return CHARACTERS.find((c) => c.id === id)
}

export function getCharactersByAllegiance(alleg: Allegiance): CharacterRecord[] {
  return CHARACTERS.filter((c) => c.allegiance === alleg)
}

export function getDefaultCharacterPool(): CharacterRecord[] {
  return CHARACTERS.map((c) => ({ ...c, specialUsed: false }))
}