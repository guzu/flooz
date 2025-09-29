#!/bin/bash

# Test script for transaction endpoints
BASE_URL="http://localhost:5000/api"

echo "=== Testing Transaction Endpoints ==="
echo

# Test GET all transactions
echo "1. GET /transactions"
curl -s -X GET "$BASE_URL/transactions" | jq '.'
echo
echo "---"

# Test CREATE transaction
echo "2. POST /transactions (Create)"
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-01-20",
    "label": "Supermarché Test",
    "amount": 45.90,
    "category_id": 1,
    "notes": "Courses hebdomadaires"
  }' \
  "$BASE_URL/transactions")

echo "$RESPONSE" | jq '.'
TRANSACTION_ID=$(echo "$RESPONSE" | jq -r '.data.id')
echo "Created transaction ID: $TRANSACTION_ID"
echo
echo "---"

# Test GET single transaction
echo "3. GET /transactions/{id}"
curl -s -X GET "$BASE_URL/transactions/$TRANSACTION_ID" | jq '.'
echo
echo "---"

# Test UPDATE transaction
echo "4. PUT /transactions/{id} (Update)"
curl -s -X PUT \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 48.50,
    "notes": "Courses hebdomadaires - corrigé"
  }' \
  "$BASE_URL/transactions/$TRANSACTION_ID" | jq '.'
echo
echo "---"

# Test GET with year filter
echo "5. GET /transactions?year=2025"
curl -s -X GET "$BASE_URL/transactions?year=2025" | jq '.'
echo
echo "---"

# Test CREATE duplicate (should fail)
echo "6. POST /transactions (Duplicate - should fail)"
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-01-20",
    "label": "Supermarché Test",
    "amount": 45.90
  }' \
  "$BASE_URL/transactions" | jq '.'
echo
echo "---"

# Test DELETE transaction
echo "7. DELETE /transactions/{id}"
curl -s -X DELETE "$BASE_URL/transactions/$TRANSACTION_ID" | jq '.'
echo
echo "---"

# Test GET after deletion
echo "8. GET /transactions/{id} after deletion (should fail)"
curl -s -X GET "$BASE_URL/transactions/$TRANSACTION_ID" | jq '.'
echo

echo "=== Transaction Tests Completed ==="