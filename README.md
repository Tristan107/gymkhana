# How to run
npm run dev

# How to test
npm run test

# How to e2e test

Interactive test runner (headless, with snapshot inspection):
npx playwright test --ui

Watch tests live in a real browser (skips visual regression):
npx playwright test --headed --grep-invert "@ui-test-only"

Slow down tests (useful with --ui or --headed):
`SLOW_MO=200 npx playwright test --headed --workers=1`
# --workers=1 forces tests to run sequentially (no parallel browsers)
# The SLOW MO option adds 200ms delay between each action (tweak as needed)

# How to deploy
The app auto-deploys to GitHub Pages via CI on every push to main:
Site URL: https://tristan107.github.io/gymkhana/

To deploy the Firestore database rules only:
npm run deploy

# Local multiplayer testing (uses the Firebase Realtime Database emulator)
npx firebase emulators:start --only database   # terminal 1
npm run dev                                    # terminal 2
