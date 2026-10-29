import {
  ActionType, AreaId, AreaRecord, AreaView, CardId, CardRecord, CardType, CharacterId,
  GameEvent, GameState, GameView, PlayerId, PlayerPrivateView,
  PlayerPublicView, PlayerRecord, Phase, PlayerState, SpecialContext,
} from './types.js'
import { CHARACTERS, getDefaultCharacterPool } from './characters.js'
import { getAllCards } from './cards.js'
import { getDefaultAreas, areaForRoll } from './areas.js'

function now(): number { return Date.now() }

function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = result[i]; result[i] = result[j]; result[j] = tmp
  }
  return result
}

const COLORS = [
  '#F5F5F5', '#646464', '#4FB64E', '#3E63AB', '#C561A3', '#DB3E3E',
  '#F9EA30', '#EF882B', '#9B59B6',
]

const FACTION_COUNTS: Record<number, { shadow: number; hunter: number; neutral: number }> = {
  4: { shadow: 2, hunter: 2, neutral: 0 },
  5: { shadow: 2, hunter: 2, neutral: 1 },
  6: { shadow: 2, hunter: 2, neutral: 2 },
  7: { shadow: 2, hunter: 2, neutral: 3 },
  8: { shadow: 3, hunter: 3, neutral: 2 },
}

export class GameEngine {
  public state: GameState
  constructor(state: GameState) { this.state = state }

  static createGame(
    gameId: string,
    players: { id: PlayerId; name: string; number: number; color: string; isBot: boolean }[]
  ): GameEngine {
    const playerCount = players.length
    if (playerCount < 4 || playerCount > 8) {
      throw new Error(`Nombre de joueurs invalide : ${playerCount} (doit être entre 4 et 8)`)
    }
    const factionCounts = FACTION_COUNTS[playerCount]
    if (!factionCounts) {
      throw new Error(`Pas de configuration officielle pour ${playerCount} joueurs`)
    }
    const turnOrder = players.map((p) => p.id)
    const playersMap = new Map<PlayerId, PlayerRecord>()
    players.forEach((p, i) => {
      playersMap.set(p.id, {
        id: p.id, number: p.number, name: p.name, color: p.color,
        state: PlayerState.Hidden, damage: 0, maxDamage: 10, isBot: p.isBot,
        socketId: null, location: null, equipment: [], hand: [], specialActive: false,
        characterId: null, delexicalization: i,
      })
    })
    const areas = getDefaultAreas() as AreaRecord[]
    const areasMap = new Map<AreaId, AreaRecord>()
    areas.forEach((a) => areasMap.set(a.id, a))
    const areaIds = Array.from(areasMap.keys())
    const shuffledAreaIds = shuffle([...areaIds])
    const areaPairs = new Map<AreaId, AreaId>()
    for (let i = 0; i < shuffledAreaIds.length - 1; i += 2) {
      areaPairs.set(shuffledAreaIds[i], shuffledAreaIds[i + 1])
      areaPairs.set(shuffledAreaIds[i + 1], shuffledAreaIds[i])
    }
    if (shuffledAreaIds.length % 2 !== 0) {
      const last = shuffledAreaIds[shuffledAreaIds.length - 1]
      areaPairs.set(last, last)
    }
    const allCards = getAllCards()
    const whiteDeck = shuffle(allCards.filter((c) => c.type === CardType.White))
    const blackDeck = shuffle(allCards.filter((c) => c.type === CardType.Black))
    const hermitDeck = shuffle(allCards.filter((c) => c.type === CardType.Hermit))

    const state: GameState = {
      id: gameId, phase: Phase.Setup, round: 0, turnPlayerIndex: 0, turnPlayerId: null,
      players: playersMap, turnOrder,
      charactersPool: getDefaultCharacterPool(),
      cardsDeck: { white: whiteDeck, black: blackDeck, hermit: hermitDeck },
      cardsDiscard: { white: [], black: [], hermit: [] },
      areas: areasMap, areaPairs, currentRoll: null, availableActions: [],
      eventLog: [{ type: 'message', timestamp: now(), data: { text: 'Partie créée.' } }],
      gameOver: false, winners: [],
      config: { playerCount, botCount: players.filter((p) => p.isBot).length, factionCounts },
      characterAssignments: new Map(), specialsUsed: new Set(),
    }
    return new GameEngine(state)
  }

