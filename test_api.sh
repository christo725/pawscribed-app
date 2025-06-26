#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="https://pawscribed-app.onrender.com"
ORIGIN="https://pawscribed-app.vercel.app"

echo "=== Pawscribed API Test Suite ==="
echo ""

# 1. Test unauthenticated endpoints
echo -e "${YELLOW}Testing unauthenticated endpoints...${NC}"

echo -n "GET /health: "
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ $RESPONSE${NC}"
else
    echo -e "${RED}✗ $RESPONSE${NC}"
fi

# 2. Login to get token
echo ""
echo -e "${YELLOW}Testing authentication...${NC}"

echo -n "POST /auth/login: "
LOGIN_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"testpass123"}' \
    "$API_URL/auth/login")
HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -c 4)
if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
    echo -e "${GREEN}✓ 200${NC}"
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
else
    echo -e "${RED}✗ Failed${NC}"
    echo "$LOGIN_RESPONSE"
    exit 1
fi

# 3. Test authenticated endpoints
echo ""
echo -e "${YELLOW}Testing authenticated endpoints...${NC}"

test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected=$4
    
    echo -n "$method $endpoint: "
    
    if [ -z "$data" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Origin: $ORIGIN" \
            "$API_URL$endpoint")
    else
        RESPONSE=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Origin: $ORIGIN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_URL$endpoint")
    fi
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    
    if [ "$HTTP_CODE" = "$expected" ]; then
        echo -e "${GREEN}✓ $HTTP_CODE${NC}"
    else
        echo -e "${RED}✗ $HTTP_CODE (expected $expected)${NC}"
        echo "Response: $BODY"
    fi
}

# Auth endpoints
test_endpoint "GET" "/auth/me" "" "200"

# Workflow endpoints
test_endpoint "GET" "/workflow/stats" "" "200"

# Pets endpoints
test_endpoint "GET" "/pets" "" "200"
test_endpoint "GET" "/pets?search=test" "" "200"

# Owners endpoints
test_endpoint "GET" "/owners" "" "200"

# Notes endpoints
test_endpoint "GET" "/notes" "" "200"
test_endpoint "GET" "/notes?status=draft" "" "200"
test_endpoint "GET" "/notes?status=processing" "" "200"
test_endpoint "GET" "/notes?status=available_for_review" "" "200"
test_endpoint "GET" "/notes?status=ready_to_export" "" "200"
test_endpoint "GET" "/notes?status=exported" "" "200"

# Visits endpoints
test_endpoint "GET" "/visits" "" "200"

# Templates endpoints
test_endpoint "GET" "/templates" "" "200"

# Audio endpoints
test_endpoint "GET" "/audio/files" "" "200"

# Analytics endpoints
test_endpoint "GET" "/analytics/workflow" "" "200"
test_endpoint "GET" "/analytics/performance" "" "200"

# Team endpoints
test_endpoint "GET" "/team/members" "" "200"
test_endpoint "GET" "/team/activity" "" "200"

# Export endpoints
test_endpoint "GET" "/export/history" "" "200"
test_endpoint "GET" "/export/test-email" "" "200"

echo ""
echo -e "${YELLOW}Testing CORS headers...${NC}"

# Test CORS preflight
echo -n "OPTIONS /pets (preflight): "
CORS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS \
    -H "Origin: $ORIGIN" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: Authorization" \
    "$API_URL/pets")
if [ "$CORS_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ $CORS_RESPONSE${NC}"
else
    echo -e "${RED}✗ $CORS_RESPONSE${NC}"
fi

echo ""
echo "=== Test Complete ==="