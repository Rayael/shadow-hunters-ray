s=open('shadow-hunters/tests/element_tests/test_hermit_cards.py',encoding='utf-8').read()
old="'Donner une carte d'équipement'"
new='"Donner une carte d\'équipement"'
n=s.count(old)
s=s.replace(old,new)
open('shadow-hunters/tests/element_tests/test_hermit_cards.py','w',encoding='utf-8').write(s)
print('replaced',n)