  getPublicView(forPlayerId: PlayerId | null = null): GameView['public'] {
    const players: PlayerPublicView[] = Array.from(this.state.players.values()).map((p) => {
      const isOwner = forPlayerId ? forPlayerId === p.id : false
      const revealed = p.state === PlayerState.Revealed
      const characterId = this.state.characterAssignments.get(p.id)
      let character: any = null
      if (characterId) {
        const ch = this.state.charactersPool.find((c) => c.id === characterId)
        if (ch) {
          character = {
            id: ch.id, name: isOwner || revealed ? ch.name : 'Personnage secret',
            allegiance: isOwner || revealed ? ch.allegiance : null,
            maxDamage: isOwner || revealed ? ch.maxDamage : null, specialDesc: ch.specialDesc,
            revealed: isOwner || revealed,
            ...(isOwner || revealed ? { winConditionDesc: ch.winConditionDesc } : {}),
          }
        }
      }
      return {
        id: p.id, number: p.number, name: p.name, color: p.color,
        state: p.state, damage: p.damage, maxDamage: isOwner || revealed ? p.maxDamage : null,
        isAlive: p.state !== PlayerState.Dead, isBot: p.isBot,
        location: p.location,
        equipment: p.equipment.map((cid) => {
          const card = this.findCard(cid)
          return card
            ? { id: card.id, title: card.title, type: card.type, description: card.description, isEquipment: card.isEquipment, holder: card.holder, emoji: card.emoji }
            : { id: cid, title: 'Inconnu', type: CardType.White, description: '', isEquipment: false, holder: null }
        }),
        specialActive: p.specialActive, character,
      }
    })
    const areas: AreaView[] = Array.from(this.state.areas.values()).map((a) => ({
      id: a.id, name: a.name, description: a.description, domain: a.domain,
      playersHere: Array.from(this.state.players.values())
        .filter((p) => p.location === a.id && p.state !== PlayerState.Dead).map((p) => p.id),
    }))
    const totalDiscard =
      this.state.cardsDiscard.white.length +
      this.state.cardsDiscard.black.length +
      this.state.cardsDiscard.hermit.length
    return {
      phase: this.state.phase, round: this.state.round,
      turnPlayerId: this.state.turnPlayerId,
      turnPlayerNumber: this.state.turnPlayerId
        ? this.state.players.get(this.state.turnPlayerId)?.number ?? null : null,
      players, areas,
      decks: {
        white: this.state.cardsDeck.white.length,
        black: this.state.cardsDeck.black.length,
        hermit: this.state.cardsDeck.hermit.length,
        discard: totalDiscard,
      },
      eventLog: this.state.eventLog,
      areaPairs: Array.from(this.state.areaPairs.entries()),
      gameOver: this.state.gameOver, winners: this.state.winners,
      availableActions: this.state.availableActions, currentRoll: this.state.currentRoll,
    }
  }

  getPrivateView(forPlayerId: PlayerId): PlayerPrivateView | null {
    const p = this.state.players.get(forPlayerId)
    if (!p) return null
    const characterId = this.state.characterAssignments.get(p.id)
    let character: any = null
    if (characterId) {
      const ch = this.state.charactersPool.find((c) => c.id === characterId)
      if (ch) {
        character = {
          id: ch.id, name: ch.name, allegiance: ch.allegiance, maxDamage: ch.maxDamage,
          specialDesc: ch.specialDesc, revealed: p.state === PlayerState.Revealed,
          winConditionDesc: ch.winConditionDesc,
        }
      }
    }
    const hand = p.hand.map((cid) => {
      const card = this.findCard(cid)
      return card
        ? { id: card.id, title: card.title, type: card.type, description: card.description, isEquipment: card.isEquipment, holder: card.holder, emoji: card.emoji }
        : { id: cid, title: 'Inconnu', type: CardType.White, description: '', isEquipment: false, holder: null }
    })
    const equipment = p.equipment.map((cid) => {
      const card = this.findCard(cid)
      return card
        ? { id: card.id, title: card.title, type: card.type, description: card.description, isEquipment: card.isEquipment, holder: card.holder, emoji: card.emoji }
        : { id: cid, title: 'Inconnu', type: CardType.White, description: '', isEquipment: false, holder: null }
    })
    return { character, hand, fullEquipment: equipment }
  }

  getFullView(): GameState { return this.state }

