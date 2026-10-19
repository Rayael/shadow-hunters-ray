import constants as C

# single_use.py
# card.use(args) function implementations.

# White single-use cards


def first_aid(args):
    """Select a player to use card on (includes user)"""

    args['self'].gc.ask_h(
        'confirm', {'options': ["Utiliser Premiers Secours"]}, args['self'].user_id)
    target_Player = args['self'].choosePlayer(include_self=True)
    target_Player.setDamage(7, args['self'])
    args['self'].gc.tell_h("{} a utilisé {} sur {}!", [
                           args['self'].user_id, args['card'].title,
                           target_Player.user_id])


def judgement(args):
    """Give all players except user 2 damage"""

    args['self'].gc.ask_h(
        'confirm', {'options': ["Déchaîner le jugement"]}, args['self'].user_id)
    for p in args['self'].gc.getLivePlayers(lambda x: (x != args['self'])):
        p.moveDamage(-2, args['self'])


def holy_water(args):
    """Heal user by 2 damage"""

    args['self'].gc.ask_h(
        'confirm', {'options': ["Vous soigner"]}, args['self'].user_id)
    args['self'].moveDamage(2, args['self'])


def advent(args):
    """If hunter, can reveal and heal fully,
    or heal fully if already revealed"""

    data = {'options': ["Ne rien faire"]}
    if args['self'].character.alleg == C.Alleg.Hunter:
        if args['self'].state == C.PlayerState.Hidden:
            data['options'].append("Révéler et se soigner entièrement")
        else:
            data['options'].append("Se soigner entièrement")

    # Get decision and take corresponding action
    decision = args['self'].gc.ask_h(
        'yesno', data, args['self'].user_id)['value']
    if decision == "Ne rien faire":
        args['self'].gc.tell_h("{} n'a rien fait.", [args['self'].user_id])
    elif decision == "Révéler et se soigner entièrement":
        args['self'].reveal()
        args['self'].setDamage(0, args['self'])
    else:
        args['self'].setDamage(0, args['self'])


def disenchant_mirror(args):
    """If shadow and not unknown, force reveal"""

    data = {'options': ["Ne rien faire"]}
    is_shadow = args['self'].character.alleg == C.Alleg.Shadow
    if is_shadow and args['self'].character.name != "Unknown":
        data = {'options': ["Révélez-vous"]}

    # Reveal character, or do nothing if hunter
    decision = args['self'].gc.ask_h(
        'yesno', data, args['self'].user_id)['value']
    if decision == "Ne rien faire":
        args['self'].gc.tell_h("{} n'a rien fait.", [args['self'].user_id])
    else:
        args['self'].reveal()


def blessing(args):
    """Heal player by rolling 6-sided die"""

    # Choose a player to use blessing on
    args['self'].gc.ask_h(
        'confirm', {'options': ["Bénir quelqu'un"]}, args['self'].user_id)
    target = args['self'].choosePlayer()

    # Roll dice to get value to heal by
    roll_result = args['self'].rollDice(four=False, six=True)

    # Heal target player
    target.moveDamage(roll_result, args['self'])
    args['self'].gc.tell_h("La bénédiction a soigné {}!", [target.user_id])


def chocolate(args):
    """If low-hp character, can reveal and heal fully,
    or heal fully if already revealed"""

    data = {'options': ["Ne rien faire"]}
    low_hp = ["Allie", "Agnes", "Emi", "Ellen", "Ultra Soul", "Unknown"]
    if args['self'].character.name in low_hp:
        if args['self'].state == C.PlayerState.Hidden:
            data['options'].append("Révéler et se soigner entièrement")
        else:
            data['options'].append("Se soigner entièrement")

    # Get decision and take corresponding action
    decision = args['self'].gc.ask_h(
        'yesno', data, args['self'].user_id)['value']
    if decision == "Ne rien faire":
        args['self'].gc.tell_h("{} did nothing.", [args['self'].user_id])
    elif decision == "Révéler et se soigner entièrement":
        args['self'].reveal()
        args['self'].setDamage(0, args['self'])
    else:
        args['self'].setDamage(0, args['self'])


def concealed_knowledge(args):
    """Change turn order so that current player goes again"""

    args['self'].gc.ask_h(
        'confirm', {'options': ["Utiliser Connaissance Cachée"]},
        args['self'].user_id)
    args['self'].gc.turn_order.insert(
        args['self'].gc.turn_order.index(args['self']), args['self'])


def guardian_angel(args):
    """User can't take damage until their next turn.
    (This is checked in player.defend() and player.takeTurn())"""

    args['self'].gc.ask_h(
        'confirm', {'options': ["Summon a Guardian Angel"]},
        args['self'].user_id)
    args['self'].modifiers['guardian_angel'] = True

# Black single-use cards


def bloodthirsty_spider(args):
    """Both the target and the user take 2 damage"""

    # Choose a player to attack
    args['self'].gc.ask_h(
        'confirm', {'options': ["Summon a Bloodthirsty Spider"]},
        args['self'].user_id)
    target = args['self'].choosePlayer()

    if target.hasEquipment("Talisman"):
        args['self'].gc.tell_h("{}'s {} les a protégé(e)s des dégâts !", [
                               target.user_id, "Talisman"])
    else:
        target.moveDamage(-2, args['self'])
    args['self'].moveDamage(-2, args['self'])


