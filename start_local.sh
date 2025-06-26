#!/bin/bash

# Start local development servers

echo "Starting Pawscribed Local Development..."
echo "======================================="

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python -m venv venv
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\nShutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup EXIT INT TERM

# Start backend
echo -e "\nStarting backend server..."
(
    source venv/bin/activate
    pip install -r requirements.txt --quiet
    export DATABASE_URL="sqlite:///./pawscribed_dev.db"
    export ALLOWED_ORIGINS="http://localhost:3000"
    export JWT_SECRET_KEY="local-dev-secret-key"
    export ENVIRONMENT="development"
    
    # Run migrations
    python migrate_database.py
    
    # Start server
    uvicorn main:app --reload --port 8000
) &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend
echo -e "\nStarting frontend server..."
(
    export NEXT_PUBLIC_API_URL="http://localhost:8000"
    npm install --silent
    npm run dev
) &
FRONTEND_PID=$!

echo -e "\n======================================="
echo "Local development servers started!"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo -e "\nPress Ctrl+C to stop all servers"
echo "======================================="

# Wait for user to stop
wait