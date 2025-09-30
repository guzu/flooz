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

def detect_bank_format(file_content):
    """Detect bank format based on CSV structure"""
    first_line = file_content.split('\n')[0].strip()
    logger.info(f"Detecting bank format. First line: '{first_line[:100]}...'")

    # Check for Boursorama format (has specific headers)
    if 'dateOp' in first_line and 'dateVal' in first_line:
        logger.info("Detected format: BOURSORAMA")
        return 'boursorama'

    # Check for Banque Populaire format (semicolon, no standard headers, starts with date)
    if ';' in first_line and not any(header in first_line.lower() for header in ['date', 'label', 'amount']):
        first_field = first_line.split(';')[0]
        try:
            parse_date(first_field)
            logger.info("Detected format: BANQUE_POPULAIRE")
            return 'banque_populaire'
        except:
            pass

    # Default to standard CSV
    logger.info("Detected format: STANDARD")
    return 'standard'

def parse_boursorama_line(line):
    """Parse a line from Boursorama CSV format"""
    # Boursorama uses semicolon separator with quoted fields
    # Format: dateOp;dateVal;label;category;categoryParent;supplierFound;amount;comment;accountNum;accountLabel;accountbalance
    fields = []
    current_field = ""
    in_quotes = False

    for char in line:
        if char == '"':
            in_quotes = not in_quotes
        elif char == ';' and not in_quotes:
            fields.append(current_field)
            current_field = ""
        else:
            current_field += char
    fields.append(current_field)  # Add last field

    logger.debug(f"Parsing Boursorama line with {len(fields)} fields")

    if len(fields) < 7:
        raise ValueError(f"Invalid Boursorama format: only {len(fields)} fields, expected at least 7")

    # Extract fields
    date = fields[0].strip()  # dateOp
    label = fields[2].strip()  # label
    amount_str = fields[6].strip()  # amount

    logger.debug(f"Extracted: date='{date}', label='{label}', amount='{amount_str}'")

    # Parse amount (format: "-4,45" or "-1 288,00")
    amount_str = amount_str.replace(' ', '').replace(',', '.')
    amount = float(amount_str)

    # Boursorama uses negative for expenses, positive for income
    # We need to invert: positive = expense, negative = income
    amount = -amount

    return {
        'date': date,
        'label': label,
        'amount': amount
    }

def parse_banque_populaire_line(line):
    """Parse a line from Banque Populaire CSV format"""
    fields = line.split(';')
    logger.debug(f"Parsing Banque Populaire line with {len(fields)} fields")

    if len(fields) < 11:
        raise ValueError(f"Invalid Banque Populaire format: only {len(fields)} fields, expected at least 11")

    # Extract fields based on position
    date = fields[0].strip()
    beneficiary = fields[1].strip()
    full_label = fields[2].strip()
    debit_amount_str = fields[8].strip()  # Dépenses (négatif)
    credit_amount_str = fields[9].strip()  # Crédit (positif)

    logger.debug(f"Extracted: date='{date}', beneficiary='{beneficiary}', debit='{debit_amount_str}', credit='{credit_amount_str}'")

    # Use beneficiary + full_label as transaction label
    label = f"{beneficiary} - {full_label}" if beneficiary != full_label else full_label

    # Determine amount
    if credit_amount_str and credit_amount_str != '':
        # Credit (incoming money) - store as negative to indicate income
        amount = float(credit_amount_str.replace(',', '.'))
        amount = -amount
        logger.debug(f"Credit transaction: {amount} (income)")
    elif debit_amount_str and debit_amount_str != '':
        # Debit (outgoing money) - positive for expenses
        amount = float(debit_amount_str.replace(',', '.'))
        if amount < 0:
            amount = abs(amount)
        logger.debug(f"Debit transaction: {amount} (expense)")
    else:
        raise ValueError("No amount found in debit or credit columns")

    return {
        'date': date,
        'label': label,
        'amount': amount
    }

def import_csv(file_content, bank_type='auto'):
    """Import transactions from CSV content

    Args:
        file_content: CSV file content as string
        bank_type: 'auto', 'boursorama', 'banque_populaire', or 'standard'
    """
    logger.info(f"Starting CSV import with bank_type='{bank_type}'")

    results = {
        'imported': 0,
        'duplicates': 0,
        'errors': [],
        'format': None
    }

    try:
        # Detect or use specified format
        if bank_type == 'auto':
            csv_format = detect_bank_format(file_content)
        else:
            csv_format = bank_type

        results['format'] = csv_format
        logger.info(f"Using CSV format: {csv_format}")

        # Process based on format
        if csv_format in ['boursorama', 'banque_populaire']:
            lines = [line.strip() for line in file_content.split('\n') if line.strip()]
            logger.info(f"Processing {csv_format} format with {len(lines)} total lines")

            # Skip header line
            if lines:
                lines = lines[1:]
                logger.info(f"Skipped header, processing {len(lines)} data lines")

            # Choose parser
            if csv_format == 'boursorama':
                parser = parse_boursorama_line
            else:
                parser = parse_banque_populaire_line

            for row_num, line in enumerate(lines, start=2):
                logger.debug(f"Processing line {row_num}")
                try:
                    # Parse line
                    data = parser(line)

                    # Validate
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

                    # Auto-detect category
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
                try:
                    # Required fields
                    if 'date' not in row or 'label' not in row or 'amount' not in row:
                        results['errors'].append(f"Row {row_num}: Missing required fields")
                        continue

                    # Parse and validate
                    date = parse_date(row['date'])
                    label = row['label'].strip()
                    amount = float(row['amount'])

                    if not label:
                        results['errors'].append(f"Row {row_num}: Empty label")
                        continue

                    # Calculate hash
                    transaction_hash = calculate_transaction_hash(date, label, amount)

                    # Check duplicates
                    if Transaction.exists_by_hash(transaction_hash):
                        results['duplicates'] += 1
                        continue

                    # Determine category
                    category_id = None
                    if 'category' in row and row['category']:
                        conn = get_db_connection()
                        cursor = conn.cursor()
                        cursor.execute('SELECT id FROM categories WHERE name = ?', (row['category'],))
                        category_row = cursor.fetchone()
                        conn.close()

                        if category_row:
                            category_id = category_row['id']

                    if category_id is None:
                        category_id = detect_category(label)

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
                    logger.warning(f"ValueError on row {row_num}: {str(e)}")
                    results['errors'].append(f"Row {row_num}: {str(e)}")
                except Exception as e:
                    logger.error(f"Unexpected error on row {row_num}: {str(e)}")
                    results['errors'].append(f"Row {row_num}: Unexpected error - {str(e)}")

    except Exception as e:
        logger.error(f"File parsing error: {str(e)}")
        results['errors'].append(f"File parsing error: {str(e)}")

    logger.info(f"CSV import completed: {results['imported']} imported, {results['duplicates']} duplicates, {len(results['errors'])} errors")

    return results