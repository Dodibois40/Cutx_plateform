# Test CutX API Endpoints

Test the API endpoints to verify they work correctly.

## Instructions

Test each endpoint and report results:

### Health & Public Endpoints
```bash
# Health check
curl -s https://cutxplateform-production.up.railway.app/api/health

# Catalogues
curl -s https://cutxplateform-production.up.railway.app/api/catalogues | head -100

# Search panels
curl -s "https://cutxplateform-production.up.railway.app/api/catalogues/search?q=chene"
```

### Import Endpoint (SketchUp)
```bash
# Create import session
curl -X POST https://cutxplateform-production.up.railway.app/api/cutx/import \
  -H "Content-Type: application/json" \
  -d '{"panneaux":[{"entityId":1,"reference":"Test","longueur":800,"largeur":600,"epaisseur":19}],"projetNom":"Test API"}'

# Get import session (use returned importId)
curl -s https://cutxplateform-production.up.railway.app/api/cutx/import/{importId}
```

## Expected Results
- 200 OK for GET endpoints
- 201 Created for POST /import
- JSON responses with correct structure
