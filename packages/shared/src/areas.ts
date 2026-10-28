import {
  AreaId,
  AreaRecord,
  CardType,
  GameState,
  PlayerState,
  PlayerId,
  PlayerRecord,
  SpecialResult,
} from './types.js'
import { getAllCards } from './cards.js'

function drawCardAction(state: GameState, player: PlayerRecord, cardType: CardType): SpecialResult {
  const deck = state.cardsDeck[cardType]
  if (!deck || deck.length === 0) {
    const discard = state.cardsDiscard[cardType]
    if (discard.length === 0) {
      return { success: false, message: "Plus de carte dans le deck." }
    }
    state.cardsDeck[cardType] = shuffleArray(discard)
    state.cardsDiscard[cardType] = []
  }
  const card = deck.pop()!
  if (card.isEquipment) {
    if (!player.equipment.includes(card.id)) {
      player.equipment.push(card.id)
    }
  } else {
    if (!player.hand.includes(card.id)) {
      player.hand.push(card.id)
    }
  }
  return {
    success: true,
    message: "Carte piochie : " + card.title + ".",
    events: [
      { type: "card_drawn", timestamp: Date.now(), actor: player.id, data: { player: player.id, card: card.title, cardId: card.id, type: cardType } },
    ],
  }
}

function shuffleArray(array: any[]): any[] {
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

const areas: AreaRecord[] = [
  {
    id: "hermits_cabin" as AreaId,
    name: "Cabane de lErmite",
    description: "Piochez une carte Ermite.",
    domain: [2, 3],
    resourceId: "hermits-cabin",
    action: (state, player) => drawCardAction(state, player, CardType.Hermit),
  },
  {
    id: "underworld_gate" as AreaId,
    name: "Porte des Enfers",
    description: "Piochez une carte dans le deck de votre choix.",
    domain: [4, 5],
    resourceId: "underworld-gate",
    action: (state, player) => drawCardAction(state, player, CardType.White),
  },
  {
    id: "church" as AreaId,
    name: "Eglise",
    description: "Piochez une carte Blanche.",
    domain: [6],
    resourceId: "church",
    action: (state, player) => drawCardAction(state, player, CardType.White),
  },
  {
    id: "cemetery" as AreaId,
    name: "Cimetiere",
    description: "Piochez une carte Noire.",
    domain: [8],
    resourceId: "cemetery",
    action: (state, player) => drawCardAction(state, player, CardType.Black),
  },
  {
    id: "weird_woods" as AreaId,
    name: "Bois Etrangers",
    description: "Soignez 1 degat ou infligez 2 degats a un joueur.",
    domain: [9],
    resourceId: "weird-woods",
    action: (state: GameState, player: PlayerRecord, targetId?: PlayerId) => {
      if (targetId) {
        const target = findPlayer(state, targetId)
        if (!target) return { success: false, message: "Cible introuvable." }
        if (target.state === PlayerState.Dead) return { success: false, message: "La cible est deja morte." }
        target.damage += 2
        const events = [
          { type: "damage", timestamp: Date.now(), actor: player.id, target: target.id, data: { target: target.id, amount: 2, attacker: player.id } },
        ]
        if (target.damage >= target.maxDamage) {
          target.state = PlayerState.Dead
          target.location = null
          events.push({ type: "death", timestamp: Date.now(), actor: player.id, target: target.id, data: { target: target.id, amount: 2, attacker: player.id } })
        }
        return { success: true, message: "2 degats infliges a " + target.name + ".", events }
      } else {
        player.damage = Math.max(0, player.damage - 1)
        return { success: true, message: "Vous soignez 1 degat." }
      }
    },
  },
  {
    id: "erstwhile_altar" as AreaId,
    name: "Autel dAntan",
    description: "Volez un equipement a un joueur.",
    domain: [10],
    resourceId: "erstwhile-altar",
    action: (state: GameState, player: PlayerRecord, targetId?: PlayerId) => {
      if (!targetId) {
        return { success: false, message: "Vous devez choisir une cible." }
      }
      const target = findPlayer(state, targetId)
      if (!target) return { success: false, message: "Cible introuvable." }
      if (target.state === PlayerState.Dead) return { success: false, message: "La cible est deja morte." }
      const equipCards = getAllCards().filter((c) => c.isEquipment && target.equipment.includes(c.id))
      if (equipCards.length === 0) {
        return { success: false, message: target.name + " n'a aucun equipement a voler." }
      }
      const stolen = equipCards[0]
      target.equipment = target.equipment.filter((cid) => cid !== stolen.id)
      if (!player.equipment.includes(stolen.id)) {
        player.equipment.push(stolen.id)
      }
      stolen.holder = player.id
      return {
        success: true,
        message: "Vous volez " + stolen.title + " a " + target.name + ".",
        events: [
          { type: "equipment_stolen", timestamp: Date.now(), actor: player.id, target: target.id, data: { from: target.id, to: player.id, card: stolen.title } },
        ],
      }
    },
  },
]

export const AREAS: AreaRecord[] = areas

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

