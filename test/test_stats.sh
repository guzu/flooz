#!/bin/bash

# Test script for stats endpoints
BASE_URL="http://localhost:5000/api"

echo "=== Testing Stats Endpoints ==="
echo

# First, create some test data for stats
echo "Setting up test data..."

# Create transactions for different months
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-01-15",
    "label": "Supermarché Janvier",
    "amount": 120.50,
    "category_id": 1
  }' \
  "$BASE_URL/transactions" > /dev/null

curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-02-10",
    "label": "Transport Février",
    "amount": 75.20,
    "category_id": 2
  }' \
  "$BASE_URL/transactions" > /dev/null

curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-02-15",
    "label": "Supermarché Février",
    "amount": 95.80,
    "category_id": 1
  }' \
  "$BASE_URL/transactions" > /dev/null

curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-12-20",
    "label": "Achat 2024",
    "amount": 50.00,
    "category_id": 5
  }' \
  "$BASE_URL/transactions" > /dev/null

echo "Test data created."
echo
echo "---"

# Test GET available years
echo "1. GET /stats/years"
curl -s -X GET "$BASE_URL/stats/years" | jq '.'
echo
echo "---"

# Test GET monthly stats for 2025
echo "2. GET /stats/monthly/2025"
curl -s -X GET "$BASE_URL/stats/monthly/2025" | jq '.'
echo
echo "---"

# Test GET monthly stats for 2024
echo "3. GET /stats/monthly/2024"
curl -s -X GET "$BASE_URL/stats/monthly/2024" | jq '.'
echo
echo "---"

# Test GET category stats for 2025
echo "4. GET /stats/categories/2025"
curl -s -X GET "$BASE_URL/stats/categories/2025" | jq '.'
echo
echo "---"

# Test GET category stats for 2024
echo "5. GET /stats/categories/2024"
curl -s -X GET "$BASE_URL/stats/categories/2024" | jq '.'
echo
echo "---"

# Test GET year summary for 2025
echo "6. GET /stats/summary/2025"
curl -s -X GET "$BASE_URL/stats/summary/2025" | jq '.'
echo
echo "---"

# Test GET year summary for 2024
echo "7. GET /stats/summary/2024"
curl -s -X GET "$BASE_URL/stats/summary/2024" | jq '.'
echo
echo "---"

# Test stats for year with no data
echo "8. GET /stats/monthly/2020 (No data)"
curl -s -X GET "$BASE_URL/stats/monthly/2020" | jq '.'
echo
echo "---"

echo "9. GET /stats/categories/2020 (No data)"
curl -s -X GET "$BASE_URL/stats/categories/2020" | jq '.'
echo
echo "---"

echo "10. GET /stats/summary/2020 (No data)"
curl -s -X GET "$BASE_URL/stats/summary/2020" | jq '.'
echo

echo "=== Stats Tests Completed ==="