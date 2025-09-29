import csv
from datetime import datetime
from io import StringIO
from models.transaction import Transaction
from models.database import get_db_connection
from utils.hash_utils import calculate_transaction_hash
import re

def parse_date(date_str):
    """Parse date from various formats"""
    formats = ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y']

    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).date().isoformat()
        except ValueError:
            continue

    raise ValueError(f"Unable to parse date: {date_str}")

def detect_category(label):
    """Auto-detect category based on categorization rules"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT category_id, pattern, priority
        FROM categorization_rules
        ORDER BY priority DESC
    ''')

    rules = cursor.fetchall()
    conn.close()

    for rule in rules:
        pattern = rule['pattern']
        category_id = rule['category_id']

        if re.search(pattern, label.upper()):
            return category_id

    # Return "Non catégorisé" category if no match
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM categories WHERE name = 'Non catégorisé'")
    row = cursor.fetchone()
    conn.close()

    return row['id'] if row else None

def import_csv(file_content):
    """Import transactions from CSV content"""
    results = {
        'imported': 0,
        'duplicates': 0,
        'errors': []
    }

    try:
        csv_data = StringIO(file_content)
        reader = csv.DictReader(csv_data)

        for row_num, row in enumerate(reader, start=2):
            try:
                # Required fields
                if 'date' not in row or 'label' not in row or 'amount' not in row:
                    results['errors'].append(f"Row {row_num}: Missing required fields")
                    continue

                # Parse and validate data
                date = parse_date(row['date'])
                label = row['label'].strip()
                amount = float(row['amount'])

                if not label:
                    results['errors'].append(f"Row {row_num}: Empty label")
                    continue

                # Calculate hash for duplicate detection
                transaction_hash = calculate_transaction_hash(date, label, amount)

                # Check for duplicates
                if Transaction.exists_by_hash(transaction_hash):
                    results['duplicates'] += 1
                    continue

                # Determine category
                category_id = None
                if 'category' in row and row['category']:
                    # Try to find category by name
                    conn = get_db_connection()
                    cursor = conn.cursor()
                    cursor.execute('SELECT id FROM categories WHERE name = ?', (row['category'],))
                    category_row = cursor.fetchone()
                    conn.close()

                    if category_row:
                        category_id = category_row['id']

                # If no category provided or found, auto-detect
                if category_id is None:
                    category_id = detect_category(label)

                # Get notes if provided
                notes = row.get('notes', '').strip() if 'notes' in row else None

                # Create transaction
                Transaction.create(
                    date=date,
                    label=label,
                    amount=amount,
                    category_id=category_id,
                    hash=transaction_hash,
                    notes=notes
                )

                results['imported'] += 1

            except ValueError as e:
                results['errors'].append(f"Row {row_num}: {str(e)}")
            except Exception as e:
                results['errors'].append(f"Row {row_num}: Unexpected error - {str(e)}")

    except Exception as e:
        results['errors'].append(f"File parsing error: {str(e)}")

    return results