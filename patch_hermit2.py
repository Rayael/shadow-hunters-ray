Q = chr(34)
A = chr(39)
B = chr(92)
NL = chr(10)

path = "c:/Users/Raphael/Documents/GitMe/Repositories/shadow-hunters-ray/translate_elements.py"

fren = {
    "Blackmail": "Chantage de l" + A + "Ermite",
    "Greed": "Cupidité de l" + A + "Ermite",
    "Anger": "Colère de l" + A + "Ermite",
    "Slap": "Gifle de l" + A + "Ermite",
    "Spell": "Sort de l" + A + "Ermite",
    "Exorcism": "Exorcisme de l" + A + "Ermite",
    "Nurturance": "Sollicitude de l" + A + "Ermite",
}

idx = {
    "Blackmail": 179,
    "Greed": 186,
    "Anger": 193,
    "Slap": 200,
    "Spell": 203,
    "Exorcism": 206,
    "Nurturance": 209,
}

lines = open(path, encoding="utf-8").read().splitlines(keepends=True)
for card, lineno in idx.items():
    en = Q + "title=" + B + Q + "Hermit" + B + A + "s " + card + B + Q
    fr = Q + "title=" + B + Q + fren[card] + B + Q
    lines[lineno - 1] = "reps.append(" + en + ", " + fr + ")" + NL

open(path, "w", encoding="utf-8").writelines(lines)
print("patched hermit title lines")