def vampire_bat(args):
    """Target takes 2 damage, user heals 1 damage"""
    # Choose a player to attack
    args['self'].gc.ask_h(
        'confirm', {'options': ["Summon a Vampire Bat"]}, args['self'].user_id)
    target = args['self'].choosePlayer()

    if target.hasEquipment("Talisman"):
        args['self'].gc.tell_h("{}'s {} les a protégé(e)s des dégâts !", [
                               target.user_id, "Talisman"])
    else:
        target.moveDamage(-2, args['self'])
        args['self'].moveDamage(1, args['self'])


def moody_goblin(args):
    """Steal equipment from a player"""

    # Show confirmation
    args['self'].gc.ask_h(
        'confirm', {'options': ["Steal an Equipment Card"]},
        args['self'].user_id)
    target_Player = args['self'].choosePlayer(
        filter_fn=lambda x: len(x.equipment))
    if target_Player:
        equip_Equipment = args['self'].chooseEquipment(target_Player)
        target_Player.giveEquipment(args['self'], equip_Equipment)
    else:
        args['self'].gc.tell_h("Nobody has any items for {} to steal.", [
                               args['self'].user_id])


def diabolic_ritual(args):
    """If shadow, can reveal and heal fully"""

    data = {'options': ["Ne rien faire"]}
    is_shadow = args['self'].character.alleg == C.Alleg.Shadow
    if is_shadow and args['self'].state == C.PlayerState.Hidden:
        data['options'].append("Révéler et se soigner entièrement")

    # Get decision and take corresponding action
    decision = args['self'].gc.ask_h(
        'yesno', data, args['self'].user_id)['value']
    if decision == "Ne rien faire":
        args['self'].gc.tell_h("{} did nothing.", [args['self'].user_id])
    else:
        args['self'].reveal()
        args['self'].setDamage(0, args['self'])


def banana_peel(args):
    """If have equipment, must give away one or take damage.
    If no equipment, must take damage"""

    if len(args['self'].equipment):
        data = {'options': ["Donner une carte d'équipement", "Recevoir 1 dégât"]}
    else:
        data = {'options': ["Recevoir 1 dégât"]}

    # Get decision and take action
    decision = args['self'].gc.ask_h(
        'yesno', data, args['self'].user_id)['value']
    if decision == "Donner une carte d'équipement":
        # Choose an equipment card to give away
        args['self'].gc.tell_h(
            "{} is choosing an equipment card to give away...",
            [args['self'].user_id]
        )
        eq = args['self'].chooseEquipment(args['self'])

        # Give away equipment
        receiver = args['self'].choosePlayer()
        args['self'].giveEquipment(receiver, eq)

    else:
        # Take 1 damage
        args['self'].moveDamage(-1, args['self'])
        args['self'].gc.tell_h("{} a subi {} dégât.", [
                               args['self'].user_id, "1"])


def dynamite(args):
    """Hit all players in area for 3 damage"""

    # Roll to find out which area gets hit
    args['self'].gc.ask_h(
        'confirm', {'options': ["Allumer la mèche"]}, args['self'].user_id)
    args['self'].gc.tell_h("{} is rolling for where the dynamite lands...", [
                           args['self'].user_id])
    roll_result = args['self'].rollDice()

    # Hit area corresponding to roll number
    if roll_result == 7:
        # No area has 7 on it
        args['self'].gc.tell_h("Rien ne se passe.", [])

    else:
        # Get area from roll result
        destination_Area = args['self'].gc.getAreaFromRoll(roll_result)
        destination = destination_Area.name

        # Hit all players in area for 3 damage
        args['self'].gc.tell_h("{} a fait exploser le {} !", ["Dynamite", destination])
        affected_players = args['self'].gc.getPlayersAt(destination)
        for p in affected_players:
            if p.hasEquipment("Talisman"):
                args['self'].gc.tell_h("{}'s {} les a protégé(e)s des dégâts !", [
                                       p.user_id, "Talisman"])
            else:
                p.moveDamage(-3, args['self'])


def spiritual_doll(args):
    """If roll is >= 5, user takes 3 damage.
    Otherwise, target takes 3 damage."""

    # Choose a player to target
    args['self'].gc.ask_h(
        'confirm', {'options': ["Utiliser Poupée Spirituelle"]}, args['self'].user_id)
    target = args['self'].choosePlayer()

    # Roll 6-sided die
    roll_result = args['self'].rollDice(four=False, six=True)

    # If roll is >= 5, user takes 3 damage. Otherwise, target takes 3 damage.
    if roll_result >= 5:
        args['self'].moveDamage(-3, args['self'])
        args['self'].gc.tell_h('Le {} a retourné contre {} !', [
                               args['card'].title, args['self'].user_id])
    else:
        target.moveDamage(-3, args['self'])
        args['self'].gc.tell_h('Le {} a maudit {} !', [
                               args['card'].title, target.user_id])
