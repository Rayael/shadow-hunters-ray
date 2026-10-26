import {
  Allegiance,
  CharacterId,
  CharacterRecord,
  GameState,
  PlayerId,
  PlayerRecord,
  PlayerState,
  SpecialContext,
  SpecialResult,
  GameEvent,
} from './types.js'

function countAliveByAllegiance(state: GameState, alleg: Allegiance): number {
  return Array.from(state.players.values()).filter((p) => {
    if (p.state === PlayerState.Dead) return false
    const cid = state.characterAssignments.get(p.id)
    if (!cid) return false
    const ch = state.charactersPool.find((c) => c.id === cid)
    return ch?.allegiance === alleg
  }).length
}

function countDeadByAllegiance(state: GameState, alleg: Allegiance): number {
  return Array.from(state.players.values()).filter((p) => {
    if (p.state !== PlayerState.Dead) return false
    const cid = state.characterAssignments.get(p.id)
    if (!cid) return false
    const ch = state.charactersPool.find((c) => c.id === cid)
    return ch?.allegiance === alleg
  }).length
}

function noSpecial(): SpecialResult {
  return { success: true }
}

function shadowWinCondition(_state: GameState, _player: PlayerRecord): boolean {
  return true // géré par checkWinConditions côté moteur
}

function hunterWinCondition(_state: GameState, _player: PlayerRecord): boolean {
  return true // géré par checkWinConditions côté moteur
}

function allieWinCondition(_state: GameState, player: PlayerRecord): boolean {
  return (player.state as any) !== PlayerState.Dead
}

function bobWinCondition(_state: GameState, player: PlayerRecord): boolean {
  return player.equipment.length >= 5
}

function catherineWinCondition(_state: GameState, player: PlayerRecord): boolean {
  return player.state === PlayerState.Dead || player.state !== PlayerState.Dead
}

/* ============================================================
   CAPACITÉS SPÉCIALES
   ============================================================ */

function getChar(state: GameState, player: PlayerRecord): CharacterRecord | undefined {
  const cid = state.characterAssignments.get(player.id)
  if (!cid) return undefined
  return state.charactersPool.find((c) => c.id === cid)
}

function markUsed(state: GameState, player: PlayerRecord): void {
  const cid = state.characterAssignments.get(player.id)
  if (cid) {
    const ch = state.charactersPool.find((c) => c.id === cid)
    if (ch) ch.specialUsed = true
  }
}

function damagePlayer(state: GameState, actor: PlayerRecord, target: PlayerRecord, amount: number): GameEvent[] {
  const events: GameEvent[] = []
  target.damage += amount
  events.push({ type: 'damage', timestamp: Date.now(), actor: actor.id, target: target.id, data: { target: target.id, amount, attacker: actor.id } })
  if (target.damage >= target.maxDamage) {
    target.state = PlayerState.Dead
    target.location = null
    events.push({ type: 'death', timestamp: Date.now(), actor: actor.id, target: target.id, data: { player: target.id, attacker: actor.id } })
  }
  return events
}

