import helpers as H
gc, ef = H.fresh_gc_ef()
allcards = ef.WHITE_DECK.cards + ef.BLACK_DECK.cards + ef.HERMIT_DECK.cards
print('hermit titles:', [c.title for c in allcards if 'Ermite' in str(c.title)])
print('chantage titles:', [c.title for c in allcards if 'Chantage' in str(c.title)])
try:
    c = H.get_card_by_title(ef, "Chantage de l'Ermite")
    print('found:', c)
except Exception as e:
    print('ERR', type(e).__name__, e)
