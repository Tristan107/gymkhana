# SonarQube Coverage Setup Plan (Local Only)

## Goal
Generate code coverage locally with Vitest, push to self-hosted SonarQube (Docker, port 9000) on demand. No CI/CD, no GitHub Actions.

---

## Current State
- **sonar-scan.sh** exists: uses `sonar-scanner-npm` to push to `http://localhost:9000`
- **Missing**: `sonar-project.properties`, Vitest coverage config
- **Tests**: Vitest (unit) in `src/game/tests/`

---

## Implementation Steps

### 1. Add Vitest Coverage Configuration
**File**: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'json', 'html', 'text'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/tests/**',
        '**/e2e/**',
        '**/types/**',
        'src/firebase/**',
        'src/hooks/useOnlineGame.ts',
        'vite.config.ts',
        'vitest.config.ts',
        'playwright.config.ts',
      ],
    },
  },
})
```

**Rationale**:
- `.tsx` excluded: components have no unit tests; they are exercised by E2E tests instead
- `src/firebase/**`, `useOnlineGame.ts` excluded: online-play-only code, no unit tests (covered by E2E only)
- No `.js` files in the project, so nothing else needed

### 2. Create SonarQube Project Configuration
**File**: `sonar-project.properties`

```properties
sonar.projectKey=Gymkhana
sonar.projectName=Gymkhana
sonar.projectVersion=1.0.0

# Source & test directories
sonar.sources=src
sonar.tests=src/game/tests
sonar.test.inclusions=**/*.test.ts

# Coverage
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.coverage.exclusions=**/*.test.ts,**/e2e/**,**/node_modules/**,**/dist/**,**/*.config.*,src/firebase/**,src/hooks/useOnlineGame.ts

# Exclusions
sonar.exclusions=**/node_modules/**,**/dist/**,**/e2e/**,**/*.config.*,**/coverage/**

# Language
sonar.languages=ts
```

### 3. Update package.json Scripts
**File**: `package.json` (modify scripts section)

```json
{
  "scripts": {
    "test": "vitest run --exclude=src/game/tests/ai_v2.test.ts",
    "test:ai": "vitest run src/game/tests/ai_v2.test.ts",
    "test:all": "vitest run",
    "test:all:coverage": "vitest run --coverage",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "sonar:scan": "./sonar-scan.sh",
    "predeploy": "npm run build",
    "deploy:rules": "firebase deploy --only database",
    "deploy": "npm run deploy:rules"
  }
}
```

### 4. Update sonar-scan.sh (Read version from package.json)
**File**: `sonar-scan.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

SONAR_HOST="${SONAR_HOST:-http://localhost:9000}"
SONAR_TOKEN="${SONAR_TOKEN:?Set SONAR_TOKEN to your SonarQube token}"
PROJECT_KEY="Gymkhana"
PROJECT_VERSION=$(node -p "require('./package.json').version")
MAX_WAIT=120

sonar-scanner-npm \
  -Dsonar.host.url="$SONAR_HOST" \
  -Dsonar.token="$SONAR_TOKEN" \
  -Dsonar.projectKey="$PROJECT_KEY" \
  -Dsonar.projectVersion="$PROJECT_VERSION"

TASK_ID="$(sed -n 's/^ceTaskId=//p' .scannerwork/report-task.txt)"
if [ -z "$TASK_ID" ]; then
  echo "ERROR: could not read ceTaskId from .scannerwork/report-task.txt" >&2
  exit 1
fi

echo "Waiting for analysis task $TASK_ID to complete..."
STATUS=""
for ((i = 0; i < MAX_WAIT; i++)); do
  STATUS="$(curl -s -u "$SONAR_TOKEN:" "$SONAR_HOST/api/ce/task?id=$TASK_ID" | jq -r '.task.status')"
  case "$STATUS" in
    SUCCESS) break ;;
    FAILED | CANCELED)
      echo "ERROR: analysis task ended with status $STATUS" >&2
      exit 1
      ;;
  esac
  sleep 2
done

if [ "$STATUS" != "SUCCESS" ]; then
  echo "ERROR: timed out waiting for analysis task" >&2
  exit 1
fi

curl -s -u "$SONAR_TOKEN:" \
  "$SONAR_HOST/api/issues/search?componentKeys=$PROJECT_KEY&resolved=false&ps=500" \
  | jq '[.issues[] | {file: .component, line: .line, message: .message, rule: .rule, severity: .severity, type: .type}]' \
  > sonar_issues.json

echo "Issues exported to sonar_issues.json"
```

---

## Usage (When You Want)

```bash
# 1. Start SonarQube (if not running)
docker start sonarqube  # or your container name

# 2. Export token (or add to ~/.bashrc permanently)
export SONAR_TOKEN=your-token-here

# 3. Run tests with coverage
npm run test:all:coverage

# 4. Push to SonarQube
./sonar-scan.sh
```

---

## Dependencies to Add
```bash
npm install -D @vitest/coverage-v8
```

---

## Verification Checklist
- [ ] `npm run test:all:coverage` generates `coverage/lcov.info`
- [ ] `./sonar-scan.sh` runs successfully against local SonarQube
- [ ] Coverage appears in SonarQube project dashboard at `http://localhost:9000`
- [ ] No GitHub Actions, no CI/CD

---

## Files to Create/Modify
| File | Action |
|------|--------|
| `vitest.config.ts` | Modify - add coverage config |
| `sonar-project.properties` | Create new |
| `package.json` | Modify - add `test:all:coverage` script |
| `sonar-scan.sh` | Modify - add version from package.json |

---

## Notes
- **SonarQube manages thresholds**: Configure quality gates in SonarQube UI
- **Run on demand**: You control when to scan - no automatic triggers
- **E2E tests**: Run separately with `npm run test:e2e` (no coverage)