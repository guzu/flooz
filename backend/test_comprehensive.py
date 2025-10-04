#!/usr/bin/env python3
"""
Comprehensive test suite for Flooz API
Tests new features: QIF import, CSV exports, notes, duplicate detection
"""
import requests
import json
import sys
import os
import io

BASE_URL = "http://localhost:5000/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    YELLOW = '\033[93m'
    RESET = '\033[0m'

def test_api_endpoint(method, endpoint, data=None, files=None, expected_status=200, description=""):
    """Test an API endpoint"""
    url = f"{BASE_URL}{endpoint}"
    print(f"\n{Colors.BLUE}🔍 {description or f'{method} {endpoint}'}{Colors.RESET}")

    try:
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            if files:
                response = requests.post(url, files=files, data=data)
            else:
                response = requests.post(url, json=data)
        elif method == "PUT":
            response = requests.put(url, json=data)
        elif method == "DELETE":
            response = requests.delete(url)
        else:
            print(f"{Colors.RED}❌ Unsupported method: {method}{Colors.RESET}")
            return False, None

        print(f"Status: {response.status_code}")

        if response.status_code == expected_status:
            print(f"{Colors.GREEN}✅ SUCCESS - Expected status {expected_status}{Colors.RESET}")

            # Show response data if it's JSON
            try:
                response_data = response.json()
                if 'data' in response_data:
                    data_count = len(response_data['data']) if isinstance(response_data['data'], list) else 1
                    print(f"📊 Response contains {data_count} item(s)")
                return True, response_data
            except:
                # Non-JSON response (like CSV or binary)
                print(f"📝 Response is non-JSON ({response.headers.get('content-type', 'unknown')})")
                return True, response
        else:
            print(f"{Colors.RED}❌ FAILED - Expected {expected_status}, got {response.status_code}{Colors.RESET}")
            try:
                error_data = response.json()
                print(f"Error: {error_data.get('error', 'Unknown error')}")
            except:
                print(f"Response: {response.text[:200]}")
            return False, None

    except requests.ConnectionError:
        print(f"{Colors.RED}❌ FAILED - Could not connect to server. Is it running?{Colors.RESET}")
        return False, None
    except Exception as e:
        print(f"{Colors.RED}❌ FAILED - Exception: {str(e)}{Colors.RESET}")
        return False, None

def test_qif_import():
    """Test QIF import validation and import"""
    print(f"\n{Colors.YELLOW}{'='*60}\n🧪 Testing QIF Import\n{'='*60}{Colors.RESET}")

    # Create a sample QIF file
    qif_content = """!Type:Bank
D01/15/2025
T-45.30
PCARREFOUR SUPERMARKET
MCourses hebdomadaires
^
D01/16/2025
T-75.20
PRATP NAVIGO MENSUEL
MTransport mensuel
^
D01/17/2025
T2500.00
PSALAIRE JANVIER
MVirement salaire
^
"""

    # Test QIF validation
    qif_file = io.BytesIO(qif_content.encode('utf-8'))
    files = {'file': ('test.qif', qif_file, 'text/plain')}

    success, response_data = test_api_endpoint(
        "POST",
        "/import/validate-qif",
        files=files,
        expected_status=200,
        description="Validate QIF file"
    )

    if not success:
        return 0, 1

    # Check validation response
    tests_passed = 1
    total_tests = 1

    if response_data and 'data' in response_data:
        transactions = response_data['data'].get('transactions', [])
        print(f"{Colors.GREEN}✓ Validated {len(transactions)} transactions{Colors.RESET}")

        # Test that amounts are correctly inverted
        if len(transactions) > 0:
            total_tests += 1
            first_txn = transactions[0]
            if first_txn['amount'] == 45.30:  # Should be positive (expense)
                print(f"{Colors.GREEN}✓ Amount correctly inverted (45.30){Colors.RESET}")
                tests_passed += 1
            else:
                print(f"{Colors.RED}✗ Amount not inverted correctly: {first_txn['amount']}{Colors.RESET}")

        # Test import validated transactions
        total_tests += 1
        import_data = {'transactions': transactions}
        success, import_response = test_api_endpoint(
            "POST",
            "/import/validated",
            data=import_data,
            expected_status=200,
            description="Import validated QIF transactions"
        )

        if success and import_response and 'data' in import_response:
            imported = import_response['data'].get('imported', 0)
            duplicates = import_response['data'].get('duplicates', 0)
            print(f"{Colors.GREEN}✓ Imported {imported} transactions, {duplicates} duplicates{Colors.RESET}")
            tests_passed += 1

    return tests_passed, total_tests