export const SHADOWS: CharacterRecord[] = [
  {
    id: 'anna' as CharacterId, name: 'Anna', allegiance: Allegiance.Shadow,
    maxDamage: 10, specialUsed: false, resourceId: 'anna',
    winCondition: shadowWinCondition,
    winConditionDesc: 'Tous les Chasseurs sont morts, ou 3 Neutres sont morts.',
    special: noSpecial,
    specialDesc: 'Aucune capacité spéciale.',
  },
  {
    id: 'bob' as CharacterId, name: 'Bob', allegiance: Allegiance.Shadow,
    maxDamage: 10, specialUsed: false, resourceId: 'bob',
    winCondition: bobWinCondition,
    winConditionDesc: 'Posséder 5 cartes d\'équipement ou plus.',
    special: noSpecial,
    specialDesc: 'Capacité passive : équipement volé en tuant.',
  },
  {
    id: 'hans' as CharacterId, name: 'Hans', allegiance: Allegiance.Shadow,
    maxDamage: 8, specialUsed: false, resourceId: 'hans',
    winCondition: shadowWinCondition,
    winConditionDesc: 'Tous les Chasseurs sont morts, ou 3 Neutres sont morts.',
    special: noSpecial,
    specialDesc: 'Aucune capacité spéciale.',
  },
  {
    id: 'hiroshi' as CharacterId, name: 'Hiroshi', allegiance: Allegiance.Shadow,
    maxDamage: 8, specialUsed: false, resourceId: 'hiroshi',
    winCondition: shadowWinCondition,
    winConditionDesc: 'Tous les Chasseurs sont morts, ou 3 Neutres sont morts.',
    special: noSpecial,
    specialDesc: 'Aucune capacité spéciale.',
  },
  {
    id: 'michael' as CharacterId, name: 'Michael', allegiance: Allegiance.Shadow,
    maxDamage: 10, specialUsed: false, resourceId: 'michael',
    winCondition: shadowWinCondition,
    winConditionDesc: 'Tous les Chasseurs sont morts, ou 3 Neutres sont morts.',
    special: noSpecial,
    specialDesc: 'Aucune capacité spéciale.',
  },
  {
    id: 'mister_h' as CharacterId, name: 'Mister H', allegiance: Allegiance.Shadow,
    maxDamage: 12, specialUsed: false, resourceId: 'mister_h',
    winCondition: shadowWinCondition,
    winConditionDesc: 'Tous les Chasseurs sont morts, ou 3 Neutres sont morts.',
    special: noSpecial,
    specialDesc: 'Aucune capacité spéciale.',
  },
  {
    id: 'sakura' as CharacterId, name: 'Sakura', allegiance: Allegiance.Shadow,
    maxDamage: 10, specialUsed: false, resourceId: 'sakura',
    winCondition: shadowWinCondition,
    winConditionDesc: 'Tous les Chasseurs sont morts, ou 3 Neutres sont morts.',
    special: noSpecial,
    specialDesc: 'Aucune capacité spéciale.',
  },
  {
    id: 'the_unknown' as CharacterId, name: 'The Unknown', allegiance: Allegiance.Shadow,
    maxDamage: 12, specialUsed: false, resourceId: 'the_unknown',
    winCondition: shadowWinCondition,
    winConditionDesc: 'Tous les Chasseurs sont morts, ou 3 Neutres sont morts.',
    special: noSpecial,
    specialDesc: 'Aucune capacité spéciale (ne peut pas être forcé de révéler).',
  },
  {
    id: 'valkyrie' as CharacterId, name: 'Valkyrie', allegiance: Allegiance.Shadow,
    maxDamage: 10, specialUsed: false, resourceId: 'valkyrie',
    winCondition: shadowWinCondition,
    winConditionDesc: 'Tous les Chasseurs sont morts, ou 3 Neutres sont morts.',
    special: (_state, player, ctx) => {
      if (ctx.type === 'now') {
        markUsed(_state, player)
        return { success: true, message: 'Valkyrie : votre dé d\'attaque devient un dé 6 faces ce tour.' }
      }
      return { success: false }
    },
    specialDesc: 'Une fois par partie : votre dé d\'attaque devient un dé 6 faces.',
  },
  {
    id: 'vampire' as CharacterId, name: 'Vampire', allegiance: Allegiance.Shadow,
    maxDamage: 10, specialUsed: false, resourceId: 'vampire',
    winCondition: shadowWinCondition,
    winConditionDesc: 'Tous les Chasseurs sont morts, ou 3 Neutres sont morts.',
    special: (_state, player, ctx) => {
      if (ctx.type === 'now') {
        markUsed(_state, player)
        return { success: true, message: 'Vampire : vos attaques infligent désormais 2 dégâts ce tour.' }
      }
      return { success: false }
    },
    specialDesc: 'Une fois par partie : vos attaques infligent 2 dégâts.',
  },
  {
    id: 'werewolf' as CharacterId, name: 'Werewolf', allegiance: Allegiance.Shadow,
    maxDamage: 10, specialUsed: false, resourceId: 'werewolf',
    winCondition: shadowWinCondition,
    winConditionDesc: 'Tous les Chasseurs sont morts, ou 3 Neutres sont morts.',
    special: (_state, player, ctx) => {
      if (ctx.type === 'now') {
        markUsed(_state, player)
        return { success: true, message: 'Werewolf : vous contre-attaquerez si vous êtes attaqué ce tour.' }
      }
      return { success: false }
    },
    specialDesc: 'Une fois par partie : contre-attaque si attaqué.',
  },
  {
    id: 'ultra_soul' as CharacterId, name: 'Ultra Soul', allegiance: Allegiance.Shadow,
    maxDamage: 10, specialUsed: false, resourceId: 'ultra_soul',
    winCondition: shadowWinCondition,
    winConditionDesc: 'Tous les Chasseurs sont morts, ou 3 Neutres sont morts.',
    special: (state, player, ctx) => {
      if (ctx.type === 'start') {
        const targets = Array.from(state.players.values()).filter(
          (p) => p.id !== player.id && p.state !== PlayerState.Dead && p.location === 'underworld_gate'
        )
        if (targets.length === 0) return { success: false, message: 'Personne à la Porte des Enfers.' }
        const target = targets[0]
        const events = damagePlayer(state, player, target, 3)
        markUsed(state, player)
        return { success: true, message: `Ultra Soul inflige 3 dégâts à ${target.name}.`, events }
      }
      return { success: false }
    },
    specialDesc: 'Début de tour : si quelqu\'un est à la Porte des Enfers, infligez-lui 3 dégâts.',
  },
]

