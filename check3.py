L=open('translate_elements.py',encoding='utf-8').read().splitlines()
for i,s in enumerate(L):
    if s.startswith('# ----------') or ('Black' in s and s.strip().startswith('#')):
        print(i+1,repr(s[:70]))
print('---sample line 337---')
print(repr(L[336]))
print('---sample line 177---')
print(repr(L[176][:90]))
print('---count reps.append---')
print(sum(1 for s in L if s.startswith('reps.append')))