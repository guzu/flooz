from flask import Blueprint, jsonify, request
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

@subcategories_bp.route('/subcategories', methods=['POST'])
def create_subcategory():
    """Create a new subcategory"""
    try:
        data = request.get_json()
        name = data.get('name')
        category_id = data.get('category_id')
        color = data.get('color', '#6b7280')

        if not name or not category_id:
            return jsonify({
                'success': False,
                'error': 'Name and category_id are required'
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO subcategories (name, category_id, color)
            VALUES (?, ?, ?)
        ''', (name, category_id, color))

        subcategory_id = cursor.lastrowid
        conn.commit()

        cursor.execute('''
            SELECT s.*, c.name as category_name, c.color as category_color
            FROM subcategories s
            LEFT JOIN categories c ON s.category_id = c.id
            WHERE s.id = ?
        ''', (subcategory_id,))

        row = cursor.fetchone()
        conn.close()

        subcategory = {
            'id': row['id'],
            'name': row['name'],
            'category_id': row['category_id'],
            'category_name': row['category_name'],
            'category_color': row['category_color'],
            'color': row['color'],
            'created_at': row['created_at']
        }

        return jsonify({
            'success': True,
            'data': subcategory
        }), 201

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@subcategories_bp.route('/subcategories/<int:subcategory_id>', methods=['PUT'])
def update_subcategory(subcategory_id):
    """Update a subcategory"""
    try:
        data = request.get_json()
        name = data.get('name')
        color = data.get('color')

        if not name:
            return jsonify({
                'success': False,
                'error': 'Name is required'
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Build update query dynamically
        update_fields = ['name = ?']
        params = [name]

        if color:
            update_fields.append('color = ?')
            params.append(color)

        params.append(subcategory_id)

        cursor.execute(f'''
            UPDATE subcategories
            SET {', '.join(update_fields)}
            WHERE id = ?
        ''', params)

        conn.commit()

        cursor.execute('''
            SELECT s.*, c.name as category_name, c.color as category_color
            FROM subcategories s
            LEFT JOIN categories c ON s.category_id = c.id
            WHERE s.id = ?
        ''', (subcategory_id,))

        row = cursor.fetchone()
        conn.close()

        if not row:
            return jsonify({
                'success': False,
                'error': 'Subcategory not found'
            }), 404

        subcategory = {
            'id': row['id'],
            'name': row['name'],
            'category_id': row['category_id'],
            'category_name': row['category_name'],
            'category_color': row['category_color'],
            'color': row['color'],
            'created_at': row['created_at']
        }

        return jsonify({
            'success': True,
            'data': subcategory
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@subcategories_bp.route('/subcategories/<int:subcategory_id>', methods=['DELETE'])
def delete_subcategory(subcategory_id):
    """Delete a subcategory"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if subcategory has transactions
        cursor.execute('''
            SELECT COUNT(*) as count
            FROM transactions
            WHERE subcategory_id = ?
        ''', (subcategory_id,))

        count = cursor.fetchone()['count']

        if count > 0:
            conn.close()
            return jsonify({
                'success': False,
                'error': f'Cannot delete subcategory with {count} transaction(s)'
            }), 400

        cursor.execute('DELETE FROM subcategories WHERE id = ?', (subcategory_id,))
        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Subcategory deleted successfully'
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500