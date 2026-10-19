src=open('shadow-hunters/single_use.py',encoding='utf-8').read()
reps=[
# first_aid
('{"options": ["Use First Aid"]}', '{"options": ["Utiliser Premiers Secours"]}'),
('"{} applied {} to {}!"', '"{} a utilisé {} sur {}!"'),
# judgement
('{"options": ["Unleash judgement"]}', '{"options": ["Déchaîner le jugement"]}'),
# holy_water
('{"options": ["Heal yourself"]}', '{"options": ["Vous soigner"]}'),
# advent
('{"options": ["Do nothing"]}', '{"options": ["Ne rien faire"]}'),
('data[\'options\'].append("Reveal and heal fully")', 'data[\'options\'].append("Révéler et se soigner entièrement")'),
('data[\'options\'].append("Heal fully")', 'data[\'options\'].append("Se soigner entièrement")'),
('if decision == "Do nothing":', 'if decision == "Ne rien faire":'),
('elif decision == "Reveal and heal fully":', 'elif decision == "Révéler et se soigner entièrement":'),
('"{} did nothing."', '"{} n\'a rien fait."'),
# disenchant_mirror
('data[\'options\'].append("Reveal yourself")', 'data[\'options\'].append("Révélez-vous")'),
# blessing
('{"options": ["Bless someone"]}', '{"options": ["Bénir quelqu\'un"]}'),
('"The blessing healed {}!"', '"La bénédiction a soigné {}!"'),
# chocolate
('low_hp = ["Allie", "Agnes", "Emi", "Ellen", "Ultra Soul", "Unknown"]',
 'low_hp = ["Allie", "Agnes", "Emi", "Ellen", "Ultra Soul", "Unknown"]'),
('if decision == "Do nothing":', 'if decision == "Ne rien faire":'),
# banana_peel
('{"options": ["Give an equipment card", "Receive 1 damage"]}',
 '{"options": ["Donner une carte d\'équipement", "Recevoir 1 dégât"]}'),
('{"options": ["Receive 1 damage"]}', '{"options": ["Recevoir 1 dégât"]}'),
('if decision == "Give an equipment card":', 'if decision == "Donner une carte d\'équipement":'),
('"{} is choosing an equipment card to give away..."', '"{} choisit une carte d\'équipement à donner..."'),
('"{} took {} damage."', '"{} a subi {} dégât."'),
# dynamite
('{"options": ["Light the fuse"]}', '{"options": ["Allumer la mèche"]}'),
('"{} is rolling for where the dynamite lands..."', '"{} lance les dés pour savoir où tombe la dynamite..."'),
('"Nothing happens."', '"Rien ne se passe."'),
('"{} blew up the {}!"', '"{} a fait exploser le {} !'),
('"{} took {} damage."', '"{} a subi {} dégât."'),
# spiritual_doll
('{"options": ["Use Spiritual Doll"]}', '{"options": ["Utiliser Poupée Spirituelle"]}'),
('\'The {} backfired on {}!\'', '\'Le {} a retourné contre {} !\''),
('\'The {} cursed {}!\'', '\'Le {} a maudit {} !\''),
]
missing=0
for old,new in reps:
    if old not in src:
        print('NOT FOUND:',old); missing+=1
    src=src.replace(old,new)
open('shadow-hunters/single_use.py','w',encoding='utf-8').write(src)
print('single_use.py updated, missing=',missing)