import pytest

import helpers as H
import random

# test_hermit_cards.py
# Tests the usage of each hermit card


def setup_hermit(title, n_players=random.randint(5, 8)):
    """
    Return a game context, element factory, a hunter, shadow
    and neutral from that game, and a card of a given title
    """
    gc, ef = H.fresh_gc_ef(n_players)
    h = H.get_a_hunter(gc)
    s = H.get_a_shadow(gc)
    n = H.get_a_neutral(gc)
    c = H.get_card_by_title(ef, title)
    return (gc, ef, h, s, n, c)


def test_hermit_blackmail():

    # setup rigged gc
    gc, ef, h, s, n, c = setup_hermit("Chantage de l'Ermite")
    gc.ask_h = H.answer_sequence([
        "Utiliser Chantage",
        h.user_id, 'Recevoir 1 dégât',                   # test for hunter
        "Utiliser Chantage",
        s.user_id, 'Ne rien faire',                         # test for shadow
        "Utiliser Chantage",
        n.user_id, 'Recevoir 1 dégât',                   # test for neutral
        "Utiliser Chantage",
        h.user_id, "Donner une carte d'équipement", 'Robe Sainte'  # test give equipment
    ])

    # Check that hunters take 1 damage
    init_damage = h.damage
    c.use({'self': s, 'card': c})
    assert h.damage == init_damage + 1

    # Check that shadows do nothing
    init_damage = s.damage
    c.use({'self': h, 'card': c})
    assert s.damage == init_damage

    # Check that neutrals take 1 damage
    init_damage = n.damage
    c.use({'self': h, 'card': c})
    assert n.damage == init_damage + 1

    # Check that giving equipment works
    eq = H.get_card_by_title(ef, 'Robe Sainte')
    h.equipment.append(eq)
    init_damage = h.damage
    c.use({'self': s, 'card': c})
    assert h.damage == init_damage
    assert not h.equipment
    assert s.equipment == [eq]


def test_hermit_greed():

    # setup rigged gc
    gc, ef, h, s, n, c = setup_hermit("Cupidité de l'Ermite")
    gc.ask_h = H.answer_sequence([
        "Utiliser Cupidité",
        h.user_id, 'Ne rien faire',                         # test for hunter
        "Utiliser Cupidité",
        s.user_id, 'Recevoir 1 dégât',                   # test for shadow
        "Utiliser Cupidité",
        n.user_id, 'Recevoir 1 dégât',                   # test for neutral
        "Utiliser Cupidité",
        s.user_id, "Donner une carte d'équipement", 'Robe Sainte'  # test give equipment
    ])

    # Check that hunters do nothing
    init_damage = h.damage
    c.use({'self': s, 'card': c})
    assert h.damage == init_damage

    # Check that shadows take 1 damage
    init_damage = s.damage
    c.use({'self': h, 'card': c})
    assert s.damage == init_damage + 1

    # Check that neutrals take 1 damage
    init_damage = n.damage
    c.use({'self': h, 'card': c})
    assert n.damage == init_damage + 1

    # Check that giving equipment works
    eq = H.get_card_by_title(ef, 'Robe Sainte')
    s.equipment.append(eq)
    init_damage = s.damage
    c.use({'self': h, 'card': c})
    assert s.damage == init_damage
    assert not s.equipment
    assert h.equipment == [eq]


def test_hermit_anger():

    # setup rigged gc
    gc, ef, h, s, n, c = setup_hermit("Colère de l'Ermite")
    gc.ask_h = H.answer_sequence([
        "Utiliser Colère",
        h.user_id, 'Recevoir 1 dégât',                   # test for hunter
        "Utiliser Colère",
        s.user_id, 'Recevoir 1 dégât',                   # test for shadow
        "Utiliser Colère",
        n.user_id, 'Ne rien faire',                         # test for neutral
        "Utiliser Colère",
        s.user_id, "Donner une carte d'équipement", 'Robe Sainte'  # test give equipment
    ])

    # Check that hunters take 1 damage
    init_damage = h.damage
    c.use({'self': s, 'card': c})
    assert h.damage == init_damage + 1

    # Check that shadows take 1 damage
    init_damage = s.damage
    c.use({'self': h, 'card': c})
    assert s.damage == init_damage + 1

    # Check that neutrals do nothing
    init_damage = n.damage
    c.use({'self': h, 'card': c})
    assert n.damage == init_damage

    # Check that giving equipment works
    eq = H.get_card_by_title(ef, 'Robe Sainte')
    s.equipment.append(eq)
    init_damage = s.damage
    c.use({'self': h, 'card': c})
    assert s.damage == init_damage
    assert not s.equipment
    assert h.equipment == [eq]


