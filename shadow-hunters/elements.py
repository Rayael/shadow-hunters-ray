import card
import deck
import character
import area
import single_use
import hermit
import win_conditions
import specials

from constants import Alleg, CardType

# elements.py
# Encodes all characters, win conditions, special abilities,
# game areas, decks, and cards in an element factory. Every
# game context is initialized with its own element factory.


class ElementFactory:
    """Make all elements needed for the game."""

    def __init__(self):

        # Initialize white cards
        white_cards = [
            card.Card(
                title="Boussole Mystique",
                desc="Lorsque vous vous déplacez, vous pouvez lancer deux fois et choisir le résultat à utiliser.",
                color=CardType.White,
                holder=None,
                is_equip=True,
                use=None
            ),
            card.Card(
                title="Talisman",
                desc="Vous ne recevez aucun dégât des cartes Noires 'Araignée Assoiffée de Sang', 'Chauve-souris Vampirique' ou 'Dynamite'.",
                color=CardType.White,
                holder=None,
                is_equip=True,
                use=None
            ),
            card.Card(
                title="Broche de la Fortune",
                desc="Vous ne recevez aucun dégât de la carte de zone 'Bois Étrangers'. Vous pouvez toujours y être soigné.",
                color=CardType.White,
                holder=None,
                is_equip=True,
                use=None
            ),
            card.Card(
                title="Rosen d'Argent",
                desc="Si vous tuez un autre personnage, vous prenez toutes ses cartes d'équipement.",
                color=CardType.White,
                holder=None,
                is_equip=True,
                use=None
            ),
            card.Card(
                title="Lance de Longin",
                desc="Si vous êtes un Chasseur ayant révélé votre identité et que votre attaque réussit, vous infligez 2 points de dégâts supplémentaires.",
                color=CardType.White,
                holder=None,
                is_equip=True,
                use=None
            ),
            card.Card(
                title="Avènement",
                desc="Si vous êtes un Chasseur, vous pouvez révéler votre identité. Si vous le faites, ou si vous êtes déjà révélé, vous vous soignez entièrement.",
                color=CardType.White,
                holder=None,
                is_equip=False,
                use=single_use.advent
            ),
            card.Card(
                title="Miroir de Désenvoûtement",
                desc="Si vous êtes une Ombre, sauf Inconnu, vous devez révéler votre identité.",
                color=CardType.White,
                holder=None,
                is_equip=False,
                use=single_use.disenchant_mirror
            ),
            card.Card(
                title="Bénédiction",
                desc="Choisissez un personnage autre que vous-même et lancez le dé à 6 faces. Ce personnage se soigne d'un montant de dégâts égal au résultat du dé.",
                color=CardType.White,
                holder=None,
                is_equip=False,
                use=single_use.blessing
            ),
            card.Card(
                title="Chocolat",
                desc="Si vous êtes Allie, Agnes, Emi, Ellen, Inconnu ou Ultra Soul, vous pouvez révéler votre identité. Si vous le faites, ou si vous êtes déjà révélé, vous vous soignez entièrement.",
                color=CardType.White,
                holder=None,
                is_equip=False,
                use=single_use.chocolate
            ),
            card.Card(
                title="Connaissance Cachée",
                desc="À la fin de ce tour, ce sera de nouveau votre tour.",
                color=CardType.White,
                holder=None,
                is_equip=False,
                use=single_use.concealed_knowledge
            ),
            card.Card(
                title="Ange Gardien",
                desc="Vous ne subissez aucun dégât des attaques directes des autres personnages jusqu'au début de votre prochain tour.",
                color=CardType.White,
                holder=None,
                is_equip=False,
                use=single_use.guardian_angel
            ),
            card.Card(
                title="Robe Sainte",
                desc="Vos attaques infligent 1 dégât de moins et les dégâts que vous recevez des attaques sont réduits de 1 point.",
                color=CardType.White,
                holder=None,
                is_equip=True,
                use=lambda is_attack, successful, amt: max(
                    0, amt - 1)  # applies to both attack and defend
            ),
            card.Card(
                title="Brasier du Jugement",
                desc="Tous les personnages sauf vous reçoivent 2 points de dégâts.",
                color=CardType.White,
                holder=None,
                is_equip=False,
                use=single_use.judgement
            ),
            card.Card(
                title="Premiers Secours",
                desc="Placez le marqueur de dégâts d'un personnage à 7 (vous pouvez vous choisir vous-même).",
                color=CardType.White,
                holder=None,
                is_equip=False,
                use=single_use.first_aid
            ),
            card.Card(
                title="Eau Sainte de Guérison",
                desc="Soignez 2 points de vos dégâts.",
                color=CardType.White,
                holder=None,
                is_equip=False,
                use=single_use.holy_water
            ),
            card.Card(
                title="Eau Sainte de Guérison",
                desc="Soignez 2 points de vos dégâts.",
                color=CardType.White,
                holder=None,
                is_equip=False,
                use=single_use.holy_water
            )
        ]

        # Initialize black cards
        black_cards = [
            card.Card(
                title="Épée Maudite Masamune",
                desc="Vous devez attaquer un autre personnage à votre tour. Cette attaque utilise le dé à 4 faces.",
                color=CardType.Black,
                holder=None,
                is_equip=True,
                use=None
            ),
            card.Card(
                title="Mitraillette",
                desc="Votre attaque touche tous les personnages à votre portée d'attaque (les dés ne sont lancés qu'une seule fois).",
                color=CardType.Black,
                holder=None,
                is_equip=True,
                use=None
            ),
            card.Card(
                title="Pistolet",
                desc="Toutes les portées sauf la vôtre deviennent votre portée d'attaque.",
                color=CardType.Black,
                holder=None,
                is_equip=True,
                use=None
            ),
            card.Card(
                title="Couteau de Boucher",
                desc="Si votre attaque réussit, vous infligez 1 point de dégât supplémentaire.",
                color=CardType.Black,
                holder=None,
                is_equip=True,
                use=lambda is_attack, successful, amt: amt +
                1 if (is_attack and successful) else amt
            ),
            card.Card(
                title="Tronçonneuse",
                desc="Si votre attaque réussit, vous infligez 1 point de dégât supplémentaire.",
                color=CardType.Black,
                holder=None,
                is_equip=True,
                use=lambda is_attack, successful, amt: amt +
                1 if (is_attack and successful) else amt
            ),
            card.Card(
                title="Hache Large Oxydée",
                desc="Si votre attaque réussit, vous infligez 1 point de dégât supplémentaire.",
                color=CardType.Black,
                holder=None,
                is_equip=True,
                use=lambda is_attack, successful, amt: amt +
                1 if (is_attack and successful) else amt
            ),
            card.Card(
                title="Gobelin Capricieux",
                desc="Vous volez une carte d'équipement à n'importe quel personnage.",
                color=CardType.Black,
                holder=None,
                is_equip=False,
                use=single_use.moody_goblin
            ),
            card.Card(
                title="Gobelin Capricieux",
                desc="Vous volez une carte d'équipement à n'importe quel personnage.",
                color=CardType.Black,
                holder=None,
                is_equip=False,
                use=single_use.moody_goblin
            ),
            card.Card(
                title="Araignée Assoiffée de Sang",
                desc="Vous infligez 2 points de dégâts à n'importe quel personnage et vous en recevez 2 vous-même.",
                color=CardType.Black,
                holder=None,
                is_equip=False,
                use=single_use.bloodthirsty_spider
            ),
            card.Card(
                title="Chauve-souris Vampirique",
                desc="Vous infligez 2 points de dégâts à n'importe quel personnage et vous soignez 1 point de vos propres dégâts.",
                color=CardType.Black,
                holder=None,
                is_equip=False,
                use=single_use.vampire_bat
            ),
            card.Card(
                title="Chauve-souris Vampirique",
                desc="Vous infligez 2 points de dégâts à n'importe quel personnage et vous soignez 1 point de vos propres dégâts.",
                color=CardType.Black,
                holder=None,
                is_equip=False,
                use=single_use.vampire_bat
            ),
            card.Card(
                title="Chauve-souris Vampirique",
                desc="Vous infligez 2 points de dégâts à n'importe quel personnage et vous soignez 1 point de vos propres dégâts.",
                color=CardType.Black,
                holder=None,
                is_equip=False,
                use=single_use.vampire_bat
            ),
            card.Card(
                title="Rituel Diabolique",
                desc="Si vous êtes une Ombre, vous pouvez révéler votre identité. Si vous le faites, vous vous soignez entièrement.",
                color=CardType.Black,
                holder=None,
                is_equip=False,
                use=single_use.diabolic_ritual
            ),
            card.Card(
                title="Épluchure de Banane",
                desc="Donnez l'une de vos cartes d'équipement à un autre personnage. Si vous n'avez pas de cartes d'équipement, vous recevez 1 point de dégât.",
                color=CardType.Black,
                holder=None,
                is_equip=False,
                use=single_use.banana_peel
            ),
            card.Card(
                title="Dynamite",
                desc="Lancez 2 dés et infligez 3 points de dégâts à tous les personnages dans la zone désignée par le total obtenu (rien ne se passe si un 7 est obtenu).",
                color=CardType.Black,
                holder=None,
                is_equip=False,
                use=single_use.dynamite
            ),
            card.Card(
                title="Poupée Spirituelle",
                desc="Choisissez un personnage et lancez le dé à 6 faces. Si le résultat est de 1 à 4, vous infligez 3 points de dégâts à ce personnage. Si le résultat est 5 ou 6, vous recevez 3 points de dégâts.",
                color=CardType.Black,
                holder=None,
                is_equip=False,
                use=single_use.spiritual_doll
            )
        ]

        # Initialize hermit cards
        hermit_cards = [
            card.Card(
                title="Chantage de l'Ermite",
                desc="Je parie que vous êtes soit un Neutre, soit un Chasseur. Dans ce cas, vous devez soit donner une carte d'équipement au joueur courant, soit recevoir 1 dégât !",
                color=CardType.Hermit,
                holder=None,
                is_equip=False,
                use=hermit.blackmail
            ),
            card.Card(
                title="Chantage de l'Ermite",
                desc="Je parie que vous êtes soit un Neutre, soit un Chasseur. Dans ce cas, vous devez soit donner une carte d'équipement au joueur courant, soit recevoir 1 dégât !",
                color=CardType.Hermit,
                holder=None,
                is_equip=False,
                use=hermit.blackmail
            ),
            card.Card(
                title="Cupidité de l'Ermite",
                desc="Je parie que vous êtes soit un Neutre, soit une Ombre. Dans ce cas, vous devez soit donner une carte d'équipement au joueur courant, soit recevoir 1 dégât !",
                color=CardType.Hermit,
                holder=None,
                is_equip=False,
                use=hermit.greed
            ),
            card.Card(
                title="Cupidité de l'Ermite",
                desc="Je parie que vous êtes soit un Neutre, soit une Ombre. Dans ce cas, vous devez soit donner une carte d'équipement au joueur courant, soit recevoir 1 dégât !",
                color=CardType.Hermit,
                holder=None,
                is_equip=False,
                use=hermit.greed
            ),
            card.Card(
                title="Colère de l'Ermite",
                desc="Je parie que vous êtes soit un Chasseur, soit une Ombre. Dans ce cas, vous devez soit donner une carte d'équipement au joueur courant, soit recevoir 1 dégât !",
                color=CardType.Hermit,
                holder=None,
                is_equip=False,
                use=hermit.anger
            ),
            card.Card(
                title="Colère de l'Ermite",
                desc="Je parie que vous êtes soit un Chasseur, soit une Ombre. Dans ce cas, vous devez soit donner une carte d'équipement au joueur courant, soit recevoir 1 dégât !",
                color=CardType.Hermit,
                holder=None,
                is_equip=False,
                use=hermit.anger
            ),
            card.Card(
                title="Gifle de l'Ermite",
                desc="Je parie que vous êtes un Chasseur. Si oui, vous recevez 1 dégât !",
                color=CardType.Hermit,
                holder=None,
                is_equip=False,
                use=hermit.slap
            ),
            card.Card(
                title="Gifle de l'Ermite",
                desc="Je parie que vous êtes un Chasseur. Si oui, vous recevez 1 dégât !",
                color=CardType.Hermit,
                holder=None,
                is_equip=False,
                use=hermit.slap
            ),
            card.Card(
                title="Sort de l'Ermite",
                desc="Je parie que vous êtes une Ombre. Si oui, vous recevez 1 dégât !",
                color=CardType.Hermit,
                holder=None,
                is_equip=False,
                use=hermit.spell
            ),
            card.Card(
                title="Exorcisme de l'Ermite",
                desc="Je parie que vous êtes une Ombre. Si oui, vous recevez 2 dégâts !",
                color=CardType.Hermit,
                holder=None,
                is_equip=False,
                use=hermit.exorcism
            ),
            card.Card(
                title="Sollicitude de l'Ermite",
                desc="Je parie que vous êtes un Neutre. Si oui, vous soignez 1 dégât ! (Cependant, si vous n'avez aucun dégât, vous en recevez 1 !)",
                color=CardType.Hermit,
                holder=None,
                is_equip=False,
                use=hermit.nurturance
            ),
            card.Card(
                title="Aide de l'Ermite",
                desc="Je parie que vous êtes un Chasseur. Si oui, vous soignez 1 dégât ! (Cependant, si vous n'avez aucun dégât, vous en recevez 1 !)",
                color=CardType.Hermit,
                holder=None,
                is_equip=False,
                use=hermit.aid
            ),
            card.Card(
                title="Rassemblement de l'Ermite",
                desc="Je parie que vous êtes une Ombre. Si oui, vous soignez 1 dégât ! (Cependant, si vous n'avez aucun dégât, vous en recevez 1 !)",
                color=CardType.Hermit,
                holder=None,
                is_equip=False,
                use=hermit.huddle
            ),
            card.Card(
                title="Leçon de l'Ermite",
                desc="Je parie que vos PV maximum sont de 12 ou plus. Si oui, vous recevez 2 dégâts !",
                color=CardType.Hermit,
                holder=None,
                is_equip=False,
                use=hermit.lesson
            ),
            card.Card(
                title="Brute de l'Ermite",
                desc="Je parie que vos PV maximum sont de 11 ou moins. Si oui, vous recevez 1 dégât !",
                color=CardType.Hermit,
                holder=None,
                is_equip=False,
                use=hermit.bully
            ),
            card.Card(
                title="Prédiction de l'Ermite",
                desc="Vous devez révéler secrètement les informations de votre personnage au joueur courant !",
                color=CardType.Hermit,
                holder=None,
                is_equip=False,
                use=hermit.prediction
            )
        ]

        # Initialize white, black, hermit decks
        self.WHITE_DECK = deck.Deck(cards=white_cards)
        self.BLACK_DECK = deck.Deck(cards=black_cards)
        self.HERMIT_DECK = deck.Deck(cards=hermit_cards)

        # Initialize characters

        self.CHARACTERS = [
            character.Character(
                name="Valkyrie",
                alleg=Alleg.Shadow,
                max_damage=13,
                win_cond=win_conditions.shadow,
                win_cond_desc="Tous les Chasseurs (ou 3 Neutres) sont morts.",
                special=specials.valkyrie,
                special_desc="Quand vous attaquez, vous ne lancez que le dé à 4 faces et infligez le montant des dégâts obtenus.",
                resource_id="valkyrie"
            ),
            character.Character(
                name="Vampire",
                alleg=Alleg.Shadow,
                max_damage=13,
                win_cond=win_conditions.shadow,
                win_cond_desc="Tous les Chasseurs (ou 3 Neutres) sont morts.",
                special=specials.vampire,
                special_desc="Si vous attaquez un joueur et infligez des dégâts, vous soignez 2 points de vos propres dégâts.",
                resource_id="vampire"
            ),
            character.Character(
                name="Loup-Garou",
                alleg=Alleg.Shadow,
                max_damage=14,
                win_cond=win_conditions.shadow,
                win_cond_desc="Tous les Chasseurs (ou 3 Neutres) sont morts.",
                special=specials.werewolf,
                special_desc="Après avoir été attaqué, vous pouvez contre-attaquer immédiatement.",
                resource_id="werewolf"
            ),
            character.Character(
                name="Ultra Soul",
                alleg=Alleg.Shadow,
                max_damage=11,
                win_cond=win_conditions.shadow,
                win_cond_desc="Tous les Chasseurs (ou 3 Neutres) sont morts.",
                special=specials.ultra_soul,
                special_desc="Quand votre tour commence, vous pouvez infliger 3 dégâts à un joueur qui se trouve à la Porte des Enfers.",
                resource_id="ultra-soul"
            ),
            character.Character(
                name="Allie",
                alleg=Alleg.Neutral,
                max_damage=8,
                win_cond=win_conditions.allie,
                win_cond_desc="Vous n'êtes pas mort quand la partie se termine.",
                special=specials.allie,
                special_desc="Une fois par partie, vous pouvez entièrement soigner vos dégâts.",
                resource_id="allie"
            ),
            character.Character(
                name="Bob",
                alleg=Alleg.Neutral,
                max_damage=10,
                win_cond=win_conditions.bob,
                win_cond_desc="Vous avez 5 cartes d'équipement ou plus.",
                special=specials.bob,
                special_desc="Si votre attaque inflige 2 dégâts ou plus, vous pouvez voler une carte d'équipement à votre cible au lieu d'infliger des dégâts.",
                resource_id="bob1",
                modifiers={'min_players': 4, 'max_players': 6}
            ),
            character.Character(
                name="Bob",
                alleg=Alleg.Neutral,
                max_damage=10,
                win_cond=win_conditions.bob,
                win_cond_desc="Vous avez 5 cartes d'équipement ou plus.",
                special=specials.bob,
                special_desc="Si vous tuez un autre joueur, vous pouvez prendre toutes ses cartes d'équipement.",
                resource_id="bob2",
                modifiers={'min_players': 7, 'max_players': 8}
            ),
            character.Character(
                name="Catherine",
                alleg=Alleg.Neutral,
                max_damage=11,
                win_cond=win_conditions.catherine,
                win_cond_desc="Vous êtes soit le premier à mourir, soit l'un des deux derniers joueurs en vie.",
                special=specials.catherine,
                special_desc="Quand votre tour commence, vous soignez 1 dégât.",
                resource_id="catherine"
            ),
            character.Character(
                name="George",
                alleg=Alleg.Hunter,
                max_damage=14,
                win_cond=win_conditions.hunter,
                win_cond_desc="Toutes les Ombres sont mortes.",
                special=specials.george,
                special_desc="Une fois par partie, quand votre tour commence, vous pouvez choisir un joueur et lui infliger les dégâts du lancer du dé à 4 faces.",
                resource_id="george"
            ),
            character.Character(
                name="Fu-ka",
                alleg=Alleg.Hunter,
                max_damage=12,
                win_cond=win_conditions.hunter,
                win_cond_desc="Toutes les Ombres sont mortes.",
                special=specials.fuka,
                special_desc="Une fois par partie, quand votre tour commence, vous pouvez fixer les dégâts de n'importe quel joueur à 7.",
                resource_id="fu-ka"
            ),
            character.Character(
                name="Franklin",
                alleg=Alleg.Hunter,
                max_damage=12,
                win_cond=win_conditions.hunter,
                win_cond_desc="Toutes les Ombres sont mortes.",
                special=specials.franklin,
                special_desc="Une fois par partie, quand votre tour commence, vous pouvez choisir un joueur et lui infliger les dégâts du lancer du dé à 6 faces.",
                resource_id="franklin"
            ),
            character.Character(
                name="Ellen",
                alleg=Alleg.Hunter,
                max_damage=10,
                win_cond=win_conditions.hunter,
                win_cond_desc="Toutes les Ombres sont mortes.",
                special=specials.ellen,
                special_desc="Une fois par partie, quand votre tour commence, vous pouvez choisir un joueur et annuler définitivement sa capacité spéciale.",
                resource_id="ellen"
            )
        ]

        # Initialize areas
        self.AREAS = [
            area.Area(
                name="Cabane de l'Ermite",
                desc="Piochez une carte Ermite.",
                domain=[2, 3],
                action=lambda gc, player: player.drawCard(gc.hermit_cards),
                resource_id="hermits-cabin"
            ),
            area.Area(
                name="Porte des Enfers",
                desc="Piochez une carte dans le deck de votre choix.",
                domain=[4, 5],
                action=area.underworld_gate_action,
                resource_id="underworld-gate"
            ),
            area.Area(
                name="Église",
                desc="Piochez une carte Blanche.",
                domain=[6],
                action=lambda gc, player: player.drawCard(gc.white_cards),
                resource_id="church"
            ),
            area.Area(
                name="Cimetière",
                desc="Piochez une carte Noire.",
                domain=[8],
                action=lambda gc, player: player.drawCard(gc.black_cards),
                resource_id="cemetery"
            ),
            area.Area(
                name="Bois Étrangers",
                desc="Soignez 1 dégât ou infligez 2 dégâts à n'importe quel joueur.",
                domain=[9],
                action=area.weird_woods_action,
                resource_id="weird-woods"
            ),
            area.Area(
                name="Autel d'Antan",
                desc="Volez une carte d'équipement à n'importe quel joueur.",
                domain=[10],
                action=area.erstwhile_altar_action,
                resource_id="erstwhile-altar"
            )
        ]
