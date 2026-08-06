# How to run
npm run dev

# How to test
npm run test

# How to deploy
The app auto-deploys to GitHub Pages via CI on every push to main:
Site URL: https://tristan107.github.io/gymkhana/

To deploy the Firestore database rules only:
npm run deploy

# Local multiplayer testing (uses the Firebase Realtime Database emulator)
npx firebase emulators:start --only database   # terminal 1
npm run dev                                    # terminal 2
