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
  { id: "blessing" as CardId, title: "Benediction", type: CardType.White, description: "Choisissez un joueur et lancez un de a 6 faces. Il soigne ce montant.", isEquipment: false, holder: null, resourceId: "blessing", use: (state, player, target) => {
    if (!target) return { success: false, message: "Vous devez choisir une cible." }
    const t = state.players.get(target.id)
    if (!t) return { success: false, message: "Cible introuvable." }
    if (t.id === player.id) return { success: false, message: "Vous ne pouvez pas vous cibler." }
    const roll = Math.floor(Math.random() * 6) + 1
    t.damage = Math.max(0, t.damage - roll)
    return { success: true, message: t.name + " soigne " + roll + " degats.", events: [{ type: "heal", timestamp: Date.now(), actor: player.id, target: t.id, data: { player: t.id, amount: roll } }] }
  } },
  { id: "chocolate" as CardId, title: "Chocolat", type: CardType.White, description: "Si votre nom commence par A, E ou U, revelez et soignez-vous.", isEquipment: false, holder: null, resourceId: "chocolate", use: (state, player) => {
    const name = player.name.toUpperCase()
    if (!name.startsWith("A") && !name.startsWith("E") && !name.startsWith("U")) return { success: false, message: "Votre nom ne commence pas par A, E ou U." }
    player.state = PlayerState.Revealed
    player.damage = 0
    const cid = state.characterAssignments.get(player.id)
    const ch = cid ? state.charactersPool.find((c) => c.id === cid) : null
    return { success: true, message: player.name + " se revele et est soigne.", events: [{ type: "reveal", timestamp: Date.now(), actor: player.id, data: { player: player.id, character: ch?.name ?? null } }, { type: "heal", timestamp: Date.now(), actor: player.id, data: { player: player.id, amount: player.maxDamage } }] }
  } },
  { id: "concealed_knowledge" as CardId, title: "Savoir Cache", type: CardType.White, description: "Une fois ce tour termine, vous rejouez un tour.", isEquipment: false, holder: null, resourceId: "concealedknowledge", use: (state, player) => {
    return { success: true, message: player.name + " rejouera un tour.", events: [{ type: "message", timestamp: Date.now(), data: { text: player.name + " rejouera un tour apres ce tour." } }] }
  } },
  { id: "first_aid" as CardId, title: "Premiers Secours", type: CardType.White, description: "Mettez les degats d un joueur a 7.", isEquipment: false, holder: null, resourceId: "firstaid", use: (state, player, target) => {
    if (!target) return { success: false, message: "Vous devez choisir une cible." }
    const t = state.players.get(target.id)
    if (!t) return { success: false, message: "Cible introuvable." }
    t.damage = Math.min(7, t.maxDamage)
    return { success: true, message: t.name + " a maintenant " + t.damage + " degats.", events: [{ type: "heal", timestamp: Date.now(), actor: player.id, target: t.id, data: { player: t.id, amount: 0 } }] }
  } },
  { id: "flare_of_judgement" as CardId, title: "Eclair du Jugement", type: CardType.White, description: "Tous les joueurs sauf vous subissent 2 degats.", isEquipment: false, holder: null, resourceId: "flareofjudgement", use: (state, player) => {
    const events: any[] = []
    for (const p of state.players.values()) {
      if (p.id === player.id || p.state === PlayerState.Dead) continue
      p.damage += 2
      events.push({ type: "damage", timestamp: Date.now(), actor: player.id, target: p.id, data: { target: p.id, amount: 2, attacker: player.id } })
      if (p.damage >= p.maxDamage) { p.state = PlayerState.Dead; p.location = null; events.push({ type: "death", timestamp: Date.now(), actor: player.id, target: p.id, data: { target: p.id, amount: 2, attacker: player.id } }) }
    }
    return { success: true, message: "Tous les autres joueurs subissent 2 degats.", events }
  } },
  { id: "guardian_angel" as CardId, title: "Ange Gardien", type: CardType.White, description: "Vous ne subissez aucun degat d une attaque jusqu a votre prochain tour.", isEquipment: false, holder: null, resourceId: "guardianangel", use: (state, player) => {
    return { success: true, message: player.name + " est protege jusqu a son prochain tour.", events: [{ type: "message", timestamp: Date.now(), data: { text: player.name + " est protege." } }] }
  } },
  { id: "holy_robe" as CardId, title: "Robe Sacree", type: CardType.White, description: "Equipement vos attaques font 1 degat de moins.", isEquipment: true, holder: null, resourceId: "holyrobe", use: noUse },
  { id: "holy_water" as CardId, title: "Eau Benite", type: CardType.White, description: "Soignez 2 degats.", isEquipment: false, holder: null, resourceId: "holywater", use: (state, player) => {
    player.damage = Math.max(0, player.damage - 2)
    return { success: true, message: player.name + " soigne 2 degats.", events: [{ type: "heal", timestamp: Date.now(), actor: player.id, data: { player: player.id, amount: 2 } }] }
  } },
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
  { id: "butcher_knife" as CardId, title: "Couteau de Boucher", type: CardType.Black, description: "Equipement +1 degat si attaque reussit.", isEquipment: true, holder: null, resourceId: "butcherknife", use: noUse },
  { id: "chainsaw" as CardId, title: "Tronconneuse", type: CardType.Black, description: "Equipement +1 degat si attaque reussit.", isEquipment: true, holder: null, resourceId: "chainsaw", use: noUse },
  { id: "handgun" as CardId, title: "Pistolet", type: CardType.Black, description: "Equipement portee toutes zones sauf la votre.", isEquipment: true, holder: null, resourceId: "handgun", use: noUse },
  { id: "machine_gun" as CardId, title: "Mitraillette", type: CardType.Black, description: "Equipement attaques ciblent tous les joueurs a portee.", isEquipment: true, holder: null, resourceId: "machinegun", use: noUse },
  { id: "masamune" as CardId, title: "Masamune", type: CardType.Black, description: "Equipement doit attaquer si possible.", isEquipment: true, holder: null, resourceId: "masamune", use: noUse },
  { id: "rusted_broad_axe" as CardId, title: "Hache Rouillee", type: CardType.Black, description: "Equipement +1 degat si attaque reussit.", isEquipment: true, holder: null, resourceId: "rustedbroadaxe", use: noUse },
  { id: "banana_peel" as CardId, title: "Peau de Banane", type: CardType.Black, description: "Donnez un equipement a un joueur ou subissez 1 degat.", isEquipment: false, holder: null, resourceId: "bananapeel", use: (state, player, target) => {
    if (!target) return { success: false, message: "Vous devez choisir une cible." }
    const t = state.players.get(target.id)
    if (!t) return { success: false, message: "Cible introuvable." }
    if (player.equipment.length === 0) { player.damage += 1; return { success: true, message: "Pas equipement: 1 degat.", events: [{ type: "damage", timestamp: Date.now(), actor: player.id, target: player.id, data: { target: player.id, amount: 1, attacker: player.id } }] } }
    const stolen = player.equipment.shift()!
    if (!t.equipment.includes(stolen)) t.equipment.push(stolen)
    return { success: true, message: "Vous donnez un equipement a " + t.name, events: [{ type: "equipment_stolen", timestamp: Date.now(), actor: player.id, target: t.id, data: { from: player.id, to: t.id, card: stolen } }] }
  } },
  { id: "diabolic_ritual" as CardId, title: "Rituel Diabolique", type: CardType.Black, description: "Si Ombre, revelez et soignez-vous.", isEquipment: false, holder: null, resourceId: "diabolicritual", use: (state, player) => {
    const cid = state.characterAssignments.get(player.id)
    const ch = cid ? state.charactersPool.find((c) => c.id === cid) : null
    if (!ch || ch.allegiance !== "shadow") return { success: false, message: "Seule une Ombre peut utiliser." }
    player.state = PlayerState.Revealed
    player.damage = 0
    return { success: true, message: player.name + " se revele Ombre.", events: [{ type: "reveal", timestamp: Date.now(), actor: player.id, data: { player: player.id, character: ch.name } }, { type: "heal", timestamp: Date.now(), actor: player.id, data: { player: player.id, amount: player.maxDamage } }] }
  } },
  { id: "moody_goblin" as CardId, title: "Gobelin Humeur", type: CardType.Black, description: "Volez un equipement a un joueur.", isEquipment: false, holder: null, resourceId: "moodygoblin", use: (state, player, target) => {
    if (!target) return { success: false, message: "Vous devez choisir une cible." }
    const t = state.players.get(target.id)
    if (!t) return { success: false, message: "Cible introuvable." }
    if (t.state === PlayerState.Dead) return { success: false, message: "La cible est deja morte." }
    if (t.equipment.length === 0) return { success: false, message: t.name + " na aucun equipement." }
    const stolen = t.equipment.shift()!
    if (!player.equipment.includes(stolen)) player.equipment.push(stolen)
    return { success: true, message: "Vous volez un equipement a " + t.name, events: [{ type: "equipment_stolen", timestamp: Date.now(), actor: player.id, target: t.id, data: { from: t.id, to: player.id, card: stolen } }] }
  } },
  { id: "spiritual_doll" as CardId, title: "Poupee Spirituelle", type: CardType.Black, description: "Lancez un de a 6 faces: 1-4 = 3 degats a la cible, 5-6 = 3 degats a vous.", isEquipment: false, holder: null, resourceId: "spiritualdoll", use: (state, player, target) => {
    if (!target) return { success: false, message: "Vous devez choisir une cible." }
    const t = state.players.get(target.id)
    if (!t) return { success: false, message: "Cible introuvable." }
    const roll = Math.floor(Math.random() * 6) + 1
    if (roll <= 4) {
      t.damage += 3
      const events = [{ type: "damage", timestamp: Date.now(), actor: player.id, target: t.id, data: { target: t.id, amount: 3, attacker: player.id } }]
      if (t.damage >= t.maxDamage) { t.state = PlayerState.Dead; t.location = null; events.push({ type: "death", timestamp: Date.now(), actor: player.id, target: t.id, data: { target: t.id, amount: 3, attacker: player.id } }) }
      return { success: true, message: "De " + roll + ": 3 degats a " + t.name, events }
    } else {
      player.damage += 3
      const events = [{ type: "damage", timestamp: Date.now(), actor: player.id, target: player.id, data: { target: player.id, amount: 3, attacker: player.id } }]
      if (player.damage >= player.maxDamage) { player.state = PlayerState.Dead; player.location = null; events.push({ type: "death", timestamp: Date.now(), actor: player.id, target: player.id, data: { target: player.id, amount: 3, attacker: player.id } }) }
      return { success: true, message: "De " + roll + ": 3 degats a vous.", events }
    }
  } },
]

