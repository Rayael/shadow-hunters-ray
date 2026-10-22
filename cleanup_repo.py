import os
import glob

repo = r"c:\Users\Raphael\Documents\GitMe\Repositories\shadow-hunters-ray"

# Delete specific unwanted untracked files
unwanted = [
    "clean_repo.bat",
    "card_test.py",
    "card_b64.txt",
    "card_copy.py",
    "card_new.py",
]

for name in unwanted:
    f = os.path.join(repo, name)
    if os.path.exists(f):
        os.remove(f)
        print(f"Deleted: {name}")
    else:
        print(f"Not found: {name}")

# Delete all _*.py and _*.txt files (debug/temp files)
for pattern in ["_*.py", "_*.txt"]:
    for f in glob.glob(os.path.join(repo, pattern)):
        try:
            os.remove(f)
            print(f"Deleted: {os.path.basename(f)}")
        except:
            pass

print("\nCleanup complete")