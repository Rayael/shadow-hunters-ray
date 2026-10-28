import {
  CardId,
  CardRecord,
  CardType,
  GameState,
  PlayerState,
  PlayerId,
  PlayerRecord,
  SpecialResult,
} from './types.js'

function noUse(): SpecialResult {
  return { success: true }
}

export const WHITE_CARDS: CardRecord[] = [
  {
    id: 'mystic_compass' as CardId, title: 'Boussole Mystique', type: CardType.White,
    description: 'Lorsque vous vous deplacez, vous pouvez lancer deux fois et choisir le resultat.',
    isEquipment: true, holder: null, resourceId: 'mysticcompass', use: noUse,
  },
  {
    id: 'talisman' as CardId, title: 'Talisman', type: CardType.White,
    description: 'Vous ne recevez aucun degat des cartes Noires.',
    isEquipment: true, holder: null, resourceId: 'talisman', use: noUse,
  },
  {
    id: 'fortune_brooch' as CardId, title: 'Broche de la Fortune', type: CardType.White,
    description: 'Vous ne recevez aucun degat de Bois Etrangers.',
    isEquipment: true, holder: null, resourceId: 'fortunebrooch', use: noUse,
  },
  {
    id: 'silver_rosary' as CardId, title: "Rosen d'Argent", type: CardType.White,
    description: 'Si vous tuez un autre personnage, vous prenez tout son equipement.',
    isEquipment: true, holder: null, resourceId: 'silverrosary', use: noUse,
  },
  {
    id: 'spear_of_longinus' as CardId, title: 'Lance de Longin', type: CardType.White,
    description: 'Chasseur devoile : +2 degats si votre attaque reussit.',
    isEquipment: true, holder: null, resourceId: 'spearoflonginus', use: noUse,
  },
  {
    id: 'advent' as CardId, title: 'Avènement', type: CardType.White,
    description: 'Chasseur : reveliez votre identite et soignez-vous entierement.',
    isEquipment: false, holder: null, resourceId: 'advent',
    use: (state, player) => {
      const cid = state.characterAssignments.get(player.id)
      const ch = cid ? state.charactersPool.find((c) => c.id === cid) : null
      if (!ch || ch.allegiance !== 'hunter') {
        return { success: false, message: "Seul un Chasseur peut utiliser l'Avènement." }
      }
      player.state = PlayerState.Revealed
      player.damage = 0
      return {
        success: true,
        message: player.name + ' se revele Chasseur et est soigne entierement.',
        events: [
          { type: 'reveal', timestamp: Date.now(), actor: player.id, data: { player: player.id, character: ch.name } },
          { type: 'heal', timestamp: Date.now(), actor: player.id, data: { player: player.id, amount: player.maxDamage } },
        ],
      }
    },
  },
  {
    id: 'disenchant_mirror' as CardId, title: 'Miroir de Desenvoûtement', type: CardType.White,
    description: 'Ombre (sauf Inconnu) : vous devez reveler votre identite.',
    isEquipment: false, holder: null, resourceId: 'disenchantmirror',
    use: (state, player, target) => {
      if (!target) return { success: false, message: 'Vous devez choisir une cible.' }
      const cid = state.characterAssignments.get(target.id)
      const ch = cid ? state.charactersPool.find((c) => c.id === cid) : null
      if (!ch) return { success: false, message: 'La cible n\'a pas de personnage.' }
      if (ch.allegiance !== 'shadow') {
        return { success: false, message: 'Cette cible n\'est pas une Ombre.' }
      }
      if (ch.id === 'the_unknown') {
        return { success: false, message: "L'Inconnu ne peut pas etre force de reveler." }
      }
      const tPlayer = state.players.get(target.id)
      if (!tPlayer) return { success: false, message: 'Cible introuvable.' }
      tPlayer.state = PlayerState.Revealed
      return {
        success: true,
        message: target.name + ' est force de reveler son identite : ' + ch.name + '.',
        events: [
          { type: 'reveal', timestamp: Date.now(), actor: player.id, target: target.id, data: { target: target.id, character: ch.name } },
        ],
      }
    },
  },
  {
    id: 'blessing' as CardId, title: 'Benediction', type: CardType.White,
    description: 'Choisissez un personnage et lancez le de 6 faces ; il soigne du resultat.',
    isEquipment: false, holder: null, resourceId: 'blessing',
    use: (state, player, target) => {
      if (!target) return { success: false, message: 'Vous devez choisir une cible.' }
      if (target.state === PlayerState.Dead) return { success: false, message: 'La cible est deja morte.' }
      const roll = Math.floor(Math.random() * 6) + 1
      target.damage = Math.max(0, target.damage - roll)
      return {
        success: true,
        message: 'De 6 faces : ' + roll + '. ' + target.name + ' soigne ' + roll + ' degat(s).',
        events: [
          { type: 'roll', timestamp: Date.now(), actor: player.id, data: { roll, dieSides: 6 } },
          { type: 'heal', timestamp: Date.now(), actor: player.id, target: target.id, data: { target: target.id, amount: roll } },
        ],
      }
    },
  },
]

