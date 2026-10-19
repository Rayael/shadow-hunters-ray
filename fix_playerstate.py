import glob
fixed=0
for fp in glob.glob('shadow-hunters/tests/**/*.py',recursive=True):
    s=open(fp,encoding='utf-8').read()
    n=s.count('PlayerState.Révélered')
    if n:
        s=s.replace('PlayerState.Révélered','PlayerState.Revealed')
        open(fp,'w',encoding='utf-8').write(s)
        fixed+=n
        print('fixed',n,'in',fp)
print('total PlayerState.Révélered fixed:',fixed)
