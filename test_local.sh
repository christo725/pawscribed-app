#!/bin/bash

# Test script for local development
# Run this after starting local servers with ./start_local.sh

API_URL="http://localhost:8000"
ORIGIN="http://localhost:3000"

echo "=== Local API Test Suite ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Test health endpoint
echo -n "Testing health endpoint: "
HEALTH=$(curl -s "$API_URL/health")
if echo "$HEALTH" | grep -q "healthy"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "Backend might not be running. Start with: ./start_local.sh"
    exit 1
fi

# Test frontend
echo -n "Testing frontend: "
FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000")
if [ "$FRONTEND" = "200" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "Frontend might not be running. Start with: ./start_local.sh"
fi

echo ""
echo "Local servers are running!"
echo "You can now:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Make code changes - they'll auto-reload"
echo "3. Test API directly at http://localhost:8000/docs"