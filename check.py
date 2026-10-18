d=open('shadow-hunters/elements.py','rb').read()
cr=bytes([13]);lf=bytes([10]);crlf=cr+lf
print('CRLF:',d.count(crlf),'LF:',d.count(lf),'CR:',d.count(cr))
t=d.find(b'title="Hermit')
seg=d[t:t+40]
print('title bytes:',list(seg))
a=d.find(b'name="Hermit')
print('area name bytes:',list(d[a:a+36]))
w=d.find(b'special_desc="When you attack')
print('special_desc bytes:',list(d[w:w+70]))
print('special_desc repr:',repr(d[w:w+70]))
