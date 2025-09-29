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

        # Log first few lines for debugging
        lines = file_content.split('\n')[:3]
        logger.debug(f"First 3 lines of CSV:\n" + "\n".join(f"  {i+1}: {line[:100]}" for i, line in enumerate(lines)))

        # Import transactions
        results = import_csv(file_content)
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
        from services.import_service import detect_csv_format
        detected_format = detect_csv_format(file_content)
        logger.info(f"Format detected for preview: {detected_format}")

        # Parse first few rows for preview
        import csv
        from io import StringIO

        if detected_format == 'bank':
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