def test_csv_exports():
    """Test CSV export endpoints"""
    print(f"\n{Colors.YELLOW}{'='*60}\n🧪 Testing CSV Exports\n{'='*60}{Colors.RESET}")

    tests_passed = 0
    total_tests = 0

    # Test transactions CSV export
    total_tests += 1
    success, response = test_api_endpoint(
        "GET",
        "/export/csv/transactions",
        expected_status=200,
        description="Export all transactions to CSV"
    )

    if success and response:
        if 'text/csv' in response.headers.get('content-type', ''):
            print(f"{Colors.GREEN}✓ CSV export has correct content-type{Colors.RESET}")
            tests_passed += 1

            # Check CSV content
            csv_content = response.text
            if 'Date' in csv_content and 'Libellé' in csv_content:
                print(f"{Colors.GREEN}✓ CSV contains headers{Colors.RESET}")

            lines = csv_content.strip().split('\n')
            print(f"📊 CSV contains {len(lines)-1} transaction(s)")

    # Test categories CSV export
    total_tests += 1
    success, response = test_api_endpoint(
        "GET",
        "/export/csv/categories",
        expected_status=200,
        description="Export consolidated categories to CSV"
    )

    if success and response:
        if 'text/csv' in response.headers.get('content-type', ''):
            print(f"{Colors.GREEN}✓ Categories CSV has correct content-type{Colors.RESET}")
            tests_passed += 1

            csv_content = response.text
            if 'Catégorie' in csv_content and 'Montant total' in csv_content:
                print(f"{Colors.GREEN}✓ Categories CSV contains headers{Colors.RESET}")

    return tests_passed, total_tests

def test_notes_field():
    """Test notes field updates including empty notes"""
    print(f"\n{Colors.YELLOW}{'='*60}\n🧪 Testing Notes Field\n{'='*60}{Colors.RESET}")

    tests_passed = 0
    total_tests = 0

    # Create a transaction with notes
    total_tests += 1
    success, response_data = test_api_endpoint(
        "POST",
        "/transactions",
        data={
            "date": "2025-10-04",
            "label": "Test notes transaction",
            "amount": 25.50,
            "category_id": 1,
            "notes": "Initial notes"
        },
        expected_status=201,
        description="Create transaction with notes"
    )

    if success and response_data and 'data' in response_data:
        transaction_id = response_data['data']['id']
        print(f"{Colors.GREEN}✓ Created transaction ID {transaction_id} with notes{Colors.RESET}")
        tests_passed += 1

        # Update notes to empty string
        total_tests += 1
        success, update_response = test_api_endpoint(
            "PUT",
            f"/transactions/{transaction_id}",
            data={"notes": ""},
            expected_status=200,
            description="Update transaction with empty notes"
        )

        if success:
            print(f"{Colors.GREEN}✓ Successfully cleared notes{Colors.RESET}")
            tests_passed += 1

        # Update notes to new value
        total_tests += 1
        success, update_response = test_api_endpoint(
            "PUT",
            f"/transactions/{transaction_id}",
            data={"notes": "Updated notes value"},
            expected_status=200,
            description="Update transaction with new notes"
        )

        if success:
            print(f"{Colors.GREEN}✓ Successfully updated notes{Colors.RESET}")
            tests_passed += 1

        # Clean up - delete test transaction
        test_api_endpoint("DELETE", f"/transactions/{transaction_id}", expected_status=200, description="Clean up test transaction")

    return tests_passed, total_tests

