# Local Development Guide for Pawscribed

## 1. Initial Setup

### Backend (FastAPI)
```bash
# Create a virtual environment
python -m venv venv

# Activate it
source venv/bin/activate  # On Mac/Linux
# or
venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt

# Create a .env file for local development
cp .env.example .env.local
```

### Frontend (Next.js)
```bash
# Install dependencies
npm install

# Create local environment file
cp .env.local.example .env.local
```

## 2. Environment Configuration

### Backend .env.local
```env
DATABASE_URL=sqlite:///./pawscribed_dev.db
ALLOWED_ORIGINS=http://localhost:3000
GOOGLE_APPLICATION_CREDENTIALS_JSON=your_base64_encoded_json
JWT_SECRET_KEY=your-local-secret-key
ENVIRONMENT=development
```

### Frontend .env.local
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 3. Running Locally

### Start Backend (Terminal 1)
```bash
# Activate virtual environment
source venv/bin/activate

# Run with hot reload
uvicorn main:app --reload --port 8000
```

### Start Frontend (Terminal 2)
```bash
# Run development server
npm run dev
```

### View the app
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 4. Development Workflow

### Best Practices:

1. **Branch Strategy**
   ```bash
   # Create feature branch
   git checkout -b feature/your-feature-name
   
   # Make changes and test locally
   # Commit frequently
   git add .
   git commit -m "feat: add new feature"
   
   # Push to GitHub
   git push origin feature/your-feature-name
   
   # Create Pull Request to main
   ```

2. **Testing Cycle**
   - Make changes locally
   - Test in browser at localhost:3000
   - Run API tests: `./test_api.sh` (modify URL to localhost)
   - Fix any issues
   - Only deploy when feature is complete

3. **Database Management**
   ```bash
   # Run migrations locally
   python migrate_database.py
   
   # Reset local database if needed
   rm pawscribed_dev.db
   python migrate_database.py
   ```

## 5. Testing

### Local API Testing
```bash
# Modify test_api.sh to use local URL
API_URL="http://localhost:8000"  # Instead of production URL

# Run tests
./test_api.sh
```

### Frontend Testing
```bash
# Run Next.js type checking
npm run type-check

# Run linting
npm run lint

# Build test
npm run build
```

## 6. Debugging Tips

### Backend Debugging
- FastAPI auto-reloads on file changes
- Check terminal for error messages
- Use `print()` or `logger.debug()` for debugging
- Access interactive API docs at http://localhost:8000/docs

### Frontend Debugging
- Use Chrome DevTools
- Check Console for errors
- Network tab to inspect API calls
- React Developer Tools extension

### Common Issues:
1. **CORS errors locally**: Make sure `ALLOWED_ORIGINS` includes `http://localhost:3000`
2. **Database errors**: Reset local SQLite database
3. **Module not found**: Reinstall dependencies
4. **Port already in use**: Kill existing processes or use different ports

## 7. Deployment Process

### After Local Testing:
```bash
# 1. Ensure all changes committed
git status

# 2. Push to GitHub
git push origin main

# 3. Automatic deployments:
# - Vercel: Deploys automatically on push
# - Render: Deploys automatically on push

# 4. Monitor deployments:
# - Check Vercel dashboard
# - Check Render dashboard
# - Test production endpoints
```

## 8. Environment-Specific Code

### Handle differences between local and production:
```python
# In Python
import os
IS_PRODUCTION = os.getenv("ENVIRONMENT") == "production"

if IS_PRODUCTION:
    # Production-specific code
else:
    # Development-specific code
```

```typescript
// In TypeScript
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
```

## 9. Quick Commands

```bash
# Start everything locally
./start_local.sh

# Run all tests
./run_tests.sh

# Deploy to production
./deploy.sh
```

## 10. VS Code Setup

### Recommended Extensions:
- Python
- Pylance
- ESLint
- Prettier
- Thunder Client (API testing)

### Launch Configuration (.vscode/launch.json):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": ["main:app", "--reload"],
      "jinja": true
    }
  ]
}
```

## Summary

1. **Always develop locally first**
2. **Test thoroughly before deploying**
3. **Use feature branches**
4. **Deploy only stable, tested code**
5. **Monitor production after deployment**

This approach will save you hours of waiting for deployments and make development much more efficient!