export const HERMIT_CARDS: CardRecord[] = [
  {
    id: 'hermit_vision' as CardId, title: 'Carte Vision', type: CardType.Hermit,
    description: 'Donnez cette carte a un joueur. S il est une Ombre, il perd 1 PV.',
    isEquipment: false, holder: null, resourceId: 'hermitvision', emoji: '👁',
    use: (state, player, target) => {
      if (!target) return { success: false, message: 'Vous devez choisir une cible.' }
      const tPlayer = state.players.get(target.id)
      if (!tPlayer) return { success: false, message: 'Cible introuvable.' }
      if (tPlayer.state === PlayerState.Dead) return { success: false, message: 'La cible est deja morte.' }
      const cid = state.characterAssignments.get(target.id)
      const ch = cid ? state.charactersPool.find((c) => c.id === cid) : null
      if (ch && ch.allegiance === 'shadow') {
        tPlayer.damage += 1
        const events = [{ type: 'damage', timestamp: Date.now(), actor: player.id, target: target.id, data: { target: target.id, amount: 1, attacker: player.id } }]
        if (tPlayer.damage >= tPlayer.maxDamage) {
          tPlayer.state = PlayerState.Dead
          tPlayer.location = null
          events.push({ type: 'death', timestamp: Date.now(), actor: player.id, target: target.id, data: { target: target.id, amount: 1, attacker: player.id } })
        }
        return { success: true, message: target.name + ' est une Ombre et perd 1 PV.', events }
      }
      return { success: true, message: target.name + ' n est pas une Ombre.', events: [] }
    },
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





