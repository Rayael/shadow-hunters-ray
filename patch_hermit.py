# Patch the 7 hermit title reps to valid double-quoted Python strings.
path = r"c:\Users\Raphael\Documents\GitMe\Repositories\shadow-hunters-ray\translate_elements.py"
fixes = {
    179: 'reps.append(("title=\\'Hermit\\\\\'s Blackmail\\',", "title=\\'Chantage de l\\\'Ermite\\',"))',
    186: 'reps.append(("title=\\'Hermit\\\\\'s Greed\\',", "title=\\'Cupidité de l\\\'Ermite\\',"))',
    193: 'reps.append(("title=\\'Hermit\\\\\'s Anger\\',", "title=\\'Colère de l\\\'Ermite\\',"))',
    200: 'reps.append(("title=\\'Hermit\\\\\'s Slap\\',", "title=\\'Gifle de l\\\'Ermite\\',"))',
    203: 'reps.append(("title=\\'Hermit\\\\\'s Spell\\',", "title=\\'Sort de l\\\'Ermite\\',"))',
    206: 'reps.append(("title=\\'Hermit\\\\\'s Exorcism\\',", "title=\\'Exorcisme de l\\\'Ermite\\',"))',
    209: 'reps.append(("title=\\'Hermit\\\\\'s Nurturance\\',", "title=\\'Sollicitude de l\\\'Ermite\\',"))',
}
lines = open(path, encoding="utf-8").read().splitlines(keepends=True)
for idx, new in fixes.items():
    lines[idx] = new + "\n"
open(path, "w", encoding="utf-8").writelines(lines)
print("patched hermit title lines")
