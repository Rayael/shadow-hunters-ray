fp='shadow-hunters/tests/element_tests/test_hermit_cards.py'
s=open(fp,encoding='utf-8').read()
reps=[
("Utiliser Chantage de l'Ermite","Utiliser Chantage"),
("Utiliser Cupidité de l'Ermite","Utiliser Cupidité"),
("Utiliser Colère de l'Ermite","Utiliser Colère"),
("Utiliser Gifle de l'Ermite","Utiliser Gifle"),
("Utiliser Sort de l'Ermite","Utiliser Sort"),
("Utiliser Exorcisme de l'Ermite","Utiliser Exorcisme"),
("Utiliser Sollicitude de l'Ermite","Utiliser Sollicitude"),
("Utiliser Aide de l'Ermite","Utiliser Aide"),
("Utiliser Rassemblement de l'Ermite","Utiliser Rassemblement"),
("Utiliser Leçon de l'Ermite","Utiliser Leçon"),
("Utiliser Brute de l'Ermite","Utiliser Brute"),
("Utiliser Prédiction de l'Ermite","Utiliser Prédiction"),
]
for old,new in reps:
    n=s.count(old)
    if n: print('replaced',n,old)
    s=s.replace(old,new)
open(fp,'w',encoding='utf-8').write(s)
print('done hermit Utiliser fix')

# add Receive 2 damage to global mapping file too
fp2='update_tests.py'
s2=open(fp2,encoding='utf-8').read()
if '("Receive 2 damage","Recevoir 2 dégâts")' not in s2:
    s2=s2.replace('("Receive 1 damage","Recevoir 1 dégât"),',
                  '("Receive 1 damage","Recevoir 1 dégât"),\n("Receive 2 damage","Recevoir 2 dégâts"),')
    open(fp2,'w',encoding='utf-8').write(s2)
    print('added Receive 2 damage to update_tests.py')
else:
    print('Receive 2 damage already in update_tests.py')