  private findCard(cardId: CardId): CardRecord | undefined {
    for (const deck of Object.values(this.state.cardsDeck)) {
      const c = deck.find((card) => card.id === cardId)
      if (c) return c
    }
    for (const discard of Object.values(this.state.cardsDiscard)) {
      const c = discard.find((card) => card.id === cardId)
      if (c) return c
    }
    return getAllCards().find((c) => c.id === cardId)
  }

  assignCharacters(): { events: GameEvent[]; assignments: Map<PlayerId, CharacterId> } {
    if (this.state.phase !== Phase.Setup) {
      throw new Error('L\'attribution des personnages ne peut se faire qu\'en phase Setup')
    }
    const alivePlayers = Array.from(this.state.players.values()).filter(
      (p) => p.state !== PlayerState.Dead
    )
    const totalNeeded = alivePlayers.length
    const fc = this.state.config.factionCounts
    const shadows = shuffle([...CHARACTERS.filter((c) => c.allegiance === 'shadow')])
    const hunters = shuffle([...CHARACTERS.filter((c) => c.allegiance === 'hunter')])
    const neutrals = shuffle([...CHARACTERS.filter((c) => c.allegiance === 'neutral')])
    const selected = [
      ...shadows.slice(0, fc.shadow),
      ...hunters.slice(0, fc.hunter),
      ...neutrals.slice(0, fc.neutral),
    ]
    if (selected.length < totalNeeded) {
      throw new Error(`Pas assez de personnages pour ${totalNeeded} joueurs`)
    }
    const shuffled = shuffle(selected.slice(0, totalNeeded))
    const assignments = new Map<PlayerId, CharacterId>()
    alivePlayers.forEach((p, i) => { assignments.set(p.id, shuffled[i].id) })
    this.state.characterAssignments = assignments
    assignments.forEach((cid, pid) => {
      const ch = this.state.charactersPool.find((c) => c.id === cid)
      const player = this.state.players.get(pid)
      if (ch && player) { player.maxDamage = ch.maxDamage; player.damage = 0 }
    })
    this.state.phase = Phase.TurnStart
    this.state.round = 1
    this.state.turnPlayerIndex = 0
    this.state.turnPlayerId = this.state.turnOrder[0]
    const events: GameEvent[] = [
      { type: 'message', timestamp: now(), data: { text: 'Personnages attribués. La partie commence.' } },
      { type: 'turn_start', timestamp: now(), actor: this.state.turnPlayerId, data: { turnPlayerId: this.state.turnPlayerId } },
    ]
    this.state.eventLog.push(...events)
    this.setAvailableActions()
    return { events, assignments }
  }

  rollDie(actorId: PlayerId): { roll: number; events: GameEvent[] } {
    if (this.state.phase !== Phase.TurnStart && this.state.phase !== Phase.Movement) {
      throw new Error('Le lancer de dé n\'est pas autorisé à cette phase')
    }
    if (this.state.turnPlayerId !== actorId) {
      throw new Error('Ce n\'est pas votre tour')
    }
    const player = this.state.players.get(actorId)
    if (!player) throw new Error('Joueur introuvable')

    let roll = 0
    let area: AreaRecord | undefined
    do {
      roll = (Math.floor(Math.random() * 4) + 1) + (Math.floor(Math.random() * 6) + 1)
      area = areaForRoll(roll)
    } while (roll !== 7 && area && player.location && area.id === player.location)

    this.state.currentRoll = roll
    this.state.phase = Phase.Movement
    const events: GameEvent[] = [
      { type: 'roll', timestamp: now(), actor: actorId, data: { roll, area: area?.name ?? null } },
    ]
    if (roll === 7) {
      this.state.availableActions = [ActionType.ChooseArea]
      events.push({ type: 'message', timestamp: now(), actor: actorId, data: { text: 'Vous pouvez choisir n\'importe quel lieu.' } })
    } else if (area) {
      this.movePlayer(actorId, area.id)
      events.push({ type: 'move', timestamp: now(), actor: actorId, data: { playerId: actorId, areaId: area.id } })
      this.state.availableActions = [ActionType.UseAreaAction, ActionType.DeclineAreaAction, ActionType.EndTurn]
    }
    this.state.eventLog.push(...events)
    return { roll, events }
  }

