# Build CutX Platform

Build both frontend and backend to check for errors.

## Instructions

1. **Build Frontend (Next.js)**
   ```bash
   cd cutx-frontend && npm run build
   ```

2. **Build Backend (NestJS)**
   ```bash
   cd cutx-api && npm run build
   ```

3. Report any build errors found and suggest fixes.

## Expected Output
- Frontend: `.next/` directory created
- Backend: `dist/` directory created
- No TypeScript errors
