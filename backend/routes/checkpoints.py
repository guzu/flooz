from flask import Blueprint, request, jsonify
from models.database import get_db_connection

checkpoints_bp = Blueprint('checkpoints', __name__)

@checkpoints_bp.route('/checkpoints', methods=['GET'])
def get_checkpoints():
    """Get all balance checkpoints"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT id, date, balance, notes, created_at
            FROM balance_checkpoints
            ORDER BY date ASC
        ''')

        checkpoints = []
        for row in cursor.fetchall():
            checkpoints.append({
                'id': row['id'],
                'date': row['date'],
                'balance': row['balance'],
                'notes': row['notes'],
                'created_at': row['created_at']
            })

        conn.close()

        return jsonify({
            'success': True,
            'data': checkpoints
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@checkpoints_bp.route('/checkpoints', methods=['POST'])
def create_checkpoint():
    """Create a new balance checkpoint"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400

        # Validate required fields
        if 'date' not in data or 'balance' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required fields: date and balance'
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO balance_checkpoints (date, balance, notes)
            VALUES (?, ?, ?)
        ''', (data['date'], data['balance'], data.get('notes')))

        checkpoint_id = cursor.lastrowid
        conn.commit()

        # Retrieve the created checkpoint
        cursor.execute('SELECT * FROM balance_checkpoints WHERE id = ?', (checkpoint_id,))
        row = cursor.fetchone()

        checkpoint = {
            'id': row['id'],
            'date': row['date'],
            'balance': row['balance'],
            'notes': row['notes'],
            'created_at': row['created_at']
        }

        conn.close()

        return jsonify({
            'success': True,
            'data': checkpoint
        }), 201

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@checkpoints_bp.route('/checkpoints/<int:checkpoint_id>', methods=['PUT'])
def update_checkpoint(checkpoint_id):
    """Update an existing balance checkpoint"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if checkpoint exists
        cursor.execute('SELECT id FROM balance_checkpoints WHERE id = ?', (checkpoint_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Checkpoint not found'
            }), 404

        # Update checkpoint
        updates = []
        params = []

        if 'date' in data:
            updates.append('date = ?')
            params.append(data['date'])
        if 'balance' in data:
            updates.append('balance = ?')
            params.append(data['balance'])
        if 'notes' in data:
            updates.append('notes = ?')
            params.append(data['notes'])

        if updates:
            params.append(checkpoint_id)
            cursor.execute(f'''
                UPDATE balance_checkpoints
                SET {', '.join(updates)}
                WHERE id = ?
            ''', params)
            conn.commit()

        # Retrieve updated checkpoint
        cursor.execute('SELECT * FROM balance_checkpoints WHERE id = ?', (checkpoint_id,))
        row = cursor.fetchone()

        checkpoint = {
            'id': row['id'],
            'date': row['date'],
            'balance': row['balance'],
            'notes': row['notes'],
            'created_at': row['created_at']
        }

        conn.close()

        return jsonify({
            'success': True,
            'data': checkpoint
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@checkpoints_bp.route('/checkpoints/<int:checkpoint_id>', methods=['DELETE'])
def delete_checkpoint(checkpoint_id):
    """Delete a balance checkpoint"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if checkpoint exists
        cursor.execute('SELECT id FROM balance_checkpoints WHERE id = ?', (checkpoint_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Checkpoint not found'
            }), 404

        cursor.execute('DELETE FROM balance_checkpoints WHERE id = ?', (checkpoint_id,))
        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Checkpoint deleted successfully'
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