  chooseArea(actorId: PlayerId, areaId: AreaId): { events: GameEvent[] } {
    if (this.state.turnPlayerId !== actorId) throw new Error('Ce n\'est pas votre tour')
    if (this.state.currentRoll !== 7) throw new Error('Le choix de zone n\'est autorisé qu\'après un lancer de 7')
    const area = this.state.areas.get(areaId)
    if (!area) throw new Error('Zone inconnue')
    this.movePlayer(actorId, areaId)
    this.state.currentRoll = null
    this.state.availableActions = [ActionType.UseAreaAction, ActionType.DeclineAreaAction, ActionType.EndTurn]
    const events: GameEvent[] = [
      { type: 'move', timestamp: now(), actor: actorId, data: { playerId: actorId, areaId: area.id } },
      { type: 'message', timestamp: now(), actor: actorId, data: { text: `Déplacement vers ${area.name}.` } },
    ]
    this.state.eventLog.push(...events)
    return { events }
  }

  private movePlayer(playerId: PlayerId, areaId: AreaId): void {
    const player = this.state.players.get(playerId)
    if (!player) throw new Error('Joueur introuvable')
    player.location = areaId
  }

  useAreaAction(actorId: PlayerId, targetId?: PlayerId, choice?: string): { events: GameEvent[] } {
    if (this.state.turnPlayerId !== actorId) throw new Error('Ce n\'est pas votre tour')
    const player = this.state.players.get(actorId)
    if (!player || !player.location) throw new Error('Vous n\'êtes sur aucun lieu')
    const area = this.state.areas.get(player.location)
    if (!area) throw new Error('Lieu inconnu')
    this.state.phase = Phase.AreaAction
    this.state.availableActions = []
    const result = area.action(this.state, player, targetId, choice)
    const events: GameEvent[] = result.events ?? []
    if (result.message) {
      events.push({ type: 'message', timestamp: now(), actor: actorId, data: { text: result.message } })
    }
    events.push({ type: 'area_action', timestamp: now(), actor: actorId, target: targetId, data: { areaId: area.id, areaName: area.name } })
    this.state.eventLog.push(...events)
    this.state.availableActions = [ActionType.AttackPlayer, ActionType.DeclineAttack, ActionType.EndTurn, ActionType.UseCard, ActionType.UseSpecial]
    this.state.phase = Phase.Attack
    return { events }
  }

  useCard(actorId: PlayerId, cardId: CardId, targetId?: PlayerId): { events: GameEvent[] } {
    const player = this.state.players.get(actorId)
    if (!player) throw new Error('Joueur introuvable')
    if (this.state.turnPlayerId !== actorId) throw new Error('Ce n\'est pas votre tour')
    if (!player.equipment.includes(cardId) && !player.hand.includes(cardId)) throw new Error('Vous ne possedez pas cette carte')
    const card = this.findCard(cardId)
    if (!card) throw new Error('Carte introuvable')
    if (!card.use) throw new Error('Cette carte ne peut pas être utilisée')
    const target = targetId ? this.state.players.get(targetId) : undefined
    const result = card.use(this.state, player, target)
    if (!result.success) throw new Error(result.message || 'Échec de l\'utilisation de la carte')
    if (!card.isEquipment) {
      player.equipment = player.equipment.filter((cid) => cid !== cardId)
      player.hand = player.hand.filter((cid) => cid !== cardId)
      this.state.cardsDiscard[card.type].push(card)
    }
    const events: GameEvent[] = result.events ?? []
    if (result.message) {
      events.push({ type: 'message', timestamp: now(), actor: actorId, data: { text: result.message } })
    }
    events.push({ type: 'card_used', timestamp: now(), actor: actorId, target: targetId, data: { card: card.title, cardId: card.id, type: card.type } })
    this.state.eventLog.push(...events)
    this.checkWinConditions()
    this.state.availableActions = [ActionType.EndTurn]
    this.state.phase = Phase.TurnEnd
    return { events }
  }

