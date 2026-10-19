import glob
terms = ['Blackmail','Greed','Anger','Slap','Spell','Exorcism','Nurturance','Huddle','Lesson','Bully','Prediction',"Hermit's",'Holy Robe','Chainsaw','Rusted Broad Axe','Weird Woods','Underworld Gate','Erstwhile Altar','Church','Cemetery']
for fp in glob.glob('shadow-hunters/tests/**/*.py',recursive=True):
    s=open(fp,encoding='utf-8').read()
    for term in terms:
        if term in s:
            print(fp,'::',term)
