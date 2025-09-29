#!/bin/bash

# Test script for category endpoints
BASE_URL="http://localhost:5000/api"

echo "=== Testing Category Endpoints ==="
echo

# Test GET all categories
echo "1. GET /categories"
curl -s -X GET "$BASE_URL/categories" | jq '.'
echo
echo "---"

# Test CREATE category
echo "2. POST /categories (Create)"
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Category",
    "color": "#ff6b6b",
    "icon": "test-icon"
  }' \
  "$BASE_URL/categories")

echo "$RESPONSE" | jq '.'
CATEGORY_ID=$(echo "$RESPONSE" | jq -r '.data.id')
echo "Created category ID: $CATEGORY_ID"
echo
echo "---"

# Test GET single category
echo "3. GET /categories/{id}"
curl -s -X GET "$BASE_URL/categories/$CATEGORY_ID" | jq '.'
echo
echo "---"

# Test UPDATE category
echo "4. PUT /categories/{id} (Update)"
curl -s -X PUT \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Test Category",
    "color": "#4ecdc4"
  }' \
  "$BASE_URL/categories/$CATEGORY_ID" | jq '.'
echo
echo "---"

# Test CREATE categorization rule
echo "5. POST /categories/rules (Create rule)"
RULE_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "pattern": "TEST|EXEMPLE",
    "category_id": '${CATEGORY_ID}',
    "priority": 5
  }' \
  "$BASE_URL/categories/rules")

echo "$RULE_RESPONSE" | jq '.'
RULE_ID=$(echo "$RULE_RESPONSE" | jq -r '.data.id')
echo "Created rule ID: $RULE_ID"
echo
echo "---"

# Test GET all categorization rules
echo "6. GET /categories/rules"
curl -s -X GET "$BASE_URL/categories/rules" | jq '.'
echo
echo "---"

# Test CREATE duplicate category (should fail)
echo "7. POST /categories (Duplicate name - should fail)"
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Test Category",
    "color": "#ff0000"
  }' \
  "$BASE_URL/categories" | jq '.'
echo
echo "---"

# Test DELETE categorization rule
echo "8. DELETE /categories/rules/{id}"
curl -s -X DELETE "$BASE_URL/categories/rules/$RULE_ID" | jq '.'
echo
echo "---"

# Test DELETE category (should work since no transactions)
echo "9. DELETE /categories/{id}"
curl -s -X DELETE "$BASE_URL/categories/$CATEGORY_ID" | jq '.'
echo
echo "---"

# Test GET after deletion
echo "10. GET /categories/{id} after deletion (should fail)"
curl -s -X GET "$BASE_URL/categories/$CATEGORY_ID" | jq '.'
echo
echo "---"

# Test DELETE category with transactions (should fail)
echo "11. DELETE /categories/1 (should fail - has transactions)"
curl -s -X DELETE "$BASE_URL/categories/1" | jq '.'
echo

echo "=== Category Tests Completed ==="