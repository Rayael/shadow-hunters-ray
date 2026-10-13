# Quick notes for deploying to Railway

1) On railway.app create a new project -> Deploy from GitHub -> select this repository (Rayael/shadow-hunters-ray) and connect.

2) Railway will detect Python. If needed set the start command to use the Procfile: `web: gunicorn -k eventlet -w 1 "shadow-hunters.app:app"` (Procfile is already in the repo).

3) Environment variables to add in Railway (Project > Variables):
   - SECRET_KEY = (generate a random long string)
   - ACCESS_CODE = (shared code for your friends, e.g. "horseshoe123")
   - SOCKET_SLEEP (optional)
   - AI_SLEEP (optional)

4) Choose the free plan for the service. The app uses eventlet and should run within Railway's free limits for a few concurrent players (0.5GB RAM). If you observe memory issues, reduce AI or number of players.

5) Once deployed, share the Railway service URL with your friends and the ACCESS_CODE.

