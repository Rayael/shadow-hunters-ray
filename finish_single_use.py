src=open('shadow-hunters/single_use.py',encoding='utf-8').read()
reps=[
('"Do nothing"','"Ne rien faire"'),
('"Reveal and heal fully"','"Révéler et se soigner entièrement"'),
("{'options': [\"Use Concealed Knowledge\"]}","{'options': [\"Utiliser Connaissance Cachée\"]}"),
("{}'s {} protected them from damage!","{}'s {} les a protégé(e)s des dégâts !"),
('{} took {} damage.','{} a subi {} dégât.'),
('"Light the fuse"','"Allumer la mèche"'),
('"Nothing happens."','"Rien ne se passe."'),
('{} blew up the {}!','{} a fait exploser le {} !'),
('"Use Spiritual Doll"','"Utiliser Poupée Spirituelle"'),
("The {} backfired on {}!","Le {} a retourné contre {} !"),
("The {} cursed {}!","Le {} a maudit {} !"),
("{'options': [\"Give an equipment card\", \"Receive 1 damage\"]}",
 "{'options': [\"Donner une carte d'équipement\", \"Recevoir 1 dégât\"]}"),
("{'options': [\"Receive 1 damage\"]}",
 "{'options': [\"Recevoir 1 dégât\"]}"),
('if decision == "Give an equipment card":',
 'if decision == "Donner une carte d\'équipement":'),
]
missing=0
for old,new in reps:
    n=src.count(old)
    if n==0:
        print('NOT FOUND:',old); missing+=1
    else:
        src=src.replace(old,new)
open('shadow-hunters/single_use.py','w',encoding='utf-8').write(src)
print('done, missing=',missing)