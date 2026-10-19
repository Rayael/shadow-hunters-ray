fp='shadow-hunters/tests/element_tests/test_hermit_cards.py'
s=open(fp,encoding='utf-8').read()
effects=['Chantage','Cupidité','Colère','Gifle','Sort','Exorcisme','Sollicitude','Aide','Rassemblement','Leçon','Brute','Prédiction']
for eff in effects:
    old="Use {} de l'Ermite".format(eff)
    new="Utiliser {}".format(eff)
    n=s.count(old)
    if n: print('replaced',n,old,'->',new)
    s=s.replace(old,new)
open(fp,'w',encoding='utf-8').write(s)
print('done')
