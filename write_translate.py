Q=chr(34);B=chr(92);A=chr(39);T=chr(10)
tgt="c:/Users/Raphael/Documents/GitMe/Repositories/shadow-hunters-ray/translate_elements.py"
lines=open(tgt,encoding='utf-8').read().splitlines(keepends=True)
out=lines[:177]
if out and out[-1].strip()!='':
    out.append('')
def rep(old,new):
    out.append('reps.append('+old+', '+new+')')
def tval(s):
    return Q+B+Q+s+B+Q   # "value"  ->  \"value\"
def title_rep(card, fren):
    old=tval('title='+B+Q+'Hermit'+B+A+'s '+card+B+Q+',')
    new=tval('title='+B+Q+fren+B+Q+',')
    rep(old,new)
def desc_multi(en_segs, fr_segs):
    def build(segs):
        r='desc=('
        for i,seg in enumerate(segs):
            if i: r+=T+'                      '
            r+=Q+seg+Q
        return r+'),'
    rep(build(en_segs), build(fr_segs))
def desc_single(en, fr):
    rep(Q+en+Q, Q+fr+Q)
out.append('# ---------- Hermit cards ----------')
title_rep('Blackmail','Chantage de l'+A+'Ermite')
desc_multi(['I bet you'+A+'re either a Neutral or a Hunter. ',
            'If so, you must either give an Equipment card',
            ' to the current player or receive 1 damage!'],
           ['Je parie que vous'+A+'es soit un Neutre, soit un Chasseur. ',
            'Dans ce cas, vous devez soit donner une carte d\u00e9quipement ',
            'au joueur courant, soit recevoir 1 d\u00e9gat !'])
title_rep('Greed','Cupidit\u00e9 de l'+A+'Ermite')
desc_multi(['I bet you'+A+'re either a Neutral or a Shadow. ',
            'If so, you must either give an Equipment card',
            ' to the current player or receive 1 damage!'],
           ['Je parie que vous'+A+'es soit un Neutre, soit une Ombre. ',
            'Dans ce cas, vous devez soit donner une carte d\u00e9quipement ',
            'au joueur courant, soit recevoir 1 d\u00e9gat !'])
title_rep('Anger','Col\u00e8re de l'+A+'Ermite')
desc_multi(['I bet you'+A+'re either a Hunter or a Shadow. ',
            'If so, you must either give an Equipment card',
            ' to the current player or receive 1 damage!'],
           ['Je parie que vous'+A+'es soit un Chasseur, soit une Ombre. ',
            'Dans ce cas, vous devez soit donner une carte d\u00e9quipement ',
            'au joueur courant, soit recevoir 1 d\u00e9gat !'])
title_rep('Slap','Gifle de l'+A+'Ermite')
desc_single('I bet you'+A+'re a Hunter. If so, you receive 1 damage!',
            'Je parie que vous'+A+'es un Chasseur. Si oui, vous recevez 1 d\u00e9gat !')
title_rep('Spell','Sort de l'+A+'Ermite')
desc_single('I bet you'+A+'re a Shadow. If so, you receive 1 damage!',
            'Je parie que vous'+A+'es une Ombre. Si oui, vous recevez 1 d\u00e9gat !')
title_rep('Exorcism','Exorcisme de l'+A+'Ermite')
desc_single('I bet you'+A+'re a Shadow. If so, you receive 2 damage!',
            'Je parie que vous'+A+'es une Ombre. Si oui, vous recevez 2 d\u00e9gats !')
title_rep('Nurturance','Sollicitude de l'+A+'Ermite')
desc_multi(['I bet you'+A+'re a Neutral. If so, you heal 1 damage! ',
            '(However, if you have no damage, ',
            'then you receive 1 damage!)'],
           ['Je parie que vous'+A+'es un Neutre. Si oui, vous soignez 1 d\u00e9gat ! ',
            '(Cependant, si vous n\u2019avez aucun d\u00e9gat, ',
            'vous en recevez 1 !)'])