def test_duplicate_detection():
    """Test enhanced duplicate detection"""
    print(f"\n{Colors.YELLOW}{'='*60}\n🧪 Testing Duplicate Detection\n{'='*60}{Colors.RESET}")

    tests_passed = 0
    total_tests = 0

    # Create first transaction
    total_tests += 1
    test_txn = {
        "date": "2025-10-04",
        "label": "DUPLICATE TEST",
        "amount": 99.99,
        "category_id": 1
    }

    success, response_data = test_api_endpoint(
        "POST",
        "/transactions",
        data=test_txn,
        expected_status=201,
        description="Create initial transaction"
    )

    if success and response_data and 'data' in response_data:
        transaction_id = response_data['data']['id']
        print(f"{Colors.GREEN}✓ Created transaction ID {transaction_id}{Colors.RESET}")
        tests_passed += 1

        # Try to create duplicate (should fail with 409)
        total_tests += 1
        success, dup_response = test_api_endpoint(
            "POST",
            "/transactions",
            data=test_txn,
            expected_status=409,
            description="Attempt to create duplicate transaction"
        )

        if success:
            print(f"{Colors.GREEN}✓ Duplicate correctly rejected{Colors.RESET}")
            tests_passed += 1

        # Clean up
        test_api_endpoint("DELETE", f"/transactions/{transaction_id}", expected_status=200, description="Clean up test transaction")

    return tests_passed, total_tests

def test_json_export():
    """Test JSON export endpoint"""
    print(f"\n{Colors.YELLOW}{'='*60}\n🧪 Testing JSON Export\n{'='*60}{Colors.RESET}")

    tests_passed = 0
    total_tests = 1

    success, response_data = test_api_endpoint(
        "GET",
        "/export/json",
        expected_status=200,
        description="Export all data as JSON"
    )

    if success and response_data and 'data' in response_data:
        data = response_data['data']
        required_keys = ['transactions', 'categories', 'subcategories', 'categorization_rules']

        if all(key in data for key in required_keys):
            print(f"{Colors.GREEN}✓ JSON export contains all required data sections{Colors.RESET}")
            print(f"  - {len(data['transactions'])} transactions")
            print(f"  - {len(data['categories'])} categories")
            print(f"  - {len(data['subcategories'])} subcategories")
            print(f"  - {len(data['categorization_rules'])} rules")
            tests_passed += 1

    return tests_passed, total_tests

def main():
    """Run comprehensive test suite"""
    print(f"{Colors.BLUE}{'='*60}")
    print("🧪 Flooz Comprehensive Test Suite")
    print(f"{'='*60}{Colors.RESET}")

    all_tests_passed = 0
    all_total_tests = 0

    # Run test suites
    test_suites = [
        ("QIF Import", test_qif_import),
        ("CSV Exports", test_csv_exports),
        ("Notes Field", test_notes_field),
        ("Duplicate Detection", test_duplicate_detection),
        ("JSON Export", test_json_export),
    ]

    for suite_name, test_func in test_suites:
        passed, total = test_func()
        all_tests_passed += passed
        all_total_tests += total
        print(f"\n{Colors.YELLOW}📊 {suite_name}: {passed}/{total} tests passed{Colors.RESET}")

    # Final results
    print(f"\n{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"🏁 Final Results: {all_tests_passed}/{all_total_tests} tests passed")

    if all_tests_passed == all_total_tests:
        print(f"{Colors.GREEN}🎉 ALL TESTS PASSED!{Colors.RESET}")
        return 0
    else:
        print(f"{Colors.RED}💥 {all_total_tests - all_tests_passed} TEST(S) FAILED!{Colors.RESET}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
