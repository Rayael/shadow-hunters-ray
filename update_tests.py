import os, glob
reps=[
("Use Hermit's Blackmail","Utiliser Chantage de l'Ermite"),
("Use Hermit's Greed","Utiliser Cupidité de l'Ermite"),
("Use Hermit's Anger","Utiliser Colère de l'Ermite"),
("Use Hermit's Slap","Utiliser Gifle de l'Ermite"),
("Use Hermit's Spell","Utiliser Sort de l'Ermite"),
("Use Hermit's Exorcism","Utiliser Exorcisme de l'Ermite"),
("Use Hermit's Nurturance","Utiliser Sollicitude de l'Ermite"),
("Use Hermit's Aid","Utiliser Aide de l'Ermite"),
("Use Hermit's Huddle","Utiliser Rassemblement de l'Ermite"),
("Use Hermit's Lesson","Utiliser Leçon de l'Ermite"),
("Use Hermit's Bully","Utiliser Brute de l'Ermite"),
("Use Hermit's Prediction","Utiliser Prédiction de l'Ermite"),
("Hermit's Blackmail","Chantage de l'Ermite"),
("Hermit's Greed","Cupidité de l'Ermite"),
("Hermit's Anger","Colère de l'Ermite"),
("Hermit's Slap","Gifle de l'Ermite"),
("Hermit's Spell","Sort de l'Ermite"),
("Hermit's Exorcism","Exorcisme de l'Ermite"),
("Hermit's Nurturance","Sollicitude de l'Ermite"),
("Hermit's Aid","Aide de l'Ermite"),
("Hermit's Huddle","Rassemblement de l'Ermite"),
("Hermit's Lesson","Leçon de l'Ermite"),
("Hermit's Bully","Brute de l'Ermite"),
("Hermit's Prediction","Prédiction de l'Ermite"),
("Bloodthirsty Spider","Araignée Assoiffée de Sang"),
("Vampire Bat","Chauve-souris Vampirique"),
("Moody Goblin","Gobelin Capricieux"),
("Diabolic Ritual","Rituel Diabolique"),
("Banana Peel","Épluchure de Banane"),
("Spiritual Doll","Poupée Spirituelle"),
("Flare of Judgement","Brasier du Jugement"),
("First Aid","Premiers Secours"),
("Holy Water of Healing","Eau Sainte de Guérison"),
("Advent","Avènement"),
("Blessing","Bénédiction"),
("Disenchant Mirror","Miroir de Désenvoûtement"),
("Chocolate","Chocolat"),
("Concealed Knowledge","Connaissance Cachée"),
("Guardian Angel","Ange Gardien"),
("Holy Robe","Robe Sainte"),
("Chainsaw","Tronçonneuse"),
("Rusted Broad Axe","Hache Large Oxydée"),
("Erstwhile Altar","Autel d'Antan"),
("Weird Woods","Bois Étrangers"),
("Hermit's Cabin","Cabane de l'Ermite"),
("Underworld Gate","Porte des Enfers"),
("Church","Église"),
("Cemetery","Cimetière"),
("Reveal and heal fully","Révéler et se soigner entièrement"),
("Do nothing","Ne rien faire"),
("Heal fully","Se soigner entièrement"),
("Receive 1 damage","Recevoir 1 dégât"),
("Receive 2 damage","Recevoir 2 dégâts"),
("Give an equipment card","Donner une carte d'équipement"),
("Use Spiritual Doll","Utiliser Poupée Spirituelle"),
("Give 2 damage","Donner 2 dégâts"),
("Heal 1 damage","Soigner 1 dégât"),
("Roll the 6-sided die!","Lancer le dé à 6 faces !"),
("Reveal","Révéler"),
]
files=glob.glob('shadow-hunters/tests/**/*.py',recursive=True)
total=0
for fp in files:
    s=open(fp,encoding='utf-8').read()
    orig=s
    for old,new in reps:
        s=s.replace(old,new)
    if s!=orig:
        open(fp,'w',encoding='utf-8').write(s)
        total+=1
        print('updated',fp)
print('done, files updated=',total)