title_rep('Aid','Aide de l'+A+'Ermite')
desc_multi(['I bet you'+A+'re a Hunter. If so, you heal 1 damage! ',
            '(However, if you have no damage, ',
            'then you receive 1 damage!)'],
           ['Je parie que vous'+A+'es un Chasseur. Si oui, vous soignez 1 d\u00e9gat ! ',
            '(Cependant, si vous n\u2019avez aucun d\u00e9gat, ',
            'vous en recevez 1 !)'])
title_rep('Huddle','Attroupement de l'+A+'Ermite')
desc_multi(['I bet you'+A+'re a Shadow. If so, you heal 1 damage! ',
            '(However, if you have no damage, ',
            'then you receive 1 damage!)'],
           ['Je parie que vous'+A+'es une Ombre. Si oui, vous soignez 1 d\u00e9gat ! ',
            '(Cependant, si vous n\u2019avez aucun d\u00e9gat, ',
            'vous en recevez 1 !)'])
title_rep('Lesson','Le\u00e7on de l'+A+'Ermite')
desc_multi(['I bet your maximum HP is 12 or more. ',
            'If so, you receive 2 damage!'],
           ['Je parie que vos PV maximum sont de 12 ou plus. ',
            'Si oui, vous recevez 2 d\u00e9gats !'])
title_rep('Bully','Brute de l'+A+'Ermite')
desc_multi(['I bet your maximum HP is 11 or less. ',
            'If so, you receive 1 damage!'],
           ['Je parie que vos PV maximum sont de 11 ou moins. ',
            'Si oui, vous recevez 1 d\u00e9gat !'])
title_rep('Prediction','Pr\u00e9diction de l'+A+'Ermite')
desc_single('You must reveal your character information '+T+'secretly to the current player!',
            'Vous devez r\u00e9v\u00e9ler secr\u00e8tement votre '+T+'information de personnage au joueur courant!')

out.append('# ---------- Areas ----------')
def area_rep(name, fren, en_desc, fr_desc):
    rep(Q+'name='+B+Q+name+B+A+'s Cabin'+B+Q+',' if name=="Hermit" else Q+'name='+B+Q+name+B+Q+',',
        Q+'name='+B+Q+fren+B+Q+',')
    rep(Q+'                desc="'+en_desc+'",', Q+'                desc="'+fr_desc+'",')
area_rep("Hermit","Cabane de l"+A+'Ermite',"Draw a Hermit Card.","Piochez une carte d\u2019Ermite.")
area_rep("Underworld Gate","Porte des Enfers","Draw a card from the deck of your choice.","Piochez une carte dans le deck de votre choix.")
area_rep("Church","\u00c9glise","Draw a White Card.","Piochez une carte Blanche.")
area_rep("Cemetery","Cimeti\u00e8re","Draw a Black Card.","Piochez une carte Noire.")
area_rep("Weird Woods","Bois \u00c9tranges","Heal 1 damage or give 2 damage to any player.","Soignez 1 d\u00e9gat ou infligez 2 d\u00e9gats \u00e0 n\u2019importe quel joueur.")
area_rep("Erstwhile Altar","Autel d\u2019Antan","Steal an equipment card from any player.","Volez une carte d\u2019\u00e9quipement \u00e0 un joueur.")
out.append('# ---------- Characters ----------')
def wc(en, fr): rep(Q+'                win_cond_desc="'+en+'",', Q+'                win_cond_desc="'+fr+'",')
def sp(en, fr): rep(Q+'                special_desc='+Q+en+Q+',', Q+'                special_desc='+Q+fr+Q+',')
wc("All of the Hunters (or 3 Neutrals) are dead.","Tous les Chasseurs (ou 3 Neutres) sont morts.")
wc("All of the Hunters are dead.","Tous les Chasseurs sont morts.")
wc("All of the Shadows are dead.","Toutes les Ombres sont mortes.")
wc("You"+A+"re not dead when the game is over.","Vous n\u2019\u00eates pas mort quand la partie se termine.")
wc("You have 5 or more equipment cards.","Vous avez 5 cartes d\u2019\u00e9quipement ou plus.")
wc("You"+A+"re the last two players alive.","Vous \u00eates les deux derniers joueurs en vie.")
sp("When you attack, you only roll the 4-sided die"+T+"                              "+Q+" and inflict the amount of damage rolled.",
   "Quand vous attaquez, vous ne lancez que le d\u00e9 \u00e0 4 faces"+T+"                              "+Q+" et infligez le montant des d\u00e9gats obtenus.")
