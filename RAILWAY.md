# Quick notes for deploying to Railway

1) On railway.app create a new project -> Deploy from GitHub -> select this repository (Rayael/shadow-hunters-ray) and connect.

2) Railway will detect Python. Use the start command from the Procfile: `web: python -u -m shadow-hunters.app` (Procfile is already in the repo).

3) Environment variables to add in Railway (Project > Variables):
   - SECRET_KEY = (generate a random long string)
   - GAME_CODE = (shared access code for your friends, default "Edgar")
   - SOCKET_SLEEP (optional)
   - AI_SLEEP (optional)

4) Choose the free plan for the service. The app uses eventlet and should run within Railway's free limits for a few concurrent players (0.5GB RAM). If you observe memory issues, reduce AI or number of players.

5) Once deployed, share the Railway service URL with your friends and the GAME_CODE.

