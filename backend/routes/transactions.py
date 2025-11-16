from flask import Blueprint, request, jsonify
from models.transaction import Transaction
from utils.hash_utils import calculate_transaction_hash

transactions_bp = Blueprint('transactions', __name__)

@transactions_bp.route('/transactions', methods=['GET'])
def get_transactions():
    """Get all transactions, optionally filtered by year"""
    year = request.args.get('year', type=int)

    try:
        transactions = Transaction.get_all(year=year)
        return jsonify({
            'success': True,
            'data': transactions
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@transactions_bp.route('/transactions/<int:transaction_id>', methods=['GET'])
def get_transaction(transaction_id):
    """Get a single transaction by ID"""
    try:
        transaction = Transaction.get_by_id(transaction_id)

        if not transaction:
            return jsonify({
                'success': False,
                'error': 'Transaction not found'
            }), 404

        return jsonify({
            'success': True,
            'data': transaction.to_dict()
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@transactions_bp.route('/transactions', methods=['POST'])
def create_transaction():
    """Create a new transaction"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400

        # Validate required fields
        required_fields = ['date', 'label', 'amount']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400

        # Calculate hash for duplicate detection
        transaction_hash = calculate_transaction_hash(
            data['date'],
            data['label'],
            data['amount']
        )

        # Check for duplicates
        if Transaction.exists_by_hash(transaction_hash):
            return jsonify({
                'success': False,
                'error': 'Duplicate transaction'
            }), 409

        # Create transaction
        transaction = Transaction.create(
            date=data['date'],
            label=data['label'],
            amount=float(data['amount']),
            category_id=data.get('category_id'),
            subcategory_id=data.get('subcategory_id'),
            hash=transaction_hash,
            notes=data.get('notes'),
            operation_date=data.get('operation_date')
        )

        return jsonify({
            'success': True,
            'data': transaction.to_dict()
        }), 201

    except ValueError as e:
        return jsonify({
            'success': False,
            'error': f'Invalid data: {str(e)}'
        }), 400

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@transactions_bp.route('/transactions/<int:transaction_id>', methods=['PUT'])
def update_transaction(transaction_id):
    """Update an existing transaction"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400

        # Check if transaction exists
        existing_transaction = Transaction.get_by_id(transaction_id)
        if not existing_transaction:
            return jsonify({
                'success': False,
                'error': 'Transaction not found'
            }), 404

        # Update transaction
        update_params = {
            'transaction_id': transaction_id,
            'date': data.get('date'),
            'label': data.get('label'),
            'amount': float(data['amount']) if 'amount' in data else None,
            'category_id': data.get('category_id'),
            'subcategory_id': data.get('subcategory_id')
        }

        # Only include notes if explicitly provided in the request
        if 'notes' in data:
            update_params['notes'] = data.get('notes')

        updated_transaction = Transaction.update(**update_params)

        return jsonify({
            'success': True,
            'data': updated_transaction.to_dict()
        }), 200

    except ValueError as e:
        return jsonify({
            'success': False,
            'error': f'Invalid data: {str(e)}'
        }), 400

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@transactions_bp.route('/transactions/<int:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    """Delete a transaction"""
    try:
        deleted = Transaction.delete(transaction_id)

        if not deleted:
            return jsonify({
                'success': False,
                'error': 'Transaction not found'
            }), 404

        return jsonify({
            'success': True,
            'message': 'Transaction deleted successfully'
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500