  useSpecial(actorId: PlayerId, targetId?: PlayerId): { events: GameEvent[] } {
    const player = this.state.players.get(actorId)
    if (!player) throw new Error('Joueur introuvable')
    if (this.state.turnPlayerId !== actorId) throw new Error('Ce n\'est pas votre tour')
    const cid = this.state.characterAssignments.get(actorId)
    if (!cid) throw new Error('Vous n\'avez pas de personnage attribué')
    const character = this.state.charactersPool.find((c) => c.id === cid)
    if (!character) throw new Error('Personnage introuvable')
if (character.specialUsed) throw new Error('Capacité spéciale déjà utilisée')
    const context: SpecialContext = { type: 'now', target: targetId }
    const result = character.special(this.state, player, context)
    if (!result.success) throw new Error(result.message || 'La capacité spéciale ne peut pas être utilisée maintenant')
    const events: GameEvent[] = result.events ?? []
    if (result.message) {
      events.push({ type: 'message', timestamp: now(), actor: actorId, target: targetId, data: { text: result.message } })
    }
    events.push({ type: 'message', timestamp: now(), actor: actorId, data: { text: `${player.name} utilise sa capacité spéciale.` } })
    this.state.eventLog.push(...events)
    this.checkWinConditions()
    this.state.availableActions = [ActionType.EndTurn]
    this.state.phase = Phase.TurnEnd
    return { events }
  }

  declineAreaAction(actorId: PlayerId): { events: GameEvent[] } {
    if (this.state.turnPlayerId !== actorId) throw new Error('Ce n\'est pas votre tour')
    this.state.availableActions = [ActionType.AttackPlayer, ActionType.DeclineAttack, ActionType.EndTurn]
    this.state.phase = Phase.Attack
    const events: GameEvent[] = [
      { type: 'message', timestamp: now(), actor: actorId, data: { text: 'Action de lieu refusée.' } },
    ]
    this.state.eventLog.push(...events)
    return { events }
  }

  attackPlayer(actorId: PlayerId, targetId: PlayerId): { events: GameEvent[] } {
    if (this.state.turnPlayerId !== actorId) throw new Error('Ce n\'est pas votre tour')
    if (this.state.phase !== Phase.Attack) throw new Error('La phase d\'attaque n\'est pas active')
    const actor = this.state.players.get(actorId)
    const target = this.state.players.get(targetId)
    if (!actor || !target) throw new Error('Joueur introuvable')
    if (target.state === PlayerState.Dead) throw new Error('Le joueur cible est déjà mort')
    const hasMasamune = actor.equipment.includes('cursed_sword_masamune' as any)
    const hasHandgun = actor.equipment.includes('handgun' as any)
    const hasSpear = actor.equipment.includes('spear_of_longinus' as any)

    const pairedArea = actor.location ? this.state.areaPairs.get(actor.location) : undefined
    const sameOrPaired = actor.location === target.location || (pairedArea !== undefined && pairedArea === target.location)
    const inRange = hasHandgun ? !sameOrPaired : sameOrPaired
    if (!inRange) {
      throw new Error('Vous devez être sur le même lieu ou le lieu pair pour attaquer')
    }

    const r4 = Math.floor(Math.random() * 4) + 1
    const r6 = hasMasamune ? 0 : Math.floor(Math.random() * 6) + 1
    let damage = hasMasamune ? r4 : Math.abs(r4 - r6)

    const cid = this.state.characterAssignments.get(actorId)
    const ch = cid ? this.state.charactersPool.find((c) => c.id === cid) : null
    if (damage > 0 && hasSpear && ch?.allegiance === 'hunter' && actor.state === PlayerState.Revealed) {
      damage += 2
    }

    this.state.availableActions = []
    const events: GameEvent[] = [
      { type: 'attack', timestamp: now(), actor: actorId, target: targetId, data: { roll: damage, r4, r6, target: targetId } },
    ]
    if (damage > 0) {
      this.applyDamage(targetId, damage, actorId)
      events.push({ type: 'damage', timestamp: now(), actor: actorId, target: targetId, data: { target: targetId, amount: damage, attacker: actorId } })
    } else {
      events.push({ type: 'message', timestamp: now(), actor: actorId, data: { text: 'L\'attaque a échoué (dégâts : 0).' } })
    }
    this.checkWinConditions()
    this.state.availableActions = [ActionType.EndTurn]
    this.state.phase = Phase.TurnEnd
    this.state.eventLog.push(...events)
    return { events }
  }

  declineAttack(actorId: PlayerId): { events: GameEvent[] } {
    if (this.state.turnPlayerId !== actorId) throw new Error('Ce n\'est pas votre tour')
    this.state.availableActions = [ActionType.EndTurn]
    this.state.phase = Phase.TurnEnd
    const events: GameEvent[] = [
      { type: 'message', timestamp: now(), actor: actorId, data: { text: 'Attaque refusée.' } },
    ]
    this.state.eventLog.push(...events)
    return { events }
  }

