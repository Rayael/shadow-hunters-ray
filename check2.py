L=open('translate_elements.py',encoding='utf-8').read().splitlines()
print('TOTAL',len(L))
for i,s in enumerate(L):
    if s.startswith('# ----------') or s.startswith('path =') or s.startswith('    src =') or s.startswith('count=') or s.startswith('for old,new') or s.startswith('# translate'):
        print(i+1,repr(s[:90]))