#!/bin/bash

# Test script for import endpoints
BASE_URL="http://localhost:5000/api"
TEST_DIR="test/data"

echo "=== Testing Import Endpoints ==="
echo

# Test CSV preview
echo "1. POST /import/preview"
curl -s -X POST \
  -F "file=@$TEST_DIR/test_import.csv" \
  "$BASE_URL/import/preview" | jq '.'
echo
echo "---"

# Test CSV import
echo "2. POST /import/csv (Valid CSV)"
curl -s -X POST \
  -F "file=@$TEST_DIR/test_import.csv" \
  "$BASE_URL/import/csv" | jq '.'
echo
echo "---"

# Test CSV import with same file (should show duplicates)
echo "3. POST /import/csv (Same file - should show duplicates)"
curl -s -X POST \
  -F "file=@$TEST_DIR/test_import.csv" \
  "$BASE_URL/import/csv" | jq '.'
echo
echo "---"

# Test CSV import with invalid data
echo "4. POST /import/csv (Invalid CSV data)"
curl -s -X POST \
  -F "file=@$TEST_DIR/test_import_invalid.csv" \
  "$BASE_URL/import/csv" | jq '.'
echo
echo "---"

# Test preview with invalid CSV
echo "5. POST /import/preview (Invalid CSV)"
curl -s -X POST \
  -F "file=@$TEST_DIR/test_import_invalid.csv" \
  "$BASE_URL/import/preview" | jq '.'
echo
echo "---"

# Test import without file
echo "6. POST /import/csv (No file)"
curl -s -X POST "$BASE_URL/import/csv" | jq '.'
echo
echo "---"

# Test import with wrong file type
echo "7. POST /import/csv (Wrong file type)"
echo "This is not a CSV file" > /tmp/test.txt
curl -s -X POST \
  -F "file=@/tmp/test.txt" \
  "$BASE_URL/import/csv" | jq '.'
rm /tmp/test.txt
echo
echo "---"

# Test preview without file
echo "8. POST /import/preview (No file)"
curl -s -X POST "$BASE_URL/import/preview" | jq '.'
echo

echo "=== Import Tests Completed ==="