  applyDamage(targetId: PlayerId, amount: number, attackerId?: PlayerId): void {
    const target = this.state.players.get(targetId)
    if (!target) throw new Error('Joueur cible introuvable')
    if (target.state === PlayerState.Dead) return
    target.damage += amount
    if (target.damage >= target.maxDamage) {
      this.killPlayer(targetId, attackerId)
    }
  }

  private killPlayer(targetId: PlayerId, attackerId?: PlayerId): void {
    const target = this.state.players.get(targetId)
    if (!target) return
    target.state = PlayerState.Dead
    target.location = null
    const events: GameEvent[] = [
      { type: 'death', timestamp: now(), actor: attackerId, target: targetId, data: { player: targetId, attacker: attackerId ?? null } },
      { type: 'message', timestamp: now(), data: { text: `${target.name} est mort.` } },
    ]
    this.state.eventLog.push(...events)
    const equipment = [...target.equipment]
    target.equipment = []
    if (attackerId) {
      const attacker = this.state.players.get(attackerId)
      const hasSilverRosary = equipment.some((cid) => {
        const card = this.findCard(cid)
        return card && card.resourceId === 'silverrosary'
      })
      if (hasSilverRosary && attacker) {
        attacker.equipment.push(...equipment)
        equipment.forEach((cid) => {
          const card = this.findCard(cid)
          if (card) card.holder = attackerId
        })
        events.push({ type: 'equipment_stolen', timestamp: now(), actor: attackerId, target: targetId, data: { from: targetId, to: attackerId } })
      }
    }
    equipment.forEach((cid) => {
      const card = this.findCard(cid)
      if (card && card.type === CardType.Black) { this.state.cardsDiscard.black.push(card) }
      else if (card && card.type === CardType.White) { this.state.cardsDiscard.white.push(card) }
    })
    this.checkWinConditions()
  }

  endTurn(actorId: PlayerId): { events: GameEvent[] } {
    if (this.state.turnPlayerId !== actorId) throw new Error('Ce n\'est pas votre tour')
    const events: GameEvent[] = [
      { type: 'turn_end', timestamp: now(), actor: actorId, data: { player: actorId } },
    ]
    this.state.eventLog.push(...events)
    const currentIndex = this.state.turnOrder.indexOf(actorId)
    const nextIndex = (currentIndex + 1) % this.state.turnOrder.length
    this.state.turnPlayerIndex = nextIndex
    this.state.turnPlayerId = this.state.turnOrder[nextIndex]
    if (nextIndex === 0) this.state.round++
    this.state.currentRoll = null
    this.state.phase = Phase.TurnStart
    this.state.availableActions = []
    events.push({ type: 'turn_start', timestamp: now(), actor: this.state.turnPlayerId, data: { turnPlayerId: this.state.turnPlayerId } })
    this.state.eventLog.push(...events)
    this.setAvailableActions()
    return { events }
  }

  revealCharacter(actorId: PlayerId): { events: GameEvent[] } {
    const player = this.state.players.get(actorId)
    if (!player) throw new Error('Joueur introuvable')
    if (player.state === PlayerState.Dead) throw new Error('Un joueur mort ne peut pas se révéler')
if (this.state.gameOver) throw new Error('La partie est terminée')
    if (player.state === PlayerState.Revealed) throw new Error('Vous êtes déjà révélé')
    player.state = PlayerState.Revealed
    const characterId = this.state.characterAssignments.get(actorId)
    const character = characterId ? this.state.charactersPool.find((c) => c.id === characterId) : null
    const events: GameEvent[] = [
      { type: 'reveal', timestamp: now(), actor: actorId, data: { player: actorId, character: character?.name ?? null } },
      { type: 'message', timestamp: now(), data: { text: `${player.name} a révélé son identité : ${character?.name ?? '?'}.` } },
    ]
    this.state.eventLog.push(...events)
    this.checkWinConditions()
    return { events }
  }

