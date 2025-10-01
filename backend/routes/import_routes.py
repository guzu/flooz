from flask import Blueprint, request, jsonify
from services.import_service import import_csv
import logging

import_bp = Blueprint('import', __name__)
logger = logging.getLogger(__name__)

@import_bp.route('/import/csv', methods=['POST'])
def import_csv_file():
    """Import transactions from CSV file"""
    logger.info("CSV import request received")

    try:
        # Check if file is present
        if 'file' not in request.files:
            logger.warning("Import request without file")
            return jsonify({
                'success': False,
                'error': 'No file provided'
            }), 400

        file = request.files['file']

        # Check if file is selected
        if file.filename == '':
            logger.warning("Import request with empty filename")
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400

        logger.info(f"Processing CSV file: {file.filename}")

        # Check file extension
        if not file.filename.lower().endswith('.csv'):
            logger.warning(f"Invalid file type: {file.filename}")
            return jsonify({
                'success': False,
                'error': 'Invalid file type. Only CSV files are allowed.'
            }), 400

        # Read file content
        file_content = file.read().decode('utf-8')
        logger.info(f"File read successfully. Content length: {len(file_content)} characters")

        # Get bank type from request (optional parameter)
        bank_type = request.form.get('bank_type', 'auto')
        logger.info(f"Bank type parameter: {bank_type}")

        # Log first few lines for debugging
        lines = file_content.split('\n')[:3]
        logger.debug(f"First 3 lines of CSV:\n" + "\n".join(f"  {i+1}: {line[:100]}" for i, line in enumerate(lines)))

        # Import transactions with bank type
        results = import_csv(file_content, bank_type=bank_type)
        logger.info(f"Import results: {results}")

        return jsonify({
            'success': True,
            'data': results
        }), 200

    except UnicodeDecodeError as e:
        logger.error(f"Unicode decode error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Invalid file encoding. Please use UTF-8 encoded CSV files.'
        }), 400

    except Exception as e:
        logger.error(f"Unexpected error during CSV import: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@import_bp.route('/import/validated', methods=['POST'])
def import_validated_transactions():
    """Import validated transactions with custom categories"""
    logger.info("Validated transactions import request received")

    try:
        data = request.get_json()

        if not data or 'transactions' not in data:
            return jsonify({'success': False, 'error': 'No transactions provided'}), 400

        transactions = data['transactions']
        logger.info(f"Importing {len(transactions)} validated transactions")

        from models.transaction import Transaction

        imported = 0
        duplicates = 0
        errors = []

        for txn in transactions:
            try:
                # Skip if marked as duplicate or excluded
                if txn.get('is_duplicate') or txn.get('excluded'):
                    if txn.get('is_duplicate'):
                        duplicates += 1
                    continue

                # Create transaction
                Transaction.create(
                    date=txn['date'],
                    label=txn['label'],
                    amount=txn['amount'],
                    category_id=txn.get('category_id'),
                    hash=txn['hash'],
                    notes=None
                )

                imported += 1

            except Exception as e:
                logger.error(f"Error importing transaction: {str(e)}")
                errors.append(f"Row {txn.get('row_num', '?')}: {str(e)}")

        logger.info(f"Import completed: {imported} imported, {duplicates} duplicates, {len(errors)} errors")

        return jsonify({
            'success': True,
            'data': {
                'imported': imported,
                'duplicates': duplicates,
                'errors': errors
            }
        }), 200

    except Exception as e:
        logger.error(f"Unexpected error during validated import: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@import_bp.route('/import/validate', methods=['POST'])
def validate_csv():
    """Validate CSV content with categorization and duplicate detection"""
    logger.info("CSV validation request received")

    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400

        if not file.filename.lower().endswith('.csv'):
            return jsonify({'success': False, 'error': 'Invalid file type. Only CSV files are allowed.'}), 400

        # Read file content
        file_content = file.read().decode('utf-8')
        bank_type = request.form.get('bank_type', 'auto')

        logger.info(f"Validating CSV file: {file.filename} with bank_type={bank_type}")

        # Import service functions
        from services.import_service import detect_bank_format, parse_boursorama_line, parse_banque_populaire_line, parse_date, detect_category
        from models.transaction import Transaction
        from utils.hash_utils import calculate_transaction_hash
        import csv
        from io import StringIO

        # Detect format
        if bank_type == 'auto':
            csv_format = detect_bank_format(file_content)
        else:
            csv_format = bank_type

        logger.info(f"Format for validation: {csv_format}")

        validated_transactions = []
        errors = []

        if csv_format in ['boursorama', 'banque_populaire']:
            lines = [line.strip() for line in file_content.split('\n') if line.strip()]

            # Skip header
            if lines:
                lines = lines[1:]

            parser = parse_boursorama_line if csv_format == 'boursorama' else parse_banque_populaire_line

            for row_num, line in enumerate(lines, start=2):
                try:
                    data = parser(line)
                    date = parse_date(data['date'])
                    label = data['label'].strip()
                    amount = data['amount']

                    if not label:
                        errors.append(f"Row {row_num}: Empty label")
                        continue

                    # Calculate hash
                    transaction_hash = calculate_transaction_hash(date, label, amount)

                    # Check for duplicate
                    is_duplicate = Transaction.exists_by_hash(transaction_hash)

                    # Auto-detect category
                    category_id = detect_category(label)

                    validated_transactions.append({
                        'row_num': row_num,
                        'date': date,
                        'label': label,
                        'amount': amount,
                        'category_id': category_id,
                        'hash': transaction_hash,
                        'is_duplicate': is_duplicate
                    })

                except Exception as e:
                    logger.warning(f"Error parsing line {row_num}: {str(e)}")
                    errors.append(f"Row {row_num}: {str(e)}")

        else:
            # Standard format
            csv_data = StringIO(file_content)
            reader = csv.DictReader(csv_data)

            for row_num, row in enumerate(reader, start=2):
                try:
                    if 'date' not in row or 'label' not in row or 'amount' not in row:
                        errors.append(f"Row {row_num}: Missing required fields")
                        continue

                    date = parse_date(row['date'])
                    label = row['label'].strip()
                    amount = float(row['amount'])

                    if not label:
                        errors.append(f"Row {row_num}: Empty label")
                        continue

                    # Calculate hash
                    transaction_hash = calculate_transaction_hash(date, label, amount)

                    # Check duplicate
                    is_duplicate = Transaction.exists_by_hash(transaction_hash)

                    # Auto-detect category
                    category_id = detect_category(label)

                    validated_transactions.append({
                        'row_num': row_num,
                        'date': date,
                        'label': label,
                        'amount': amount,
                        'category_id': category_id,
                        'hash': transaction_hash,
                        'is_duplicate': is_duplicate
                    })

                except Exception as e:
                    logger.warning(f"Error parsing row {row_num}: {str(e)}")
                    errors.append(f"Row {row_num}: {str(e)}")

        logger.info(f"Validation completed: {len(validated_transactions)} transactions, {len(errors)} errors")

        return jsonify({
            'success': True,
            'data': {
                'transactions': validated_transactions,
                'errors': errors,
                'format': csv_format,
                'filename': file.filename
            }
        }), 200

    except UnicodeDecodeError as e:
        logger.error(f"Unicode decode error: {str(e)}")
        return jsonify({'success': False, 'error': 'Invalid file encoding. Please use UTF-8 encoded CSV files.'}), 400

    except Exception as e:
        logger.error(f"Unexpected error during CSV validation: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@import_bp.route('/import/preview', methods=['POST'])
def preview_csv():
    """Preview CSV content before import"""
    logger.info("CSV preview request received")

    try:
        # Check if file is present
        if 'file' not in request.files:
            logger.warning("Preview request without file")
            return jsonify({
                'success': False,
                'error': 'No file provided'
            }), 400

        file = request.files['file']

        # Check if file is selected
        if file.filename == '':
            logger.warning("Preview request with empty filename")
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400

        logger.info(f"Previewing CSV file: {file.filename}")

        # Check file extension
        if not file.filename.lower().endswith('.csv'):
            logger.warning(f"Invalid file type for preview: {file.filename}")
            return jsonify({
                'success': False,
                'error': 'Invalid file type. Only CSV files are allowed.'
            }), 400

        # Read file content
        file_content = file.read().decode('utf-8')
        logger.info(f"Preview file read successfully. Content length: {len(file_content)} characters")

        # Try to detect format first
        from services.import_service import detect_bank_format
        detected_format = detect_bank_format(file_content)
        logger.info(f"Format detected for preview: {detected_format}")

        # Parse first few rows for preview
        import csv
        from io import StringIO

        if detected_format in ['boursorama', 'banque_populaire']:
            # For bank format, create manual preview
            lines = [line.strip() for line in file_content.split('\n') if line.strip()]
            if len(lines) > 0:
                # Use first line as headers (will be split by semicolon)
                headers = lines[0].split(';') if ';' in lines[0] else ['Field_' + str(i) for i in range(len(lines[0].split(';')))]
                preview_rows = []

                # Preview next few lines (skip header)
                data_lines = lines[1:] if len(lines) > 1 else []
                for i, line in enumerate(data_lines[:5]):
                    if line.strip():
                        fields = line.split(';')
                        row_dict = {}
                        for j, field in enumerate(fields):
                            header_name = headers[j] if j < len(headers) else f'Field_{j}'
                            row_dict[header_name] = field.strip()
                        preview_rows.append(row_dict)

                total_rows = len(data_lines)
            else:
                headers = []
                preview_rows = []
                total_rows = 0
        else:
            # Standard CSV format
            csv_data = StringIO(file_content)
            reader = csv.DictReader(csv_data)

            headers = reader.fieldnames if reader.fieldnames else []
            logger.debug(f"CSV headers detected for preview: {headers}")

            preview_rows = []
            try:
                for i, row in enumerate(reader):
                    if i >= 5:  # Only preview first 5 rows
                        break
                    # Clean the row to avoid None values
                    cleaned_row = {k: (v if v is not None else '') for k, v in row.items()}
                    preview_rows.append(cleaned_row)
            except Exception as e:
                logger.warning(f"Error reading CSV rows: {e}")
                preview_rows = []

            # Count total rows
            try:
                csv_data.seek(0)
                total_rows = sum(1 for row in csv.DictReader(csv_data)) if csv_data else 0
            except:
                total_rows = 0

        logger.info(f"CSV preview: {len(headers)} columns, {total_rows} total rows, showing {len(preview_rows)} preview rows")

        # Ensure all data is JSON serializable
        safe_data = {
            'headers': headers or [],
            'preview_rows': preview_rows or [],
            'total_rows': total_rows or 0,
            'filename': file.filename or 'unknown',
            'detected_format': detected_format
        }

        return jsonify({
            'success': True,
            'data': safe_data
        }), 200

    except UnicodeDecodeError as e:
        logger.error(f"Unicode decode error in preview: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Invalid file encoding. Please use UTF-8 encoded CSV files.'
        }), 400

    except Exception as e:
        logger.error(f"Unexpected error during CSV preview: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500