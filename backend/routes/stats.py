from flask import Blueprint, request, jsonify
from services.stats_service import StatsService
from datetime import datetime

stats_bp = Blueprint('stats', __name__)

@stats_bp.route('/stats/monthly/<int:year>', methods=['GET'])
def get_monthly_stats(year):
    """Get monthly spending stats for a given year"""
    try:
        stats = StatsService.get_monthly_stats(year)
        return jsonify({
            'success': True,
            'data': stats
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@stats_bp.route('/stats/categories/<int:year>', methods=['GET'])
def get_category_stats(year):
    """Get category spending stats for a given year"""
    try:
        stats = StatsService.get_category_stats(year)
        return jsonify({
            'success': True,
            'data': stats
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@stats_bp.route('/stats/summary/<int:year>', methods=['GET'])
def get_year_summary(year):
    """Get summary stats for a given year"""
    try:
        summary = StatsService.get_year_summary(year)
        return jsonify({
            'success': True,
            'data': summary
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@stats_bp.route('/stats/years', methods=['GET'])
def get_available_years():
    """Get list of years with transactions"""
    try:
        years = StatsService.get_available_years()

        # If no years available, return current year
        if not years:
            years = [datetime.now().year]

        return jsonify({
            'success': True,
            'data': years
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500