  checkWinConditions(): { winners: PlayerId[]; gameOver: boolean } {
    if (this.state.gameOver) {
      return { winners: this.state.winners, gameOver: true }
    }
    const winners: PlayerId[] = []
    const aliveShadows = this.countAliveByAllegiance('shadow')
    const aliveHunters = this.countAliveByAllegiance('hunter')
    if (aliveHunters === 0 && aliveShadows > 0) {
      this.state.players.forEach((p) => {
        const cid = this.state.characterAssignments.get(p.id)
        if (cid) { const ch = this.state.charactersPool.find((c) => c.id === cid); if (ch?.allegiance === 'shadow') winners.push(p.id) }
      })
    } else if (aliveShadows === 0 && aliveHunters > 0) {
      this.state.players.forEach((p) => {
        const cid = this.state.characterAssignments.get(p.id)
        if (cid) { const ch = this.state.charactersPool.find((c) => c.id === cid); if (ch?.allegiance === 'hunter') winners.push(p.id) }
      })
    }
    this.state.players.forEach((p) => {
      if (p.state === PlayerState.Dead) return
      const cid = this.state.characterAssignments.get(p.id)
      if (!cid) return
      const ch = this.state.charactersPool.find((c) => c.id === cid)
      if (ch && ch.allegiance === 'neutral' && ch.winCondition(this.state, p)) {
        winners.push(p.id)
      }
    })
    if (winners.length > 0) {
      this.state.gameOver = true
      this.state.winners = winners
      this.state.phase = Phase.GameOver
      this.state.availableActions = []
      this.state.eventLog.push({ type: 'win', timestamp: now(), data: { winners } })
    }
    return { winners: this.state.winners, gameOver: this.state.gameOver }
  }

  private countAliveByAllegiance(alleg: string): number {
    return Array.from(this.state.players.values()).filter((p) => {
      if (p.state === PlayerState.Dead) return false
      const cid = this.state.characterAssignments.get(p.id)
      if (!cid) return false
      const ch = this.state.charactersPool.find((c) => c.id === cid)
      return ch?.allegiance === alleg
    }).length
  }

  drawCard(actorId: PlayerId, type: CardType): { card: CardRecord | null; events: GameEvent[] } {
    const deck = this.state.cardsDeck[type]
    if (!deck || deck.length === 0) {
      const discard = this.state.cardsDiscard[type]
      if (discard.length === 0) { return { card: null, events: [] } }
      this.state.cardsDeck[type] = shuffle(discard)
      this.state.cardsDiscard[type] = []
    }
    const card = deck.pop()!
    card.holder = actorId
    const player = this.state.players.get(actorId)
    if (player && !player.equipment.includes(card.id)) { player.equipment.push(card.id) }
    const events: GameEvent[] = [
      { type: 'card_drawn', timestamp: now(), actor: actorId, data: { player: actorId, card: card.title, type } },
    ]
    this.state.eventLog.push(...events)
    return { card, events }
  }

  canExecute(actorId: PlayerId, action: ActionType): boolean {
    if (this.state.gameOver) return false
    if (this.state.turnPlayerId !== actorId) return false
    return this.state.availableActions.includes(action)
  }

  private triggerStartSpecials(actorId: PlayerId): void {
    const player = this.state.players.get(actorId)
    if (!player) return
    const cid = this.state.characterAssignments.get(actorId)
    if (!cid) return
    const character = this.state.charactersPool.find((c) => c.id === cid)
    if (!character || character.specialUsed) return
    const context: SpecialContext = { type: 'start', target: undefined }
    const result = character.special(this.state, player, context)
    if (result.success && result.events) {
      this.state.eventLog.push(...result.events)
      if (result.events.some((e) => e.type === 'damage' || e.type === 'death')) {
        this.checkWinConditions()
      }
    }
  }

  private setAvailableActions(): void {
    const tp = this.state.turnPlayerId
    if (!tp) { this.state.availableActions = []; return }
    switch (this.state.phase) {
      case Phase.TurnStart: this.triggerStartSpecials(tp); this.state.availableActions = [ActionType.RollDie]; break
      case Phase.Movement:
        this.state.availableActions = this.state.currentRoll === 7
          ? [ActionType.ChooseArea]
          : [ActionType.UseAreaAction, ActionType.DeclineAreaAction, ActionType.EndTurn]
        break
      case Phase.AreaAction:
        this.state.availableActions = [ActionType.UseAreaAction, ActionType.DeclineAreaAction]
        break
      case Phase.Attack:
        this.state.availableActions = [ActionType.AttackPlayer, ActionType.DeclineAttack, ActionType.EndTurn, ActionType.UseCard, ActionType.UseSpecial]
        break
      case Phase.TurnEnd: this.state.availableActions = [ActionType.EndTurn]; break
      default: this.state.availableActions = []
    }
  }
}


