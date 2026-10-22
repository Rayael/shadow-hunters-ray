# Script to fix card.py duplicate content
with open('shadow-hunters/card.py', 'r') as f:
    lines = f.readlines()

# Keep only the first 24 lines (the new card class with resource_id)
new_content = ''.join(lines[:24])

with open('shadow-hunters/card.py', 'w') as f:
    f.write(new_content)

print("Fixed card.py - removed duplicate")