/**
 * Types partagés du moteur de règles Shadow Hunters.
 * Ce module est totalement indépendant de React, du DOM et du serveur.
 * Il peut être testé unitairement sans aucune dépendance d'interface.
 */

export type PlayerId = string & { __brand: 'PlayerId' }
export type SessionId = string & { __brand: 'SessionId' }
export type CharacterId = string & { __brand: 'CharacterId' }
export type CardId = string & { __brand: 'CardId' }
export type AreaId = string & { __brand: 'AreaId' }

export enum Allegiance {
  Shadow = 'shadow',
  Hunter = 'hunter',
  Neutral = 'neutral',
}

export enum PlayerState {
  Hidden = 'hidden',
  Revealed = 'revealed',
  Dead = 'dead',
}

export enum CardType {
  White = 'white',
  Black = 'black',
  Hermit = 'hermit',
}

export enum Phase {
  Lobby = 'lobby',
  Setup = 'setup',
  TurnStart = 'turn_start',
  Movement = 'movement',
  AreaAction = 'area_action',
  Attack = 'attack',
  Resolution = 'resolution',
  TurnEnd = 'turn_end',
  GameOver = 'game_over',
}

export enum ActionType {
  RollDie = 'roll_die',
  ChooseArea = 'choose_area',
  MoveToArea = 'move_to_area',
  UseAreaAction = 'use_area_action',
  DeclineAreaAction = 'decline_area_action',
  AttackPlayer = 'attack_player',
  DeclineAttack = 'decline_attack',
  Reveal = 'reveal',
  UseSpecial = 'use_special',
  UseCard = 'use_card',
  EndTurn = 'end_turn',
  ChooseTarget = 'choose_target',
  ChooseEquipment = 'choose_equipment',
  HealDamage = 'heal_damage',
  DealDamage = 'deal_damage',
}

export interface PlayerView {
  id: PlayerId
  number: number
  name: string
  color: string
  state: PlayerState
  damage: number
  maxDamage: number
  isAlive: boolean
  isBot: boolean
  location: AreaId | null
  equipment: CardView[]
  specialActive: boolean
  character: CharacterView | null
}

export interface CharacterView {
  id: CharacterId
  name: string
  allegiance: Allegiance
  maxDamage: number
  specialDesc: string
  revealed: boolean
  winConditionDesc?: string
}

export interface CardView {
  id: CardId
  title: string
  type: CardType
  description: string
  isEquipment: boolean
  holder: PlayerId | null
}

export interface AreaView {
  id: AreaId
  name: string
  description: string
  domain: number[]
  playersHere: PlayerId[]
}

export interface GameConfig {
  playerCount: number
  botCount: number
  factionCounts: { shadow: number; hunter: number; neutral: number }
}

export interface GameEvent {
  type:
    | 'message'
    | 'join'
    | 'leave'
    | 'roll'
    | 'move'
    | 'area_action'
    | 'attack'
    | 'damage'
    | 'heal'
    | 'reveal'
    | 'death'
    | 'win'
    | 'card_drawn'
    | 'card_used'
    | 'equipment_stolen'
    | 'turn_start'
    | 'turn_end'
    | 'error'
  timestamp: number
  actor?: PlayerId
  target?: PlayerId
  data: Record<string, unknown>
}

export interface GameState {
  id: string
  phase: Phase
  round: number
  turnPlayerIndex: number
  turnPlayerId: PlayerId | null
  players: Map<PlayerId, PlayerRecord>
  turnOrder: PlayerId[]
  charactersPool: CharacterRecord[]
  cardsDeck: { white: CardRecord[]; black: CardRecord[]; hermit: CardRecord[] }
  cardsDiscard: { white: CardRecord[]; black: CardRecord[]; hermit: CardRecord[] }
  areas: Map<AreaId, AreaRecord>
  currentRoll: number | null
  availableActions: ActionType[]
  eventLog: GameEvent[]
  gameOver: boolean
  winners: PlayerId[]
  config: GameConfig
  characterAssignments: Map<PlayerId, CharacterId>
  specialsUsed: Set<PlayerId>
}

export interface PlayerRecord {
  id: PlayerId
  number: number
  name: string
  color: string
  state: PlayerState
  damage: number
  maxDamage: number
  isBot: boolean
  socketId: string | null
  location: AreaId | null
  equipment: CardId[]
  specialActive: boolean
  characterId: CharacterId | null
  delexicalization: number
}

export interface CharacterRecord {
  id: CharacterId
  name: string
  allegiance: Allegiance
  maxDamage: number
  winCondition: (state: GameState, player: PlayerRecord) => boolean
  winConditionDesc: string
  special: (state: GameState, player: PlayerRecord, context: SpecialContext) => SpecialResult
  specialDesc: string
  specialUsed: boolean
  resourceId: string
}

export interface SpecialContext {
  type: 'start' | 'end' | 'now' | 'on_death' | 'on_attack' | 'on_damage'
  target?: PlayerId
  rollResult?: number
  damageAmount?: number
}

export interface SpecialResult {
  success: boolean
  message?: string
  events?: GameEvent[]
}

export interface CardRecord {
  id: CardId
  title: string
  type: CardType
  description: string
  isEquipment: boolean
  holder: PlayerId | null
  resourceId: string
  use?: (state: GameState, player: PlayerRecord, target?: PlayerRecord) => SpecialResult
}

export interface AreaRecord {
  id: AreaId
  name: string
  description: string
  domain: number[]
  resourceId: string
  action: (state: GameState, player: PlayerRecord) => SpecialResult
}

export interface PlayerPublicView {
  id: PlayerId
  number: number
  name: string
  color: string
  state: PlayerState
  damage: number
  maxDamage: number
  isAlive: boolean
  isBot: boolean
  location: AreaId | null
  equipment: CardView[]
  specialActive: boolean
  character: CharacterView | null
}

export interface PlayerPrivateView {
  character: CharacterView | null
  hand: CardView[]
  fullEquipment: CardView[]
}

export interface GameView {
  public: {
    phase: Phase
    round: number
    turnPlayerId: PlayerId | null
    turnPlayerNumber: number | null
    players: PlayerPublicView[]
    areas: AreaView[]
    decks: { white: number; black: number; hermit: number; discard: number }
    eventLog: GameEvent[]
    gameOver: boolean
    winners: PlayerId[]
    availableActions: ActionType[]
    currentRoll: number | null
  }
  private: PlayerPrivateView | null
}