export const HUNTERS: CharacterRecord[] = [
  {
    id: 'chris' as CharacterId, name: 'Chris', allegiance: Allegiance.Hunter,
    maxDamage: 12, specialUsed: false, resourceId: 'chris',
    winCondition: hunterWinCondition,
    winConditionDesc: 'Toutes les Ombres sont mortes.',
    special: noSpecial,
    specialDesc: 'Aucune capacité spéciale.',
  },
  {
    id: 'george' as CharacterId, name: 'George', allegiance: Allegiance.Hunter,
    maxDamage: 12, specialUsed: false, resourceId: 'george',
    winCondition: hunterWinCondition,
    winConditionDesc: 'Toutes les Ombres sont mortes.',
    special: (state, player, ctx) => {
      if (ctx.type === 'start' && ctx.target) {
        const target = state.players.get(ctx.target)
        if (!target || target.state === PlayerState.Dead) return { success: false, message: 'Cible invalide.' }
        const roll = Math.floor(Math.random() * 4) + 1
        const events = damagePlayer(state, player, target, roll)
        events.unshift({ type: 'roll', timestamp: Date.now(), actor: player.id, data: { roll, dieSides: 4 } })
        markUsed(state, player)
        return { success: true, message: `George inflige ${roll} dégâts à ${target.name} (dé 4 faces).`, events }
      }
      return { success: false }
    },
    specialDesc: 'Une fois par partie : infligez les dégâts d\'un dé 4 faces à un joueur.',
  },
  {
    id: 'fu_ka' as CharacterId, name: 'Fu-ka', allegiance: Allegiance.Hunter,
    maxDamage: 12, specialUsed: false, resourceId: 'fu-ka',
    winCondition: hunterWinCondition,
    winConditionDesc: 'Toutes les Ombres sont mortes.',
    special: (state, player, ctx) => {
      if (ctx.type === 'start' && ctx.target) {
        const target = state.players.get(ctx.target)
        if (!target || target.state === PlayerState.Dead) return { success: false, message: 'Cible invalide.' }
        target.damage = 7
        markUsed(state, player)
        return {
          success: true,
          message: `Fu-ka fixe les dégâts de ${target.name} à 7.`,
          events: [{ type: 'message', timestamp: Date.now(), actor: player.id, target: target.id, data: { text: `Dégâts de ${target.name} fixés à 7.` } }],
        }
      }
      return { success: false }
    },
    specialDesc: 'Une fois par partie : fixez les dégâts d\'un joueur à 7.',
  },
  {
    id: 'franklin' as CharacterId, name: 'Franklin', allegiance: Allegiance.Hunter,
    maxDamage: 12, specialUsed: false, resourceId: 'franklin',
    winCondition: hunterWinCondition,
    winConditionDesc: 'Toutes les Ombres sont mortes.',
    special: (state, player, ctx) => {
      if (ctx.type === 'start' && ctx.target) {
        const target = state.players.get(ctx.target)
        if (!target || target.state === PlayerState.Dead) return { success: false, message: 'Cible invalide.' }
        const roll = Math.floor(Math.random() * 6) + 1
        const events = damagePlayer(state, player, target, roll)
        events.unshift({ type: 'roll', timestamp: Date.now(), actor: player.id, data: { roll, dieSides: 6 } })
        markUsed(state, player)
        return { success: true, message: `Franklin inflige ${roll} dégâts à ${target.name} (dé 6 faces).`, events }
      }
      return { success: false }
    },
    specialDesc: 'Une fois par partie : infligez les dégâts d\'un dé 6 faces à un joueur.',
  },
  {
    id: 'ellen' as CharacterId, name: 'Ellen', allegiance: Allegiance.Hunter,
    maxDamage: 10, specialUsed: false, resourceId: 'ellen',
    winCondition: hunterWinCondition,
    winConditionDesc: 'Toutes les Ombres sont mortes.',
    special: (state, player, ctx) => {
      if (ctx.type === 'start' && ctx.target) {
        const target = state.players.get(ctx.target)
        if (!target) return { success: false, message: 'Cible invalide.' }
        const cid = state.characterAssignments.get(target.id)
        if (!cid) return { success: false, message: 'La cible n\'a pas de personnage.' }
        const ch = state.charactersPool.find((c) => c.id === cid)
        if (!ch) return { success: false, message: 'Personnage introuvable.' }
        ch.specialUsed = true
        markUsed(state, player)
        return {
          success: true,
          message: `Ellen annule la capacité spéciale de ${target.name} (${ch.name}).`,
          events: [{ type: 'message', timestamp: Date.now(), actor: player.id, target: target.id, data: { text: `Capacité de ${target.name} annulée.` } }],
        }
      }
      return { success: false }
    },
    specialDesc: 'Une fois par partie : annulez définitivement la capacité spéciale d\'un joueur.',
  },
]