def test_hermit_slap():

    # setup rigged gc
    gc, ef, h, s, n, c = setup_hermit("Gifle de l'Ermite")
    gc.ask_h = H.answer_sequence([
        "Utiliser Gifle",
        h.user_id, 'Recevoir 1 dégât',  # test for hunter
        "Utiliser Gifle",
        s.user_id, 'Ne rien faire',       # test for shadow
        "Utiliser Gifle",
        n.user_id, 'Ne rien faire'        # test for neutral
    ])

    # Check that hunters take 1 damage
    init_damage = h.damage
    c.use({'self': s, 'card': c})
    assert h.damage == init_damage + 1

    # Check that shadows do nothing
    init_damage = s.damage
    c.use({'self': h, 'card': c})
    assert s.damage == init_damage

    # Check that neutrals do nothing
    init_damage = n.damage
    c.use({'self': h, 'card': c})
    assert n.damage == init_damage


def test_hermit_spell():

    # setup rigged gc
    gc, ef, h, s, n, c = setup_hermit("Sort de l'Ermite")
    gc.ask_h = H.answer_sequence([
        "Utiliser Sort",
        h.user_id, 'Ne rien faire',       # test for hunter
        "Utiliser Sort",
        s.user_id, 'Recevoir 1 dégât',  # test for shadow
        "Utiliser Sort",
        n.user_id, 'Ne rien faire'        # test for neutral
    ])

    # Check that hunters do nothing
    init_damage = h.damage
    c.use({'self': s, 'card': c})
    assert h.damage == init_damage

    # Check that shadows take 1 damage
    init_damage = s.damage
    c.use({'self': h, 'card': c})
    assert s.damage == init_damage + 1

    # Check that neutrals do nothing
    init_damage = n.damage
    c.use({'self': h, 'card': c})
    assert n.damage == init_damage


def test_hermit_exorcism():

    # setup rigged gc
    gc, ef, h, s, n, c = setup_hermit("Exorcisme de l'Ermite")
    gc.ask_h = H.answer_sequence([
        "Utiliser Exorcisme",
        h.user_id, 'Ne rien faire',       # test for hunter
        "Utiliser Exorcisme",
        s.user_id, 'Recevoir 2 dégâts',  # test for shadow
        "Utiliser Exorcisme",
        n.user_id, 'Ne rien faire'        # test for neutral
    ])

    # Check that hunters do nothing
    init_damage = h.damage
    c.use({'self': s, 'card': c})
    assert h.damage == init_damage

    # Check that shadows take 2 damage
    init_damage = s.damage
    c.use({'self': h, 'card': c})
    assert s.damage == init_damage + 2

    # Check that neutrals do nothing
    init_damage = n.damage
    c.use({'self': h, 'card': c})
    assert n.damage == init_damage


def test_hermit_nurturance():

    # setup rigged gc
    gc, ef, h, s, n, c = setup_hermit("Sollicitude de l'Ermite")
    gc.ask_h = H.answer_sequence([
        "Utiliser Sollicitude",
        h.user_id, 'Ne rien faire',       # test for hunter
        "Utiliser Sollicitude",
        s.user_id, 'Ne rien faire',       # test for shadow
        "Utiliser Sollicitude",
        n.user_id, 'Soigner 1 dégât',    # test for neutral
        "Utiliser Sollicitude",
        n.user_id, 'Recevoir 1 dégât'  # test for neutral (damage)
    ])

    # Check that hunters do nothing
    h.damage = 1
    c.use({'self': s, 'card': c})
    assert h.damage == 1

    # Check that shadows do nothing
    s.damage = 1
    c.use({'self': h, 'card': c})
    assert s.damage == 1

    # Check that neutrals heal 1 damage
    n.damage = 1
    c.use({'self': h, 'card': c})
    assert n.damage == 0

    # Check that neutrals take 1 damage when at 0
    c.use({'self': h, 'card': c})
    assert n.damage == 1


