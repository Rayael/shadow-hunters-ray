from constants import Alleg

# hermit.py


class HermitEffect():
    """Models the possible effects of drawing and playing a hermit card"""

    def __init__(self, name, test, dmg, eq_opt=False, hp_test=False):

        # What is the card called?
        self.name = name

        # Does the card apply to the target?
        self.test = test

        # Can the target give an equipment card instead of taking damage?
        self.eq_opt = eq_opt

        # How much damage should the target receive or heal?
        self.damage_to = lambda t: -1 if dmg > 0 and not t.damage else dmg

        # Does the test check the target's max hp, rather than allegience?
        # (this changes how the information is presented to the target)
        if hp_test:
            self.info = "Vos PV maximum sont {}."
            self.info_args = lambda t: [t.character.max_damage]
        else:
            self.info = "Vous êtes {}."
            self.info_args = lambda t: [t.character.alleg.name]

    def give_card(self, args):

        # Ask the user to use the card
        args['self'].gc.ask_h(
            'confirm',
            {'options': ["Utiliser {}".format(self.name)]},
            args['self'].user_id
        )

        # Get the user's chosen target
        target = args['self'].choosePlayer()

        # Present the card to the target
        display_data = args['card'].dump()
        display_data['type'] = 'draw'
        args['self'].gc.show_h(display_data, target.socket_id)
        return target

    def get_options(self, t):

        # Tell the target they are affected by the card
        t.gc.tell_h(self.info, self.info_args(t), t.socket_id)

        # Give the amount of damage the target should take or heal as an option
        d = self.damage_to(t)
        verb = "Soigner" if d > 0 else "Recevoir"
        opts = {'options': ["{} {} dégât{}".format(verb, str(abs(d)), 's' if abs(d) > 1 else '')]}

        # If the target has equipment and this hermit effect allows it,
        # the target has the option of forfeiting an equipment card
        if self.eq_opt and len(t.equipment):
            opts['options'].append("Donner une carte d'équipement")
        return opts

    def apply_decision(self, args, t, decision):

        # Target forfeits an equipment card
        if decision == "Donner une carte d'équipement":
            eq = t.chooseEquipment(t)
            t.giveEquipment(args['self'], eq)

        # Target receives/heals damage
        else:
            d = self.damage_to(t)
            verb2 = "soigné" if d > 0 else "a subi"
            t.moveDamage(d, args['self'])
            t.gc.tell_h("{} {} {} dégât{} !".format(t.user_id, verb2, abs(d), 's' if abs(d) > 1 else ''), [t.user_id])

    def no_effect_on(self, t):

        # Prompt target to do nothing
        t.gc.tell_h(self.info + " Ne rien faire.", self.info_args(t), t.socket_id)
        data = {'options': ['Ne rien faire']}
        t.gc.ask_h('confirm', data, t.user_id)

        # Inform other players
        t.gc.tell_h("{} n'a rien fait.", [t.user_id])

    def force_reveal(self, args, t):

        # Prompt target to reveal themself
        t.gc.tell_h("Vous n'avez pas le choix. Révélez-vous à {}.", [
                         args['self'].user_id], t.socket_id)
        t.gc.ask_h('confirm', {'options': ["Révéler"]}, t.user_id)

        # Send target's information to user
        display_data = {'type': 'reveal', 'player': t.dump()}
        args['self'].gc.show_h(display_data, args['self'].socket_id)
        t.gc.tell_h("{} a révélé son identité secrètement à {}!", [
                         t.user_id, args['self'].user_id])

    def __call__(self, args):

        # Give card to target
        target = self.give_card(args)

        # Does card apply to target?
        if self.test(target.character):

            # Special case for Hermit's Prediction
            if self.name == "Prédiction":
                self.force_reveal(args, target)
                return

            # Get target's choices
            opts = self.get_options(target)

            # Get target's decision
            decision = target.gc.ask_h('yesno', opts, target.user_id)['value']

            # Apply target's decision
            self.apply_decision(args, target, decision)

        else:

            # Card doesn't apply to target
            self.no_effect_on(target)


# If hunter/neutral, take 1 damage or give equipment
blackmail = HermitEffect(
    "Chantage",
    lambda c: c.alleg == Alleg.Hunter or c.alleg == Alleg.Neutral,
    -1,
    eq_opt=True
)

# If shadow/neutral, take 1 damage or give equipment
greed = HermitEffect(
    "Cupidité",
    lambda c: c.alleg == Alleg.Shadow or c.alleg == Alleg.Neutral,
    -1,
    eq_opt=True
)

# If hunter/shadow, take 1 damage or give equipment
anger = HermitEffect(
    "Colère",
    lambda c: c.alleg == Alleg.Hunter or c.alleg == Alleg.Shadow,
    -1,
    eq_opt=True
)

# If hunter, take 1 damage
slap = HermitEffect("Gifle", lambda c: c.alleg == Alleg.Hunter, -1)

# If shadow, take 1 damage
spell = HermitEffect("Sort", lambda c: c.alleg == Alleg.Shadow, -1)

# If shadow, take 2 damage
exorcism = HermitEffect("Exorcisme", lambda c: c.alleg == Alleg.Shadow, -2)

# If neutral, heal 1 damage (or take 1 damage if at 0)
nurturance = HermitEffect("Sollicitude", lambda c: c.alleg == Alleg.Neutral, 1)

# If hunter, heal 1 damage (or take 1 damage if at 0)
aid = HermitEffect("Aide", lambda c: c.alleg == Alleg.Hunter, 1)

# If shadow, heal 1 damage (or take 1 damage if at 0)
huddle = HermitEffect("Rassemblement", lambda c: c.alleg == Alleg.Shadow, 1)

# If max hp >= 12, take 2 damage
lesson = HermitEffect("Leçon", lambda c: c.max_damage >= 12, -2, hp_test=True)

# If max hp <= 11, take 1 damage
bully = HermitEffect("Brute", lambda c: c.max_damage <= 11, -1, hp_test=True)

# Reveal character card
prediction = HermitEffect("Prédiction", lambda c: True, 0)
