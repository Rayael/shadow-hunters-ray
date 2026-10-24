import {
  CardId,
  CardRecord,
  CardType,
  GameState,
  PlayerRecord,
  SpecialResult,
} from './types.js'

function noUse(): SpecialResult {
  return { success: true }
}

export const WHITE_CARDS: CardRecord[] = [
  {
    id: 'mystic_compass' as CardId, title: 'Boussole Mystique', type: CardType.White,
    description: 'Lorsque vous vous déplacez, vous pouvez lancer deux fois et choisir le résultat.',
    isEquipment: true, holder: null, resourceId: 'mysticcompass', use: noUse,
  },
  {
    id: 'talisman' as CardId, title: 'Talisman', type: CardType.White,
    description: 'Vous ne recevez aucun dégât des cartes Noires.',
    isEquipment: true, holder: null, resourceId: 'talisman', use: noUse,
  },
  {
    id: 'fortune_brooch' as CardId, title: 'Broche de la Fortune', type: CardType.White,
    description: 'Vous ne recevez aucun dégât de Bois Étrangers.',
    isEquipment: true, holder: null, resourceId: 'fortunebrooch', use: noUse,
  },
  {
    id: 'silver_rosary' as CardId, title: 'Rosen d\'Argent', type: CardType.White,
    description: 'Si vous tuez un autre personnage, vous prenez tout son équipement.',
    isEquipment: true, holder: null, resourceId: 'silverrosary', use: noUse,
  },
  {
    id: 'spear_of_longinus' as CardId, title: 'Lance de Longin', type: CardType.White,
    description: 'Chasseur révélé : +2 dégâts si votre attaque réussit.',
    isEquipment: true, holder: null, resourceId: 'spearoflonginus', use: noUse,
  },
  {
    id: 'advent' as CardId, title: 'Avènement', type: CardType.White,
    description: 'Chasseur : révélez votre identité et soignez-vous entièrement.',
    isEquipment: false, holder: null, resourceId: 'advent', use: noUse,
  },
  {
    id: 'disenchant_mirror' as CardId, title: 'Miroir de Désenvoûtement', type: CardType.White,
    description: 'Ombre (sauf Inconnu) : vous devez révéler votre identité.',
    isEquipment: false, holder: null, resourceId: 'disenchantmirror', use: noUse,
  },
  {
    id: 'blessing' as CardId, title: 'Bénédiction', type: CardType.White,
    description: 'Choisissez un personnage et lancez le dé 6 faces ; il se soigne du résultat.',
    isEquipment: false, holder: null, resourceId: 'blessing', use: noUse,
  },
]

export const BLACK_CARDS: CardRecord[] = [
  {
    id: 'vampire_bat' as CardId, title: 'Chauve-souris Vampirique', type: CardType.Black,
    description: 'Infligez 2 dégâts à un joueur.',
    isEquipment: false, holder: null, resourceId: 'vampirebat', use: noUse,
  },
  {
    id: 'dynamite' as CardId, title: 'Dynamite', type: CardType.Black,
    description: 'Infligez 2 dégâts à tous les joueurs sur votre lieu.',
    isEquipment: false, holder: null, resourceId: 'dynamite', use: noUse,
  },
  {
    id: 'spider' as CardId, title: 'Araignée Assoiffée de Sang', type: CardType.Black,
    description: 'Infligez 1 dégâts à un joueur.',
    isEquipment: false, holder: null, resourceId: 'spider', use: noUse,
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