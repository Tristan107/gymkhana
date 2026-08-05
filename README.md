# How to run
npm run dev

# How to test
npm run test

# How to deploy
npm install          # pulls in firebase-tools
npx firebase login   # one-time browser auth
npm run deploy       # builds + publishes
Site URL: https://gymkhana-69b62.web.app
Future updates = just npm run deploy.

# Local multiplayer testing (uses the Firebase Realtime Database emulator)
The RTDB emulator needs a JRE. On this machine a portable JRE 21 is cached at
~/.cache/gymkhana-jre/jdk-21.0.12+8-jre (no sudo needed):

export JAVA_HOME=~/.cache/gymkhana-jre/jdk-21.0.12+8-jre
export PATH="$JAVA_HOME/bin:$PATH"
npx firebase emulators:start --only database   # terminal 1
npm run dev                                     # terminal 2
Open http://localhost:5173 → "Online 1v1 game" → pick a color → copy the link.
Paste the link in a NEW tab/window → it auto-joins as the opponent → play 1v1.
(Dev mode gives each tab its own player id, so two tabs are two different players.
You can force an id with ?pid=guest if needed.)

The app auto-connects to the local emulator in dev (or with ?emulator=1 on a built app);
the deployed site always uses the real database.
