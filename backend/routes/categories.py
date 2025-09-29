from flask import Blueprint, request, jsonify
from services.category_service import CategoryService

categories_bp = Blueprint('categories', __name__)

@categories_bp.route('/categories', methods=['GET'])
def get_categories():
    """Get all categories with transaction counts"""
    try:
        categories = CategoryService.get_all_categories()
        return jsonify({
            'success': True,
            'data': categories
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@categories_bp.route('/categories/<int:category_id>', methods=['GET'])
def get_category(category_id):
    """Get a single category by ID"""
    try:
        category = CategoryService.get_category_by_id(category_id)

        if not category:
            return jsonify({
                'success': False,
                'error': 'Category not found'
            }), 404

        return jsonify({
            'success': True,
            'data': category
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@categories_bp.route('/categories', methods=['POST'])
def create_category():
    """Create a new category"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400

        # Validate required fields
        if 'name' not in data or 'color' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required fields: name and color'
            }), 400

        category = CategoryService.create_category(
            name=data['name'],
            color=data['color'],
            icon=data.get('icon')
        )

        return jsonify({
            'success': True,
            'data': category
        }), 201

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@categories_bp.route('/categories/<int:category_id>', methods=['PUT'])
def update_category(category_id):
    """Update an existing category"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400

        # Check if category exists
        existing_category = CategoryService.get_category_by_id(category_id)
        if not existing_category:
            return jsonify({
                'success': False,
                'error': 'Category not found'
            }), 404

        category = CategoryService.update_category(
            category_id,
            name=data.get('name'),
            color=data.get('color'),
            icon=data.get('icon')
        )

        return jsonify({
            'success': True,
            'data': category
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@categories_bp.route('/categories/<int:category_id>', methods=['DELETE'])
def delete_category(category_id):
    """Delete a category"""
    try:
        deleted = CategoryService.delete_category(category_id)

        if not deleted:
            return jsonify({
                'success': False,
                'error': 'Category not found'
            }), 404

        return jsonify({
            'success': True,
            'message': 'Category deleted successfully'
        }), 200

    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@categories_bp.route('/categories/rules', methods=['GET'])
def get_categorization_rules():
    """Get all categorization rules"""
    try:
        rules = CategoryService.get_categorization_rules()
        return jsonify({
            'success': True,
            'data': rules
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@categories_bp.route('/categories/rules', methods=['POST'])
def create_categorization_rule():
    """Create a new categorization rule"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400

        # Validate required fields
        if 'pattern' not in data or 'category_id' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required fields: pattern and category_id'
            }), 400

        rule_id = CategoryService.create_categorization_rule(
            pattern=data['pattern'],
            category_id=data['category_id'],
            priority=data.get('priority', 0)
        )

        return jsonify({
            'success': True,
            'data': {'id': rule_id}
        }), 201

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@categories_bp.route('/categories/rules/<int:rule_id>', methods=['DELETE'])
def delete_categorization_rule(rule_id):
    """Delete a categorization rule"""
    try:
        deleted = CategoryService.delete_categorization_rule(rule_id)

        if not deleted:
            return jsonify({
                'success': False,
                'error': 'Rule not found'
            }), 404

        return jsonify({
            'success': True,
            'message': 'Rule deleted successfully'
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500