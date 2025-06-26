# Development Workflow Best Practices

## Quick Start
```bash
# 1. Start local development
./start_local.sh

# 2. In another terminal, test it's working
./test_local.sh

# 3. Open browser to http://localhost:3000
```

## Typical Bug Fix Workflow

### 1. Reproduce the Bug Locally
```bash
# Start local servers
./start_local.sh

# Login with test account
# Email: test@example.com
# Password: testpass123

# Reproduce the issue
```

### 2. Create a Feature Branch
```bash
git checkout -b fix/description-of-bug
```

### 3. Make Your Changes

**Backend Changes (Python):**
- Edit files in the root directory
- FastAPI will auto-reload
- Check terminal for errors
- Test at http://localhost:8000/docs

**Frontend Changes (Next.js):**
- Edit files in components/, pages/, lib/
- Next.js will auto-reload
- Check browser console for errors
- Use React DevTools

### 4. Test Your Fix
```bash
# Run the test suite locally
API_URL="http://localhost:8000" ./test_api.sh

# Test in browser
# - Check the specific bug is fixed
# - Test related functionality
# - Check for regressions
```

### 5. Commit Your Changes
```bash
# Check what changed
git status
git diff

# Add and commit
git add .
git commit -m "fix: description of what was fixed

- Detail 1
- Detail 2

Fixes #issue-number"
```

### 6. Deploy to Production
```bash
# Push to GitHub
git push origin fix/description-of-bug

# Option 1: Direct to main (for small fixes)
git checkout main
git merge fix/description-of-bug
git push origin main

# Option 2: Pull Request (for larger changes)
# Create PR on GitHub and merge
```

### 7. Verify in Production
- Wait for Vercel and Render to deploy
- Test at https://pawscribed-app.vercel.app
- Monitor for errors

## Common Development Scenarios

### Adding a New Feature
1. Plan the feature (database, API, UI)
2. Create feature branch
3. Add database models if needed
4. Create API endpoints
5. Build UI components
6. Test everything locally
7. Deploy when complete

### Debugging Production Issues
1. Check Render logs for backend errors
2. Check Vercel logs for frontend errors
3. Reproduce locally if possible
4. Add logging to identify issue
5. Fix and test locally
6. Deploy fix

### Database Changes
```bash
# Local database migrations
python migrate_database.py

# Reset local database
rm pawscribed_dev.db
python migrate_database.py

# Production: Add migration to startup.sh
```

### API Changes
1. Update endpoint in main.py
2. Test at http://localhost:8000/docs
3. Update frontend API client in lib/api.ts
4. Test integration locally

## Tips for Faster Development

### 1. Use Hot Reload
- Backend: `uvicorn main:app --reload`
- Frontend: `npm run dev`
- Changes apply instantly!

### 2. Browser Tools
- Keep DevTools open
- Monitor Network tab
- Check Console for errors
- Use React Developer Tools

### 3. VS Code Setup
```json
// .vscode/settings.json
{
  "python.linting.enabled": true,
  "python.formatting.provider": "black",
  "editor.formatOnSave": true,
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### 4. Keyboard Shortcuts
- `Cmd+P`: Quick file open
- `Cmd+Shift+F`: Search across files
- `Cmd+B`: Toggle sidebar
- `F12`: Go to definition

### 5. Testing Shortcuts
```bash
# Quick test specific endpoint
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'

# Test with saved token
TOKEN="your-token-here"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/pets
```

## Debugging Checklist

### Frontend Not Loading?
- [ ] Is npm install complete?
- [ ] Is port 3000 free?
- [ ] Check .env.local exists
- [ ] Check console for errors

### API Errors?
- [ ] Is backend running?
- [ ] Check terminal for Python errors
- [ ] Verify DATABASE_URL is set
- [ ] Check CORS settings

### Can't Login?
- [ ] Database migrated?
- [ ] User exists in database?
- [ ] JWT_SECRET_KEY set?
- [ ] Cookies enabled?

### Changes Not Appearing?
- [ ] Saved the file?
- [ ] Correct branch?
- [ ] Browser cache cleared?
- [ ] Server restarted?

## Production Deployment Checklist

Before deploying:
- [ ] All tests passing locally
- [ ] No console.log() statements
- [ ] Error handling in place
- [ ] Environment variables updated
- [ ] Database migrations included
- [ ] API documentation updated
- [ ] Tested on multiple browsers

## Summary

1. **Always develop locally** - It's 100x faster
2. **Test thoroughly** before deploying
3. **Use branches** for features/fixes
4. **Monitor production** after deployment
5. **Keep dependencies updated**

The key is: Make it work locally first, then deploy with confidence!