def test_hermit_aid():

    # setup rigged gc
    gc, ef, h, s, n, c = setup_hermit("Aide de l'Ermite")
    gc.ask_h = H.answer_sequence([
        "Utiliser Aide",
        h.user_id, 'Soigner 1 dégât',    # test for hunter
        "Utiliser Aide",
        s.user_id, 'Ne rien faire',       # test for shadow
        "Utiliser Aide",
        n.user_id, 'Ne rien faire',       # test for neutral
        "Utiliser Aide",
        h.user_id, 'Recevoir 1 dégât'  # test for hunter (damage)
    ])

    # Check that hunters heal 1 damage
    h.damage = 1
    c.use({'self': s, 'card': c})
    assert h.damage == 0

    # Check that shadows do nothing
    s.damage = 1
    c.use({'self': h, 'card': c})
    assert s.damage == 1

    # Check that neutrals do nothing
    n.damage = 1
    c.use({'self': h, 'card': c})
    assert n.damage == 1

    # Check that hunters take 1 damage when at 0
    c.use({'self': s, 'card': c})
    assert h.damage == 1


def test_hermit_huddle():

    # setup rigged gc
    gc, ef, h, s, n, c = setup_hermit("Rassemblement de l'Ermite")
    gc.ask_h = H.answer_sequence([
        "Utiliser Rassemblement",
        h.user_id, 'Ne rien faire',       # test for hunter
        "Utiliser Rassemblement",
        s.user_id, 'Soigner 1 dégât',    # test for shadow
        "Utiliser Rassemblement",
        n.user_id, 'Ne rien faire',       # test for neutral
        "Utiliser Rassemblement",
        s.user_id, 'Recevoir 1 dégât'  # test for shadow (damage)
    ])

    # Check that hunters do nothing
    h.damage = 1
    c.use({'self': s, 'card': c})
    assert h.damage == 1

    # Check that shadows heal 1 damage
    s.damage = 1
    c.use({'self': h, 'card': c})
    assert s.damage == 0

    # Check that neutrals do nothing
    n.damage = 1
    c.use({'self': h, 'card': c})
    assert n.damage == 1

    # Check that shadows take 1 damage when at 0
    c.use({'self': h, 'card': c})
    assert s.damage == 1


def test_hermit_lesson():

    # setup rigged gc
    gc, ef, h, s, n, c = setup_hermit("Leçon de l'Ermite", n_players=8)
    high_p = [p for p in gc.players if p.character.max_damage >= 12][0]
    low_p = [p for p in gc.players if p.character.max_damage <= 11][0]
    gc.ask_h = H.answer_sequence([
        "Utiliser Leçon",
        low_p.user_id, 'Ne rien faire',        # test for low hp
        "Utiliser Leçon",
        high_p.user_id, 'Recevoir 2 dégâts',  # test for high hp
    ])

    # Check that characters with hp <= 11 do nothing
    init_damage = low_p.damage
    c.use({'self': high_p, 'card': c})
    assert low_p.damage == init_damage

    # Check that characters with hp >= 12 take 2 damage
    init_damage = high_p.damage
    c.use({'self': low_p, 'card': c})
    assert high_p.damage == init_damage + 2


def test_hermit_bully():

    # setup rigged gc
    gc, ef, h, s, n, c = setup_hermit("Brute de l'Ermite", n_players=8)
    high_p = [p for p in gc.players if p.character.max_damage >= 12][0]
    low_p = [p for p in gc.players if p.character.max_damage <= 11][0]
    gc.ask_h = H.answer_sequence([
        "Utiliser Brute",
        high_p.user_id, 'Ne rien faire',      # test for high hp
        "Utiliser Brute",
        low_p.user_id, 'Recevoir 1 dégât',  # test for low hp
    ])

    # Check that characters with hp >= 12 do nothing
    init_damage = high_p.damage
    c.use({'self': low_p, 'card': c})
    assert high_p.damage == init_damage

    # Check that characters with hp <= 11 take 1 damage
    init_damage = low_p.damage
    c.use({'self': high_p, 'card': c})
    assert low_p.damage == init_damage + 1


def test_hermit_prediction():

    # setup rigged gc
    gc, ef, h, s, n, c = setup_hermit("Prédiction de l'Ermite")
    gc.ask_h = H.answer_sequence([
        "Utiliser Prédiction",
        h.user_id, 'Révéler',
    ])

    # Check that using the card works
    c.use({'self': s, 'card': c})

    # Effects no change on the game state
    assert 1
