# area.py
# Implements a Area.


class Area:
    def __init__(self, name, desc, domain, action, resource_id):
        self.name = name
        self.desc = desc
        self.zone = None
        self.domain = domain
        self.action = action
        self.resource_id = resource_id

    def getAdjacent(self):
        return [a for a in self.zone.areas if a != self][0]

    def dump(self):
        return {
            'name': self.name,
            'desc': self.desc,
            'domain': str(self.domain)
        }

    def __str__(self):
        return str(self.dump())


# Area actions
def underworld_gate_action(gc, player):

    # Ask player which deck to draw from
    data = {'options': ["Piocher une carte Blanche",
                        "Piocher une carte Noire", "Piocher une carte Ermite"]}
    answer = player.gc.ask_h('select', data, player.user_id)['value']

    # Draw from corresponding deck
    if answer == "Piocher une carte Blanche":
        player.drawCard(gc.white_cards)
    elif answer == "Piocher une carte Noire":
        player.drawCard(gc.black_cards)
    else:
        player.drawCard(gc.hermit_cards)


def weird_woods_action(gc, player):

    # Choose which player to attack or heal
    target_Player = player.choosePlayer(include_self=True)

    # Choose whether to attack or heal
    data = {'options': ["Soigner 1 dégât", "Donner 2 dégâts"]}
    amount = player.gc.ask_h('select', data, player.user_id)['value']
    if amount == "Soigner 1 dégât":
        gc.tell_h("Le pouvoir du {} a soigné {}!", [
                  "Bois Étrangers", target_Player.user_id])
        target_Player.moveDamage(1, player)
    else:
        if target_Player.hasEquipment("Broche de la Fortune"):
            gc.tell_h("{}'s {} les a protégé(e)s des dégâts!", [
                      target_Player.user_id, "Broche de la Fortune"])
        else:
            gc.tell_h("Le pouvoir du {} a endommagé {}!", [
                      "Bois Étrangers", target_Player.user_id])
            target_Player.moveDamage(-2, player)


def erstwhile_altar_action(gc, player):

    # Show confirmation
    target_Player = player.choosePlayer(filter_fn=lambda x: len(x.equipment))
    if target_Player:
        equip_Equipment = player.chooseEquipment(target_Player)
        target_Player.giveEquipment(player, equip_Equipment)
    else:
        gc.tell_h("{} n'a aucun objet à voler.", [player.user_id])
