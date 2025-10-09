"""
AI Analysis Routes
Endpoints for AI-powered financial analysis
"""

from flask import Blueprint, request, jsonify
from services.ai_analysis_service import (
    aggregate_financial_data,
    aggregate_comparison_data,
    analyze_with_ai,
    test_api_key
)
from config import Config

ai_analysis_bp = Blueprint('ai_analysis', __name__)


@ai_analysis_bp.route('/analysis/single', methods=['POST'])
def analyze_single_year():
    """
    Analyze a single year with AI
    POST body: { year: 2025, analysis_type: 'overview', provider: 'ollama', api_key: 'optional', model: 'optional' }
    """
    try:
        data = request.json
        year = data.get('year')
        analysis_type = data.get('analysis_type', 'overview')
        provider = data.get('provider', Config.AI_PROVIDER)
        api_key = data.get('api_key')  # Optional, will use config if not provided
        model = data.get('model')  # Optional Ollama model

        if not year:
            return jsonify({'error': 'Year parameter is required'}), 400

        # Validate analysis_type
        valid_types = ['overview', 'recommendations', 'anomalies']
        if analysis_type not in valid_types:
            return jsonify({'error': f'Invalid analysis_type. Must be one of: {valid_types}'}), 400

        # Aggregate financial data
        financial_data = aggregate_financial_data(year)

        # Call AI analysis
        if provider == 'ollama':
            from services.ai_analysis_service import call_ollama_api, create_analysis_prompt
            prompt = create_analysis_prompt(financial_data, analysis_type)

            # Debug: Write data and prompt to file
            import json
            import os
            debug_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'dbg-ia.txt')
            with open(debug_file, 'w', encoding='utf-8') as f:
                f.write("=" * 80 + "\n")
                f.write("DEBUG IA ANALYSIS - SINGLE YEAR\n")
                f.write("=" * 80 + "\n\n")
                f.write(f"Provider: {provider}\n")
                f.write(f"Model: {model}\n")
                f.write(f"Year: {year}\n")
                f.write(f"Analysis Type: {analysis_type}\n\n")
                f.write("=" * 80 + "\n")
                f.write("FINANCIAL DATA\n")
                f.write("=" * 80 + "\n")
                f.write(json.dumps(financial_data, indent=2, ensure_ascii=False))
                f.write("\n\n")
                f.write("=" * 80 + "\n")
                f.write("PROMPT SENT TO AI\n")
                f.write("=" * 80 + "\n")
                f.write(prompt)
                f.write("\n\n")

            analysis = call_ollama_api(prompt, model)
        else:
            analysis = analyze_with_ai(
                data=financial_data,
                analysis_type=analysis_type,
                provider=provider,
                api_key=api_key
            )

        return jsonify({
            'success': True,
            'data': {
                'year': year,
                'analysis_type': analysis_type,
                'analysis': analysis,
                'financial_data': financial_data  # Include raw data for reference
            }
        })

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@ai_analysis_bp.route('/analysis/compare', methods=['POST'])
def analyze_comparison():
    """
    Compare multiple years with AI
    POST body: { years: [2023, 2024, 2025], provider: 'ollama', api_key: 'optional', model: 'optional' }
    """
    try:
        data = request.json
        years = data.get('years', [])
        provider = data.get('provider', Config.AI_PROVIDER)
        api_key = data.get('api_key')
        model = data.get('model')

        if not years or len(years) < 2:
            return jsonify({'error': 'At least 2 years required for comparison'}), 400

        # Aggregate data for all years
        comparison_data = aggregate_comparison_data(years)

        # Call AI analysis
        if provider == 'ollama':
            from services.ai_analysis_service import call_ollama_api, create_analysis_prompt
            prompt = create_analysis_prompt(comparison_data, 'comparison')

            # Debug: Write data and prompt to file
            import json
            import os
            debug_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'dbg-ia.txt')
            with open(debug_file, 'w', encoding='utf-8') as f:
                f.write("=" * 80 + "\n")
                f.write("DEBUG IA ANALYSIS - YEAR COMPARISON\n")
                f.write("=" * 80 + "\n\n")
                f.write(f"Provider: {provider}\n")
                f.write(f"Model: {model}\n")
                f.write(f"Years: {years}\n\n")
                f.write("=" * 80 + "\n")
                f.write("COMPARISON DATA\n")
                f.write("=" * 80 + "\n")
                f.write(json.dumps(comparison_data, indent=2, ensure_ascii=False))
                f.write("\n\n")
                f.write("=" * 80 + "\n")
                f.write("PROMPT SENT TO AI\n")
                f.write("=" * 80 + "\n")
                f.write(prompt)
                f.write("\n\n")

            analysis = call_ollama_api(prompt, model)
        else:
            analysis = analyze_with_ai(
                data=comparison_data,
                analysis_type='comparison',
                provider=provider,
                api_key=api_key
            )

        return jsonify({
            'success': True,
            'data': {
                'years': years,
                'analysis': analysis,
                'comparison_data': comparison_data
            }
        })

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@ai_analysis_bp.route('/analysis/config', methods=['GET'])
def get_ai_config():
    """
    Get AI configuration (provider, whether API key is set)
    """
    return jsonify({
        'success': True,
        'data': {
            'provider': Config.AI_PROVIDER,
            'has_api_key': bool(Config.ANTHROPIC_API_KEY),
            'timeout': Config.AI_TIMEOUT,
            'ollama_model': Config.OLLAMA_MODEL,
            'available_providers': ['claude', 'ollama']
        }
    })


@ai_analysis_bp.route('/analysis/test-key', methods=['POST'])
def test_key():
    """
    Test if an API key is valid or if Ollama is accessible
    POST body: { api_key: 'sk-...', provider: 'claude', model: 'llama3.2:3b' }
    """
    try:
        data = request.json
        api_key = data.get('api_key')
        provider = data.get('provider', 'claude')
        model = data.get('model')

        # For Claude, API key is required
        if provider == 'claude' and not api_key:
            return jsonify({'error': 'API key is required for Claude'}), 400

        # Test the key/connection
        test_api_key(api_key, provider, model)

        return jsonify({
            'success': True,
            'data': {'valid': True, 'message': 'Connection successful'}
        })

    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': f'Test failed: {str(e)}'}), 500


@ai_analysis_bp.route('/analysis/test-model', methods=['POST'])
def test_model():
    """
    Test the model with a simple question
    POST body: { provider: 'ollama', model: 'llama3.2:3b', api_key: 'optional' }
    """
    try:
        data = request.json
        provider = data.get('provider', 'ollama')
        model = data.get('model')
        api_key = data.get('api_key')

        # Simple test prompt
        test_prompt = "Réponds en une phrase courte : Quelle est la capitale de la France ?"

        # Call the appropriate provider
        if provider == 'ollama':
            from services.ai_analysis_service import call_ollama_api
            response = call_ollama_api(test_prompt, model)
        elif provider == 'claude':
            from services.ai_analysis_service import call_claude_api
            response = call_claude_api(test_prompt, api_key)
        else:
            return jsonify({'error': f'Provider {provider} not supported'}), 400

        return jsonify({
            'success': True,
            'data': {
                'prompt': test_prompt,
                'response': response,
                'provider': provider,
                'model': model or 'default'
            }
        })

    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': f'Test failed: {str(e)}'}), 500
