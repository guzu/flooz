from flask import Blueprint, request, jsonify
from services.import_service import import_csv

import_bp = Blueprint('import', __name__)

@import_bp.route('/import/csv', methods=['POST'])
def import_csv_file():
    """Import transactions from CSV file"""
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file provided'
            }), 400

        file = request.files['file']

        # Check if file is selected
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400

        # Check file extension
        if not file.filename.lower().endswith('.csv'):
            return jsonify({
                'success': False,
                'error': 'Invalid file type. Only CSV files are allowed.'
            }), 400

        # Read file content
        file_content = file.read().decode('utf-8')

        # Import transactions
        results = import_csv(file_content)

        return jsonify({
            'success': True,
            'data': results
        }), 200

    except UnicodeDecodeError:
        return jsonify({
            'success': False,
            'error': 'Invalid file encoding. Please use UTF-8 encoded CSV files.'
        }), 400

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@import_bp.route('/import/preview', methods=['POST'])
def preview_csv():
    """Preview CSV content before import"""
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file provided'
            }), 400

        file = request.files['file']

        # Check if file is selected
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400

        # Check file extension
        if not file.filename.lower().endswith('.csv'):
            return jsonify({
                'success': False,
                'error': 'Invalid file type. Only CSV files are allowed.'
            }), 400

        # Read file content
        file_content = file.read().decode('utf-8')

        # Parse first few rows for preview
        import csv
        from io import StringIO

        csv_data = StringIO(file_content)
        reader = csv.DictReader(csv_data)

        headers = reader.fieldnames
        preview_rows = []

        for i, row in enumerate(reader):
            if i >= 5:  # Only preview first 5 rows
                break
            preview_rows.append(row)

        # Count total rows
        csv_data.seek(0)
        total_rows = sum(1 for row in csv.DictReader(csv_data)) if csv_data else 0

        return jsonify({
            'success': True,
            'data': {
                'headers': headers,
                'preview_rows': preview_rows,
                'total_rows': total_rows,
                'filename': file.filename
            }
        }), 200

    except UnicodeDecodeError:
        return jsonify({
            'success': False,
            'error': 'Invalid file encoding. Please use UTF-8 encoded CSV files.'
        }), 400

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500