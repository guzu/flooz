#!/usr/bin/env python3
"""
Test script for subcategories functionality
"""
import requests
import json
import sys

BASE_URL = "http://localhost:5000/api"

def test_api_endpoint(method, endpoint, data=None, expected_status=200):
    """Test an API endpoint"""
    url = f"{BASE_URL}{endpoint}"
    print(f"\n🔍 Testing {method} {endpoint}")

    try:
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            response = requests.post(url, json=data)
        elif method == "PUT":
            response = requests.put(url, json=data)
        else:
            print(f"❌ Unsupported method: {method}")
            return False

        print(f"Status: {response.status_code}")

        if response.status_code == expected_status:
            print(f"✅ SUCCESS - Expected status {expected_status}")

            # Show response data if it's JSON
            try:
                response_data = response.json()
                if 'data' in response_data:
                    data_count = len(response_data['data']) if isinstance(response_data['data'], list) else 1
                    print(f"📊 Response contains {data_count} item(s)")
                return True
            except:
                print("📝 Response is not JSON")
                return True
        else:
            print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error: {error_data.get('error', 'Unknown error')}")
            except:
                print(f"Response: {response.text[:200]}")
            return False

    except requests.ConnectionError:
        print("❌ FAILED - Could not connect to server. Is it running?")
        return False
    except Exception as e:
        print(f"❌ FAILED - Exception: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing Budget Manager API with Subcategories")
    print("=" * 50)

    tests_passed = 0
    total_tests = 0

    # Test cases
    test_cases = [
        # Basic endpoints
        ("GET", "/categories", None, 200),
        ("GET", "/subcategories", None, 200),
        ("GET", "/transactions", None, 200),
        ("GET", "/transactions?year=2025", None, 200),
        ("GET", "/stats/years", None, 200),

        # Subcategories by category
        ("GET", "/categories/1/subcategories", None, 200),
        ("GET", "/categories/2/subcategories", None, 200),
        ("GET", "/categories/3/subcategories", None, 200),

        # Test creating a transaction with subcategory
        ("POST", "/transactions", {
            "date": "2025-09-29",
            "label": "Test transaction with subcategory",
            "amount": 15.50,
            "category_id": 1,
            "subcategory_id": 1,
            "notes": "Test subcategory functionality"
        }, 201),
    ]

    for method, endpoint, data, expected_status in test_cases:
        total_tests += 1
        if test_api_endpoint(method, endpoint, data, expected_status):
            tests_passed += 1

    print("\n" + "=" * 50)
    print(f"🏁 Test Results: {tests_passed}/{total_tests} passed")

    if tests_passed == total_tests:
        print("🎉 ALL TESTS PASSED!")
        return 0
    else:
        print("💥 SOME TESTS FAILED!")
        return 1

if __name__ == "__main__":
    sys.exit(main())