export const BLACK_CARDS: CardRecord[] = [
  {
    id: 'vampire_bat' as CardId, title: 'Chauve-souris Vampirique', type: CardType.Black,
    description: 'Infligez 2 degats a un joueur.',
    isEquipment: false, holder: null, resourceId: 'vampirebat',
    use: (state, player, target) => {
      if (!target) return { success: false, message: 'Vous devez choisir une cible.' }
      if (target.state === PlayerState.Dead) return { success: false, message: 'La cible est deja morte.' }
      target.damage += 2
      const events = [
        { type: 'damage', timestamp: Date.now(), actor: player.id, target: target.id, data: { target: target.id, amount: 2, attacker: player.id } },
      ]
      if (target.damage >= target.maxDamage) {
        target.state = PlayerState.Dead
        target.location = null
        events.push({ type: 'death', timestamp: Date.now(), actor: player.id, target: target.id, data: { target: target.id, amount: 2, attacker: player.id } })
      }
      return { success: true, message: '2 degats infliges a ' + target.name + '.', events }
    },
  },
  {
    id: 'dynamite' as CardId, title: 'Dynamite', type: CardType.Black,
    description: 'Infligez 2 degats a tous les joueurs sur votre lieu.',
    isEquipment: false, holder: null, resourceId: 'dynamite',
    use: (state, player) => {
      if (!player.location) return { success: false, message: 'Vous n\'etes sur aucun lieu.' }
      const targets = Array.from(state.players.values()).filter(
        (p) => p.id !== player.id && p.state !== PlayerState.Dead && p.location === player.location
      )
      if (targets.length === 0) {
        return { success: false, message: 'Aucun autre joueur sur votre lieu.' }
      }
      const events = []
      for (const t of targets) {
        t.damage += 2
        events.push({ type: 'damage', timestamp: Date.now(), actor: player.id, target: t.id, data: { target: t.id, amount: 2, attacker: player.id } })
        if (t.damage >= t.maxDamage) {
          t.state = PlayerState.Dead
          t.location = null
          events.push({ type: 'death', timestamp: Date.now(), actor: player.id, target: t.id, data: { player: t.id, attacker: player.id } })
        }
      }
      return {
        success: true,
        message: 'Dynamite : 2 degats a ' + targets.length + ' joueur(s) sur votre lieu.',
        events,
      }
    },
  },
  {
    id: 'spider' as CardId, title: 'Araignée Assoiffee de Sang', type: CardType.Black,
    description: 'Infligez 1 degats a un joueur.',
    isEquipment: false, holder: null, resourceId: 'spider',
    use: (state, player, target) => {
      if (!target) return { success: false, message: 'Vous devez choisir une cible.' }
      if (target.state === PlayerState.Dead) return { success: false, message: 'La cible est deja morte.' }
      target.damage += 1
      const events = [
        { type: 'damage', timestamp: Date.now(), actor: player.id, target: target.id, data: { target: target.id, amount: 1, attacker: player.id } },
      ]
      if (target.damage >= target.maxDamage) {
        target.state = PlayerState.Dead
        target.location = null
        events.push({ type: 'death', timestamp: Date.now(), actor: player.id, target: target.id, data: { target: target.id, amount: 2, attacker: player.id } })
      }
      return { success: true, message: '1 degat inflige a ' + target.name + '.', events }
    },
  },
]

export const HERMIT_CARDS: CardRecord[] = [
  {
    id: 'hermit_1' as CardId, title: 'Carte Ermite 1', type: CardType.Hermit,
    description: 'Carte Ermite.',
    isEquipment: false, holder: null, resourceId: 'hermit1', use: noUse,
  },
]

export function getAllCards(): CardRecord[] {
  return [...WHITE_CARDS, ...BLACK_CARDS, ...HERMIT_CARDS].map((c) => ({ ...c, holder: null }))
}

export function getDeckByType(type: CardType): CardRecord[] {
  switch (type) {
    case CardType.White: return [...WHITE_CARDS].map((c) => ({ ...c, holder: null }))
    case CardType.Black: return [...BLACK_CARDS].map((c) => ({ ...c, holder: null }))
    case CardType.Hermit: return [...HERMIT_CARDS].map((c) => ({ ...c, holder: null }))
  }
}





