import glob, re
terms = ["Hermit's","Bloodthirsty Spider","Vampire Bat","Moody Goblin","Diabolic Ritual",
"Banana Peel","Spiritual Doll","Flare of Judgement","First Aid","Holy Water of Healing",
"Advent","Blessing","Disenchant Mirror","Chocolate","Concealed Knowledge","Guardian Angel",
"Holy Robe","Chainsaw","Rusted Broad Axe","Erstwhile Altar","Weird Woods","Hermit's Cabin",
"Underworld Gate","Church","Cemetery","Do nothing","Reveal and heal fully","Heal fully",
"Receive 1 damage","Give an equipment card","Use Spiritual Doll","Give 2 damage","Heal 1 damage",
"Reveal","Roll the 6-sided die","Use Hermit's","Holy Robe"]
for fp in glob.glob('shadow-hunters/tests/**/*.py',recursive=True):
    s=open(fp,encoding='utf-8').read()
    found=[t for t in terms if t in s]
    if found:
        print(fp, '->', found)
