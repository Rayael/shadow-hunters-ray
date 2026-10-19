src=open('shadow-hunters/hermit.py',encoding='utf-8').read()
reps=[
('    "Blackmail",','    "Chantage",'),
('    "Greed",','    "Cupidité",'),
('    "Anger",','    "Colère",'),
('slap = HermitEffect("Slap",','slap = HermitEffect("Gifle",'),
('spell = HermitEffect("Spell",','spell = HermitEffect("Sort",'),
('exorcism = HermitEffect("Exorcism",','exorcism = HermitEffect("Exorcisme",'),
('nurturance = HermitEffect("Nurturance",','nurturance = HermitEffect("Sollicitude",'),
('aid = HermitEffect("Aid",','aid = HermitEffect("Aide",'),
('huddle = HermitEffect("Huddle",','huddle = HermitEffect("Rassemblement",'),
('lesson = HermitEffect("Lesson",','lesson = HermitEffect("Leçon",'),
('bully = HermitEffect("Bully",','bully = HermitEffect("Brute",'),
('prediction = HermitEffect("Prediction",','prediction = HermitEffect("Prédiction",'),
('if self.name == "Prediction":','if self.name == "Prédiction":'),
]
missing=0
for old,new in reps:
    if old not in src:
        print('NOT FOUND:',old); missing+=1
    src=src.replace(old,new)
open('shadow-hunters/hermit.py','w',encoding='utf-8').write(src)
print('hermit.py names updated, missing=',missing)