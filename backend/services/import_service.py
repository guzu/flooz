import csv
from datetime import datetime
from io import StringIO
from models.transaction import Transaction
from models.database import get_db_connection
from utils.hash_utils import calculate_transaction_hash
import re
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

def detect_csv_format(file_content):
    """Detect CSV format based on first line"""
    first_line = file_content.split('\n')[0].strip()
    logger.info(f"Detecting CSV format. First line: '{first_line[:100]}...' (truncated)")

    # Check if it's bank format (semicolon separated, no headers, starts with date)
    if ';' in first_line and not any(header in first_line.lower() for header in ['date', 'label', 'amount']):
        # Check if first field looks like a date
        first_field = first_line.split(';')[0]
        try:
            parse_date(first_field)
            logger.info("Detected format: BANK (semicolon separated with date in first field)")
            return 'bank'
        except Exception as e:
            logger.warning(f"First field '{first_field}' is not a date: {e}")
            pass

    logger.info("Detected format: STANDARD (comma separated with headers)")
    return 'standard'

def parse_bank_csv_line(line):
    """Parse a line from bank CSV format"""
    fields = line.split(';')
    logger.debug(f"Parsing bank CSV line with {len(fields)} fields: {fields[:5]}...")

    if len(fields) < 11:
        logger.error(f"Invalid bank CSV format: only {len(fields)} fields, expected at least 11")
        raise ValueError(f"Invalid bank CSV format: only {len(fields)} fields, expected at least 11")

    # Extract fields based on position
    date = fields[0].strip()
    beneficiary = fields[1].strip()
    full_label = fields[2].strip()
    debit_amount_str = fields[8].strip()  # Dépenses (négatif)
    credit_amount_str = fields[9].strip()  # Crédit (positif)

    logger.debug(f"Extracted: date='{date}', beneficiary='{beneficiary}', debit='{debit_amount_str}', credit='{credit_amount_str}'")

    # Use beneficiary + full_label as transaction label
    label = f"{beneficiary} - {full_label}" if beneficiary != full_label else full_label

    # Determine amount and type
    if credit_amount_str and credit_amount_str != '':
        # Credit (incoming money) - positive amount in our system means expense, so we need to handle this
        amount = float(credit_amount_str.replace(',', '.'))
        # For credits, we store as negative to indicate income
        amount = -amount
        logger.debug(f"Credit transaction: {amount} (income)")
    elif debit_amount_str and debit_amount_str != '':
        # Debit (outgoing money) - convert to positive for expenses
        amount = float(debit_amount_str.replace(',', '.'))
        if amount < 0:
            amount = abs(amount)
        logger.debug(f"Debit transaction: {amount} (expense)")
    else:
        logger.error("No amount found in debit or credit columns")
        raise ValueError("No amount found in debit or credit columns")

    return {
        'date': date,
        'label': label,
        'amount': amount
    }

def import_csv(file_content):
    """Import transactions from CSV content"""
    logger.info("Starting CSV import process")

    results = {
        'imported': 0,
        'duplicates': 0,
        'errors': [],
        'format': None
    }

    try:
        # Detect CSV format
        csv_format = detect_csv_format(file_content)
        results['format'] = csv_format
        logger.info(f"CSV format detected: {csv_format}")

        if csv_format == 'bank':
            # Process bank format (first line is header, semicolon separated)
            lines = [line.strip() for line in file_content.split('\n') if line.strip()]
            logger.info(f"Processing bank format CSV with {len(lines)} total lines")

            # Skip first line (header)
            if lines:
                lines = lines[1:]
                logger.info(f"Skipped header, processing {len(lines)} data lines")

            for row_num, line in enumerate(lines, start=2):
                logger.debug(f"Processing line {row_num}: {line[:50]}...")
                try:
                    # Parse bank CSV line
                    data = parse_bank_csv_line(line)

                    # Parse and validate data
                    date = parse_date(data['date'])
                    label = data['label'].strip()
                    amount = data['amount']

                    if not label:
                        results['errors'].append(f"Row {row_num}: Empty label")
                        continue

                    # Calculate hash for duplicate detection
                    transaction_hash = calculate_transaction_hash(date, label, amount)

                    # Check for duplicates
                    if Transaction.exists_by_hash(transaction_hash):
                        results['duplicates'] += 1
                        continue

                    # Auto-detect category based on label
                    category_id = detect_category(label)

                    # Create transaction
                    Transaction.create(
                        date=date,
                        label=label,
                        amount=amount,
                        category_id=category_id,
                        hash=transaction_hash,
                        notes=None
                    )

                    results['imported'] += 1

                except ValueError as e:
                    logger.warning(f"ValueError on line {row_num}: {str(e)}")
                    results['errors'].append(f"Row {row_num}: {str(e)}")
                except Exception as e:
                    logger.error(f"Unexpected error on line {row_num}: {str(e)}")
                    results['errors'].append(f"Row {row_num}: Unexpected error - {str(e)}")

        else:
            # Process standard format (headers, comma separated)
            logger.info("Processing standard format CSV")
            csv_data = StringIO(file_content)
            reader = csv.DictReader(csv_data)
            logger.info(f"CSV headers detected: {reader.fieldnames}")

            for row_num, row in enumerate(reader, start=2):
                logger.debug(f"Processing row {row_num}: {dict(row)}")
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
                    logger.warning(f"ValueError on standard CSV row {row_num}: {str(e)}")
                    results['errors'].append(f"Row {row_num}: {str(e)}")
                except Exception as e:
                    logger.error(f"Unexpected error on standard CSV row {row_num}: {str(e)}")
                    results['errors'].append(f"Row {row_num}: Unexpected error - {str(e)}")

    except Exception as e:
        logger.error(f"File parsing error: {str(e)}")
        results['errors'].append(f"File parsing error: {str(e)}")

    logger.info(f"CSV import completed: {results['imported']} imported, {results['duplicates']} duplicates, {len(results['errors'])} errors")
    if results['errors']:
        logger.warning(f"Import errors: {results['errors']}")

    return results