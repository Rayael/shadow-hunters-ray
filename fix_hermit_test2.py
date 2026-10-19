fp='shadow-hunters/tests/element_tests/test_hermit_cards.py'
s=open(fp,encoding='utf-8').read()
# escaped-apostrophe forms: file has "Hermit\'s X" (backslash-apostrophe)
reps=[
("Hermit\\'s Blackmail","Chantage de l'Ermite"),
("Hermit\\'s Greed","Cupidité de l'Ermite"),
("Hermit\\'s Anger","Colère de l'Ermite"),
("Hermit\\'s Slap","Gifle de l'Ermite"),
("Hermit\\'s Spell","Sort de l'Ermite"),
("Hermit\\'s Exorcism","Exorcisme de l'Ermite"),
("Hermit\\'s Nurturance","Sollicitude de l'Ermite"),
("Hermit\\'s Aid","Aide de l'Ermite"),
("Hermit\\'s Huddle","Rassemblement de l'Ermite"),
("Hermit\\'s Lesson","Leçon de l'Ermite"),
("Hermit\\'s Bully","Brute de l'Ermite"),
("Hermit\\'s Prediction","Prédiction de l'Ermite"),
("Use Hermit\\'s Blackmail","Utiliser Chantage de l'Ermite"),
("Use Hermit\\'s Greed","Utiliser Cupidité de l'Ermite"),
("Use Hermit\\'s Anger","Utiliser Colère de l'Ermite"),
("Use Hermit\\'s Slap","Utiliser Gifle de l'Ermite"),
("Use Hermit\\'s Spell","Utiliser Sort de l'Ermite"),
("Use Hermit\\'s Exorcism","Utiliser Exorcisme de l'Ermite"),
("Use Hermit\\'s Nurturance","Utiliser Sollicitude de l'Ermite"),
("Use Hermit\\'s Aid","Utiliser Aide de l'Ermite"),
("Use Hermit\\'s Huddle","Utiliser Rassemblement de l'Ermite"),
("Use Hermit\\'s Lesson","Utiliser Leçon de l'Ermite"),
("Use Hermit\\'s Bully","Utiliser Brute de l'Ermite"),
("Use Hermit\\'s Prediction","Utiliser Prédiction de l'Ermite"),
]
for old,new in reps:
    n=s.count(old)
    if n: print('replaced',n,old)
    s=s.replace(old,new)
open(fp,'w',encoding='utf-8').write(s)
print('done')
