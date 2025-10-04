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
    formats = ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d/%m/%y', '%m/%d/%y']

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
    operation_date = fields[0].strip()  # dateOp (date d'opération)
    value_date = fields[1].strip()  # dateVal (date de valeur/comptabilisation)
    label = fields[2].strip()  # label
    amount_str = fields[6].strip()  # amount

    logger.debug(f"Extracted: operation_date='{operation_date}', value_date='{value_date}', label='{label}', amount='{amount_str}'")

    # Parse amount (format: "-4,45" or "-1 288,00")
    amount_str = amount_str.replace(' ', '').replace(',', '.')
    amount = float(amount_str)

    # Boursorama uses negative for expenses, positive for income
    # We need to invert: positive = expense, negative = income
    amount = -amount

    return {
        'date': value_date,  # date de valeur pour la colonne principale
        'operation_date': operation_date,  # date d'opération
        'label': label,
        'amount': amount
    }

def parse_banque_populaire_line(line):
    """Parse a line from Banque Populaire CSV format"""
    fields = line.split(';')
    logger.debug(f"Parsing Banque Populaire line with {len(fields)} fields")

    if len(fields) < 12:
        raise ValueError(f"Invalid Banque Populaire format: only {len(fields)} fields, expected at least 12")

    # Extract fields based on position
    value_date = fields[0].strip()  # Date de comptabilisation
    beneficiary = fields[1].strip()
    full_label = fields[2].strip()
    debit_amount_str = fields[8].strip()  # Débit (dépenses)
    credit_amount_str = fields[9].strip()  # Crédit (revenus)
    operation_date = fields[10].strip() if len(fields) > 10 else value_date  # Date operation (champ 10)

    logger.debug(f"Extracted: value_date='{value_date}', operation_date='{operation_date}', beneficiary='{beneficiary}', debit='{debit_amount_str}', credit='{credit_amount_str}'")

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
        'date': value_date,  # date de valeur pour la colonne principale
        'operation_date': operation_date,  # date d'opération
        'label': label,
        'amount': amount
    }

def parse_qif(file_content):
    """Parse QIF (Quicken Interchange Format) file

    QIF format uses markers:
    !Type:Bank or !Type:CCard
    D - Date (MM/DD/YYYY or DD/MM/YYYY)
    T - Transaction amount
    P - Payee (label)
    M - Memo (notes)
    ^ - End of transaction
    """
    logger.info("Parsing QIF format")

    transactions = []
    current_transaction = {}

    lines = file_content.split('\n')

    for line_num, line in enumerate(lines, start=1):
        line = line.strip()

        if not line:
            continue

        # Skip header
        if line.startswith('!Type:'):
            logger.info(f"QIF type: {line}")
            continue

        # End of transaction marker
        if line == '^':
            if current_transaction:
                transactions.append(current_transaction)
                current_transaction = {}
            continue

        # Parse field
        if len(line) < 2:
            continue

        marker = line[0]
        value = line[1:].strip()

        if marker == 'D':
            # Date
            current_transaction['date'] = value
        elif marker == 'T':
            # Amount
            current_transaction['amount'] = value
        elif marker == 'P':
            # Payee (label)
            current_transaction['label'] = value
        elif marker == 'M':
            # Memo (notes)
            current_transaction['memo'] = value
        elif marker == 'N':
            # Check number or reference (ignore for now)
            pass
        elif marker == 'C':
            # Cleared status (ignore for now)
            pass

    logger.info(f"Parsed {len(transactions)} transactions from QIF")
    return transactions

def import_qif(file_content):
    """Import transactions from QIF content"""
    logger.info("Starting QIF import")

    results = {
        'imported': 0,
        'duplicates': 0,
        'errors': [],
        'format': 'qif'
    }

    try:
        transactions = parse_qif(file_content)

        for idx, txn_data in enumerate(transactions, start=1):
            try:
                # Validate required fields
                if 'date' not in txn_data or 'amount' not in txn_data:
                    results['errors'].append(f"Transaction {idx}: Missing date or amount")
                    continue

                # Parse date
                date = parse_date(txn_data['date'])

                # Parse amount (remove commas and convert)
                amount_str = txn_data['amount'].replace(',', '')
                amount = float(amount_str)

                # QIF uses negative for expenses (withdrawals), positive for income (deposits)
                # We need to invert: positive = expense, negative = income
                amount = -amount

                # Use payee as label, or "Transaction" if missing
                label = txn_data.get('label', 'Transaction').strip()
                if not label:
                    label = 'Transaction'

                # Get memo as notes
                notes = txn_data.get('memo', '').strip() or None

                # Calculate hash
                transaction_hash = calculate_transaction_hash(date, label, amount)

                # Check duplicates
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
                    notes=notes,
                    operation_date=None
                )

                results['imported'] += 1

            except ValueError as e:
                logger.warning(f"ValueError on transaction {idx}: {str(e)}")
                results['errors'].append(f"Transaction {idx}: {str(e)}")
            except Exception as e:
                logger.error(f"Unexpected error on transaction {idx}: {str(e)}")
                results['errors'].append(f"Transaction {idx}: Unexpected error - {str(e)}")

    except Exception as e:
        logger.error(f"QIF parsing error: {str(e)}")
        results['errors'].append(f"QIF parsing error: {str(e)}")

    logger.info(f"QIF import completed: {results['imported']} imported, {results['duplicates']} duplicates, {len(results['errors'])} errors")

    return results

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
                    operation_date = parse_date(data['operation_date']) if data.get('operation_date') else None

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
                        notes=None,
                        operation_date=operation_date
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
                    operation_date_str = row.get('operation_date', '').strip() if 'operation_date' in row else None
                    operation_date = parse_date(operation_date_str) if operation_date_str else None

                    # Create transaction
                    Transaction.create(
                        date=date,
                        label=label,
                        amount=amount,
                        category_id=category_id,
                        hash=transaction_hash,
                        notes=notes,
                        operation_date=operation_date
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