sp("If you attack a player and inflict damage, "+T+"                              "+Q+"you heal 2 points of your own damage.",
   "Si vous attaquez un joueur et infligez des d\u00e9gats, "+T+"                              "+Q+"vous soignez 2 points de vos propres d\u00e9gats.")
sp("After you are attacked, "+T+"                              "+Q+"you can counterattack immediately.",
   "Apr\u00e8s avoir \u00e9t\u00e9 attaqu\u00e9, "+T+"                              "+Q+"vous pouvez contre-attaquer imm\u00e9diatement.")
sp("When your turn starts, you can give 3 damage"+T+"                              "+Q+" to one player who is at"+T+"                              "+Q+" the Underworld Gate.",
   "Quand votre tour commence, vous pouvez infliger 3 d\u00e9gats"+T+"                              "+Q+" \u00e0 un joueur qui se trouve \u00e0 la "+T+"                              "+Q+" Porte des Enfers.")
sp("Once per game, you may fully heal your damage.","Une fois par partie, vous pouvez enti\u00e8rement soigner vos d\u00e9gats.")
sp("If your attack inflicts 2 or more damage, "+T+"                              "+Q+"you may steal an Equipment card from your"+T+"                              "+Q+" target instead of giving damage.",
   "Si votre attaque inflige 2 d\u00e9gats ou plus, "+T+"                              "+Q+"vous pouvez voler une carte d\u2019\u00e9quipement \u00e0 votre "+T+"                              "+Q+" cible au lieu d\u2019infliger des d\u00e9gats.")
sp("When your turn starts, you heal 1 damage.","Quand votre tour commence, vous soignez 1 d\u00e9gat.")
sp("Once per game, when your turn starts, you can"+T+"                              "+Q+" pick a player and damage them for the"+T+"                              "+Q+" roll of a 4-sided die.",
   "Une fois par partie, quand votre tour commence, vous pouvez "+T+"                              "+Q+"choisir un joueur et lui infliger les d\u00e9gats "+T+"                              "+Q+"du lancer du d\u00e9 \u00e0 4 faces.")
sp("Once per game, when your turn starts, "+T+"                              "+Q+"you can set the damage of any player to 7.",
   "Une fois par partie, quand votre tour commence, "+T+"                              "+Q+"vous pouvez fixer les d\u00e9gats de n\u2019importe quel joueur \u00e0 7.")
sp("Once per game, when your turn starts, "+T+"                              "+Q+"you can pick a player and damage"+T+"                              "+Q+" them for the roll of a 6-sided die.",
   "Une fois par partie, quand votre tour commence, "+T+"                              "+Q+"vous pouvez choisir un joueur et lui infliger "+T+"                              "+Q+"les d\u00e9gats du lancer du d\u00e9 \u00e0 6 faces.")
sp("Once per game, when your turn starts, "+T+"                              "+Q+"you can choose a player and permanently"+T+"                              "+Q+" void their special ability.",
   "Une fois par partie, quand votre tour commence, "+T+"                              "+Q+"vous pouvez choisir un joueur et annuler d\u00e9finitivement "+T+"                              "+Q+"sa capacit\u00e9 sp\u00e9ciale.")
out.append('# ---------- Apply ----------')
out.append('count=0')
out.append('for old,new in reps:')
out.append('    if old not in src:')
out.append("        print('MISSING',old[:70])")
out.append('        continue')
out.append('    src=src.replace(old,new)')
out.append('    count+=1')
out.append("with io.open(path,'w',encoding='utf-8') as f:")
out.append("    f.write(src)")
out.append("print('APPLIED',count,'of',len(reps),'replacements to elements.py')")
open(tgt,'w',encoding='utf-8').write(T.join(out)+T)
print('wrote translate_elements.py with',len(out),'lines')
