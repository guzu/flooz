from flask import Blueprint, jsonify
from models.database import get_db_connection

subcategories_bp = Blueprint('subcategories', __name__)

@subcategories_bp.route('/subcategories', methods=['GET'])
def get_all_subcategories():
    """Get all subcategories with their parent category"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT s.*, c.name as category_name, c.color as category_color
            FROM subcategories s
            LEFT JOIN categories c ON s.category_id = c.id
            ORDER BY c.name, s.name
        ''')

        rows = cursor.fetchall()
        conn.close()

        subcategories = []
        for row in rows:
            subcategories.append({
                'id': row['id'],
                'name': row['name'],
                'category_id': row['category_id'],
                'category_name': row['category_name'],
                'category_color': row['category_color'],
                'color': row['color'],
                'created_at': row['created_at']
            })

        return jsonify({
            'success': True,
            'data': subcategories
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@subcategories_bp.route('/categories/<int:category_id>/subcategories', methods=['GET'])
def get_subcategories_by_category(category_id):
    """Get subcategories for a specific category"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT * FROM subcategories
            WHERE category_id = ?
            ORDER BY name
        ''', (category_id,))

        rows = cursor.fetchall()
        conn.close()

        subcategories = []
        for row in rows:
            subcategories.append({
                'id': row['id'],
                'name': row['name'],
                'category_id': row['category_id'],
                'color': row['color'],
                'created_at': row['created_at']
            })

        return jsonify({
            'success': True,
            'data': subcategories
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500