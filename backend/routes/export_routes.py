from flask import Blueprint, send_file, jsonify
from models.database import get_db_connection
from config import Config
import json
import logging
from datetime import datetime

export_bp = Blueprint('export', __name__)
logger = logging.getLogger(__name__)

@export_bp.route('/export/database', methods=['GET'])
def export_database():
    """Export the SQLite database file"""
    try:
        logger.info("Database export requested")
        return send_file(
            Config.DB_PATH,
            as_attachment=True,
            download_name=f'flooz-backup-{datetime.now().strftime("%Y-%m-%d")}.db',
            mimetype='application/x-sqlite3'
        )
    except Exception as e:
        logger.error(f"Error exporting database: {str(e)}")
        return jsonify({'error': 'Failed to export database'}), 500

@export_bp.route('/export/json', methods=['GET'])
def export_json():
    """Export all data as JSON"""
    try:
        logger.info("JSON export requested")

        conn = get_db_connection()
        cursor = conn.cursor()

        # Export transactions
        cursor.execute('''
            SELECT t.*, c.name as category_name, s.name as subcategory_name
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN subcategories s ON t.subcategory_id = s.id
            ORDER BY t.date DESC
        ''')
        transactions = [dict(row) for row in cursor.fetchall()]

        # Export categories
        cursor.execute('SELECT * FROM categories ORDER BY name')
        categories = [dict(row) for row in cursor.fetchall()]

        # Export subcategories
        cursor.execute('''
            SELECT s.*, c.name as category_name
            FROM subcategories s
            LEFT JOIN categories c ON s.category_id = c.id
            ORDER BY c.name, s.name
        ''')
        subcategories = [dict(row) for row in cursor.fetchall()]

        # Export categorization rules
        cursor.execute('''
            SELECT r.*, c.name as category_name
            FROM categorization_rules r
            LEFT JOIN categories c ON r.category_id = c.id
            ORDER BY r.priority DESC, c.name
        ''')
        rules = [dict(row) for row in cursor.fetchall()]

        conn.close()

        # Create export data
        export_data = {
            'export_date': datetime.now().isoformat(),
            'version': '1.0',
            'data': {
                'transactions': transactions,
                'categories': categories,
                'subcategories': subcategories,
                'categorization_rules': rules
            },
            'stats': {
                'total_transactions': len(transactions),
                'total_categories': len(categories),
                'total_subcategories': len(subcategories),
                'total_rules': len(rules)
            }
        }

        # Write to temporary file
        import tempfile
        import os

        temp_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json')
        json.dump(export_data, temp_file, indent=2, ensure_ascii=False)
        temp_file.close()

        # Send file
        response = send_file(
            temp_file.name,
            as_attachment=True,
            download_name=f'flooz-export-{datetime.now().strftime("%Y-%m-%d")}.json',
            mimetype='application/json'
        )

        # Clean up temp file after sending
        @response.call_on_close
        def cleanup():
            try:
                os.unlink(temp_file.name)
            except:
                pass

        return response

    except Exception as e:
        logger.error(f"Error exporting JSON: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to export JSON'}), 500
