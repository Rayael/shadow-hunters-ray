import re
for f in ['shadow-hunters/hermit.py','shadow-hunters/single_use.py','shadow-hunters/area.py','shadow-hunters/specials.py','shadow-hunters/deck.py','shadow-hunters/card.py','shadow-hunters/character.py','shadow-hunters/win_conditions.py']:
    s=open(f,encoding='utf-8').read()
    for m in re.findall(r'"([^"]{3,})"',s):
        t=m
        if any(c.isalpha() for c in t) and not any(ord(c)>127 for c in t):
            print(f+': '+t)
