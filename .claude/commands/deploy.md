# Deploy CutX Platform

Push changes and monitor deployment status.

## Instructions

1. **Check git status**
   ```bash
   git status
   ```

2. **If changes exist, commit and push**
   ```bash
   git add .
   git commit -m "deploy: [description]"
   git push origin main
   ```

3. **Check deployment status**
   - Frontend (Netlify): https://app.netlify.com/sites/cutx/deploys
   - Backend (Railway): https://railway.app/project/cutx

4. **Health check after deploy**
   ```bash
   curl -s https://cutxplateform-production.up.railway.app/api/health
   curl -s -o /dev/null -w "%{http_code}" https://app.cutx.ai
   ```

## Deployment URLs
- Frontend: https://app.cutx.ai
- Backend API: https://cutxplateform-production.up.railway.app
