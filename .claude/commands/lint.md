# Lint CutX Platform

Run linting and type checking on both projects.

## Instructions

1. **TypeScript Check (Frontend)**
   ```bash
   cd cutx-frontend && npx tsc --noEmit
   ```

2. **TypeScript Check (Backend)**
   ```bash
   cd cutx-api && npx tsc --noEmit
   ```

3. **ESLint (Frontend)**
   ```bash
   cd cutx-frontend && npm run lint
   ```

4. **ESLint (Backend)**
   ```bash
   cd cutx-api && npm run lint
   ```

5. Report all errors and warnings, grouped by file.

## Auto-fix
If the user says "fix", run with `--fix` flag.
