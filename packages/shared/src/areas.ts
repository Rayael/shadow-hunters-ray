import {
  AreaId,
  AreaRecord,
  CardType,
  GameState,
  PlayerId,
  PlayerRecord,\n  PlayerState,\n  SpecialResult,
} from './types.js'
import { getAllCards } from './cards.js'

function drawCardAction(state: GameState, player: PlayerRecord, cardType: CardType): SpecialResult {
  const deck = state.cardsDeck[cardType]
  if (!deck || deck.length === 0) {
    const discard = state.cardsDiscard[cardType]
    if (discard.length === 0) {
      return { success: false, message: `Plus de carte dans le deck ${cardType}.` }
    }
    state.cardsDeck[cardType] = shuffleArray(discard)
    state.cardsDiscard[cardType] = []
  }
  const card = deck.pop()!
  card.holder = player.id
  if (!player.equipment.includes(card.id)) {
    player.equipment.push(card.id)
  }
  return {
    success: true,
    message: `Carte piochée : ${card.title}.`,
    events: [
      {
        type: 'card_drawn',
        timestamp: Date.now(),
        actor: player.id,
        data: { player: player.id, card: card.title, type: cardType },
      },
    ],
  }
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = result[i]; result[i] = result[j]; result[j] = tmp
  }
  return result
}

function findPlayer(state: GameState, id: PlayerId): PlayerRecord | undefined {
  return state.players.get(id)
}

export const AREAS: AreaRecord[] = [
  {
    id: 'hermits_cabin' as AreaId, name: 'Cabane de l\'Ermite',
    description: 'Piochez une carte Ermite.',
    domain: [2, 3], resourceId: 'hermits-cabin',
    action: (state, player) => drawCardAction(state, player, CardType.Hermit),
  },
  {
    id: 'underworld_gate' as AreaId, name: 'Porte des Enfers',
    description: 'Piochez une carte dans le deck de votre choix (Blanc par défaut).',
    domain: [4, 5], resourceId: 'underworld-gate',
    action: (state, player) => drawCardAction(state, player, CardType.White),
  },
  {
    id: 'church' as AreaId, name: 'Église',
    description: 'Piochez une carte Blanche.',
    domain: [6], resourceId: 'church',
    action: (state, player) => drawCardAction(state, player, CardType.White),
  },
  {
    id: 'cemetery' as AreaId, name: 'Cimetière',
    description: 'Piochez une carte Noire.',
    domain: [8], resourceId: 'cemetery',
    action: (state, player) => drawCardAction(state, player, CardType.Black),
  },
  {
    id: 'weird_woods' as AreaId, name: 'Bois Étrangers',
    description: 'Soignez 1 dégât ou infligez 2 dégâts à n\'importe quel joueur.',
    domain: [9], resourceId: 'weird-woods',
    action: (state, player, targetId) => {
      if (targetId) {
        const target = findPlayer(state, targetId)
        if (!target) return { success: false, message: 'Cible introuvable.' }
        if (target.state === PlayerState.Dead) return { success: false, message: 'La cible est déjà morte.' }
        target.damage += 2
        const events = [
          { type: 'damage', timestamp: Date.now(), actor: player.id, target: targetId, data: { target: targetId, amount: 2, attacker: player.id } },
        ]
        if (target.damage >= target.maxDamage) {
          target.state = PlayerState.Dead
          target.location = null
          events.push({ type: 'death', timestamp: Date.now(), actor: player.id, target: targetId, data: { player: targetId, attacker: player.id } })
        }
        return { success: true, message: `2 dégâts infligés à ${target.name}.`, events }
      } else {
        player.damage = Math.max(0, player.damage - 1)
        return { success: true, message: 'Vous soignez 1 dégât.' }
      }
    },
  },
  {
    id: 'erstwhile_altar' as AreaId, name: 'Autel d\'Antan',
    description: 'Volez une carte d\'équipement à n\'importe quel joueur.',
    domain: [10], resourceId: 'erstwhile-altar',
    action: (state, player, targetId) => {
      if (!targetId) {
        return { success: false, message: 'Vous devez choisir une cible.' }
      }
      const target = findPlayer(state, targetId)
      if (!target) return { success: false, message: 'Cible introuvable.' }
      if (target.state === PlayerState.Dead) return { success: false, message: 'La cible est déjà morte.' }
      const equipCards = getAllCards().filter((c) => c.isEquipment && target.equipment.includes(c.id))
      if (equipCards.length === 0) {
        return { success: false, message: `${target.name} n\'a aucun équipement à voler.` }
      }
      const stolen = equipCards[0]
      target.equipment = target.equipment.filter((cid) => cid !== stolen.id)
      if (!player.equipment.includes(stolen.id)) {
        player.equipment.push(stolen.id)
      }
      stolen.holder = player.id
      return {
        success: true,
        message: `Vous volez ${stolen.title} à ${target.name}.`,
        events: [
          { type: 'equipment_stolen', timestamp: Date.now(), actor: player.id, target: targetId, data: { from: targetId, to: player.id, card: stolen.title } },
        ],
      }
    },
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