export const NEUTRALS: CharacterRecord[] = [
  {
    id: 'victor' as CharacterId, name: 'Victor', allegiance: Allegiance.Neutral,
    maxDamage: 10, specialUsed: false, resourceId: 'victor',
    winCondition: allieWinCondition,
    winConditionDesc: 'Être encore en vie à la fin de la partie.',
    special: (state, player, ctx) => {
      if (ctx.type === 'now') {
        player.damage = 0
        markUsed(state, player)
        return {
          success: true,
          message: 'Allie : vous êtes soigné entièrement.',
          events: [{ type: 'heal', timestamp: Date.now(), actor: player.id, data: { player: player.id, amount: player.maxDamage } }],
        }
      }
      return { success: false }
    },
    specialDesc: 'N\'importe quand : soignez tous vos dégâts (une fois).',
  },
  {
    id: 'mary' as CharacterId, name: 'Mary', allegiance: Allegiance.Neutral,
    maxDamage: 8, specialUsed: false, resourceId: 'mary',
    winCondition: catherineWinCondition,
    winConditionDesc: 'Être le premier à mourir, ou l\'un des deux derniers survivants.',
    special: (state, player, ctx) => {
      if (ctx.type === 'start') {
        player.damage = Math.max(0, player.damage - 1)
        markUsed(state, player)
        return {
          success: true,
          message: 'Catherine : vous soignez 1 dégât en début de tour.',
          events: [{ type: 'heal', timestamp: Date.now(), actor: player.id, data: { player: player.id, amount: 1 } }],
        }
      }
      return { success: false }
    },
    specialDesc: 'Début de tour : soignez 1 dégât (une fois).',
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

