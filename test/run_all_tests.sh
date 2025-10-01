#!/bin/bash

# Main test runner script
echo "=========================================="
echo "    Flooz API Test Suite"
echo "=========================================="
echo

# Check if server is running
echo "Checking if server is running..."
if ! curl -s http://localhost:5000/api/categories > /dev/null 2>&1; then
    echo "❌ ERROR: Server is not running on http://localhost:5000"
    echo "Please start the server with:"
    echo "  cd backend"
    echo "  source venv/bin/activate"
    echo "  python app.py"
    exit 1
fi

echo "✅ Server is running"
echo

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "⚠️  WARNING: jq is not installed. JSON output will not be formatted."
    echo "Install jq with: sudo apt install jq"
    echo
fi

# Make test scripts executable
chmod +x test/test_transactions.sh
chmod +x test/test_categories.sh
chmod +x test/test_import.sh
chmod +x test/test_stats.sh

# Run each test suite
echo "🧪 Running Transaction Tests..."
./test/test_transactions.sh
echo
echo

echo "🧪 Running Category Tests..."
./test/test_categories.sh
echo
echo

echo "🧪 Running Import Tests..."
./test/test_import.sh
echo
echo

echo "🧪 Running Stats Tests..."
./test/test_stats.sh
echo
echo

echo "=========================================="
echo "✅ All tests completed!"
echo "=========================================="
echo
echo "📊 Test Summary:"
echo "- Transaction endpoints: CRUD operations, filtering, duplicates"
echo "- Category endpoints: CRUD operations, rules management"
echo "- Import endpoints: CSV upload, preview, validation, error handling"
echo "- Stats endpoints: Monthly, category, and year summary statistics"
echo
echo "Check the output above for any errors or failures."
echo "All endpoints should return JSON responses with 'success': true"