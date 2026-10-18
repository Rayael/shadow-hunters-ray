L=open('translate_elements.py',encoding='utf-8').read().splitlines()
regs=[(81,355,'white'),(356,380,'hermit'),(381,393,'areas'),(394,411,'chars')]
tot=0
for a,b,n in regs:
    c=sum(1 for s in L[a-1:b] if s.startswith('reps.append'))
    print(n,c); tot+=c
print('total',tot)