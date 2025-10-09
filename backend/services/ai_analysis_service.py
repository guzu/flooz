"""
AI Analysis Service
Provides AI-powered financial analysis using Claude API (with future Ollama support)
"""

import anthropic
from models.database import get_db_connection
from config import Config


def aggregate_financial_data(year):
    """
    Aggregate financial data for a single year
    Returns a structured dictionary with all stats needed for AI analysis
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Get total expenses and income
    cursor.execute('''
        SELECT
            SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_expenses,
            SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) as total_income,
            COUNT(*) as transaction_count
        FROM transactions
        WHERE strftime('%Y', date) = ?
    ''', (str(year),))

    totals = cursor.fetchone()
    total_expenses = totals[0] or 0
    total_income = abs(totals[1] or 0)
    transaction_count = totals[2] or 0

    # Get breakdown by category
    cursor.execute('''
        SELECT
            c.name as category_name,
            SUM(t.amount) as total,
            COUNT(t.id) as count,
            AVG(t.amount) as avg_amount
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE strftime('%Y', t.date) = ? AND t.amount > 0
        GROUP BY c.name
        ORDER BY total DESC
    ''', (str(year),))

    categories = []
    for row in cursor.fetchall():
        categories.append({
            'name': row[0] or 'Non catégorisé',
            'total': round(row[1], 2),
            'transaction_count': row[2],
            'avg_amount': round(row[3], 2),
            'percentage': round((row[1] / total_expenses * 100) if total_expenses > 0 else 0, 1)
        })

    # Get monthly breakdown
    cursor.execute('''
        SELECT
            strftime('%m', date) as month,
            SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as expenses,
            SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) as income
        FROM transactions
        WHERE strftime('%Y', date) = ?
        GROUP BY month
        ORDER BY month
    ''', (str(year),))

    monthly = []
    month_names = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                   'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

    for row in cursor.fetchall():
        month_num = int(row[0]) - 1
        monthly.append({
            'month': month_names[month_num],
            'expenses': round(row[1], 2),
            'income': round(abs(row[2]), 2),
            'net': round(abs(row[2]) - row[1], 2)
        })

    # Get top 5 largest expenses
    cursor.execute('''
        SELECT label, amount, date, c.name as category
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE strftime('%Y', t.date) = ? AND amount > 0
        ORDER BY amount DESC
        LIMIT 5
    ''', (str(year),))

    top_expenses = []
    for row in cursor.fetchall():
        top_expenses.append({
            'label': row[0],
            'amount': round(row[1], 2),
            'date': row[2],
            'category': row[3] or 'Non catégorisé'
        })

    conn.close()

    return {
        'year': year,
        'total_expenses': round(total_expenses, 2),
        'total_income': round(total_income, 2),
        'net_balance': round(total_income - total_expenses, 2),
        'transaction_count': transaction_count,
        'categories': categories,
        'monthly_breakdown': monthly,
        'top_expenses': top_expenses
    }


def aggregate_comparison_data(years):
    """
    Aggregate financial data for multiple years for comparison
    """
    data = {}
    for year in years:
        data[str(year)] = aggregate_financial_data(year)
    return data


def create_analysis_prompt(data, analysis_type='overview'):
    """
    Create a structured prompt for Claude API based on data and analysis type
    """
    if isinstance(data, dict) and 'year' in data:
        # Single year analysis
        year_data = data

        if analysis_type == 'overview':
            prompt = f"""Tu es un assistant financier expert. Analyse les données financières suivantes pour l'année {year_data['year']} et fournis une analyse complète en français.

**Données financières {year_data['year']} :**
- Total dépenses : {year_data['total_expenses']}€
- Total revenus : {year_data['total_income']}€
- Solde net : {year_data['net_balance']}€
- Nombre de transactions : {year_data['transaction_count']}

**Répartition par catégorie (top 5) :**
"""
            for cat in year_data['categories'][:5]:  # Top 5 categories only (optimized for speed)
                prompt += f"- {cat['name']}: {cat['total']}€ ({cat['percentage']}%) - {cat['transaction_count']} transactions\n"

            # Include monthly summary with only notable months (highest/lowest expenses)
            sorted_months = sorted(year_data['monthly_breakdown'], key=lambda x: x['expenses'])
            prompt += f"\n**Évolution mensuelle (résumé) :**\n"
            prompt += f"- Mois le plus coûteux : {sorted_months[-1]['month']} ({sorted_months[-1]['expenses']}€)\n"
            prompt += f"- Mois le moins coûteux : {sorted_months[0]['month']} ({sorted_months[0]['expenses']}€)\n"
            avg_expenses = sum(m['expenses'] for m in year_data['monthly_breakdown']) / len(year_data['monthly_breakdown'])
            prompt += f"- Moyenne mensuelle : {avg_expenses:.2f}€\n"

            prompt += f"\n**Top 5 des plus grosses dépenses :**\n"
            for expense in year_data['top_expenses']:
                prompt += f"- {expense['label']}: {expense['amount']}€ ({expense['category']}) le {expense['date']}\n"

            prompt += """

**Fournis une analyse concise avec :**
1. Vue d'ensemble (2-3 phrases)
2. Points clés (positifs et attention)
3. 2-3 recommandations prioritaires

Sois bref et concret. Formate en Markdown."""

        elif analysis_type == 'recommendations':
            prompt = f"""Tu es un conseiller financier. Fournis 3 recommandations concrètes pour optimiser le budget {year_data['year']}.

**Données :**
- Dépenses : {year_data['total_expenses']}€
- Top 5 : {', '.join([f"{cat['name']} ({cat['percentage']}%)" for cat in year_data['categories'][:5]])}

**Pour chaque recommandation :**
1. Action concrète
2. Économie estimée
3. Difficulté (facile/moyen/difficile)

Sois bref. Markdown."""

        else:  # anomalies
            # Simplified anomaly detection with top 5 categories
            top_5_cats = ', '.join([f"{cat['name']} ({cat['percentage']}%)" for cat in year_data['categories'][:5]])
            prompt = f"""Identifie 3-4 anomalies dans les finances {year_data['year']}.

**Données :**
- Total : {year_data['total_expenses']}€
- Top 5 : {top_5_cats}
- Plus grosse dépense : {year_data['top_expenses'][0]['amount']}€ ({year_data['top_expenses'][0]['label']})

**Cherche :**
1. Dépenses exceptionnelles
2. Catégories disproportionnées
3. Comportements à surveiller

Bref. Markdown."""

    else:
        # Multi-year comparison (optimized)
        years_list = sorted(data.keys())
        prompt = f"""Compare les finances : {', '.join(years_list)}

"""
        for year, year_data in sorted(data.items()):
            prompt += f"""**{year} :** Dépenses {year_data['total_expenses']}€, Revenus {year_data['total_income']}€, Solde {year_data['net_balance']}€
Top 3: {', '.join([f"{cat['name']} ({cat['total']}€)" for cat in year_data['categories'][:3]])}

"""

        prompt += """**Analyse :**
1. Évolution globale (1-2 phrases)
2. Changements majeurs par catégorie
3. 2 recommandations

Bref. Markdown."""

    return prompt


def call_claude_api(prompt, api_key=None):
    """
    Call Claude API with the given prompt
    Returns the analysis text or raises an exception
    """
    if not api_key:
        api_key = Config.ANTHROPIC_API_KEY

    if not api_key:
        raise ValueError("Clé API Anthropic manquante. Veuillez la configurer dans les paramètres.")

    try:
        client = anthropic.Anthropic(api_key=api_key)

        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2048,
            temperature=0.7,
            messages=[
                {"role": "user", "content": prompt}
            ],
            timeout=Config.AI_TIMEOUT
        )

        # Extract text from response
        if message.content and len(message.content) > 0:
            return message.content[0].text
        else:
            raise ValueError("Réponse vide de l'API Claude")

    except anthropic.AuthenticationError:
        raise ValueError("Clé API Anthropic invalide. Vérifiez votre configuration.")
    except anthropic.APITimeoutError:
        raise ValueError("Timeout : L'API Claude a mis trop de temps à répondre.")
    except anthropic.APIError as e:
        raise ValueError(f"Erreur API Claude : {str(e)}")
    except Exception as e:
        raise ValueError(f"Erreur lors de l'appel à Claude : {str(e)}")


def call_ollama_api(prompt, model=None):
    """
    Call Ollama API with the given prompt
    Returns the analysis text or raises an exception
    """
    import ollama

    if not model:
        model = Config.OLLAMA_MODEL

    try:
        # Create Ollama client with extended timeout for long-running analyses
        # 5 minutes should be enough for complex financial analysis on CPU
        client = ollama.Client(timeout=300.0)

        # Call Ollama API
        response = client.chat(
            model=model,
            messages=[
                {
                    'role': 'user',
                    'content': prompt
                }
            ],
            options={
                'temperature': 0.7,
                'num_predict': 2048,  # Max tokens
            }
        )

        # Extract text from response
        if response and 'message' in response and 'content' in response['message']:
            return response['message']['content']
        else:
            raise ValueError("Réponse vide de l'API Ollama")

    except ollama.ResponseError as e:
        raise ValueError(f"Erreur API Ollama : {str(e)}")
    except ConnectionError:
        raise ValueError("Impossible de se connecter à Ollama. Assurez-vous que le serveur Ollama est démarré (ollama serve).")
    except Exception as e:
        raise ValueError(f"Erreur lors de l'appel à Ollama : {str(e)}")


def analyze_with_ai(data, analysis_type='overview', provider=None, api_key=None):
    """
    Main function to analyze financial data with AI
    Routes to the appropriate provider (Claude or Ollama)

    Args:
        data: Financial data dict (single year or comparison)
        analysis_type: Type of analysis ('overview', 'recommendations', 'anomalies', or 'comparison')
        provider: AI provider to use ('claude' or 'ollama')
        api_key: API key (optional, will use config if not provided)

    Returns:
        Analysis text in Markdown format
    """
    if not provider:
        provider = Config.AI_PROVIDER

    # Create the prompt
    prompt = create_analysis_prompt(data, analysis_type)

    # Route to appropriate provider
    if provider == 'claude':
        return call_claude_api(prompt, api_key)
    elif provider == 'ollama':
        return call_ollama_api(prompt)
    else:
        raise ValueError(f"Provider '{provider}' non supporté. Utilisez 'claude' ou 'ollama'.")


def test_api_key(api_key, provider='claude', model=None):
    """
    Test if an API key is valid (for Claude) or if Ollama is accessible
    Returns True if valid, raises exception otherwise
    """
    if provider == 'claude':
        try:
            client = anthropic.Anthropic(api_key=api_key)
            # Make a minimal test call
            client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=10,
                messages=[{"role": "user", "content": "Test"}]
            )
            return True
        except anthropic.AuthenticationError:
            raise ValueError("Clé API invalide")
        except Exception as e:
            raise ValueError(f"Erreur lors du test : {str(e)}")
    elif provider == 'ollama':
        import ollama
        try:
            if not model:
                model = Config.OLLAMA_MODEL

            # Create client with timeout for test (30 seconds should be enough)
            client = ollama.Client(timeout=30.0)

            # Test connection by listing models
            models_response = client.list()

            # Extract model names from response
            available_models = []
            if hasattr(models_response, 'models'):
                # If it's an object with models attribute
                available_models = [m.model if hasattr(m, 'model') else str(m) for m in models_response.models]
            elif isinstance(models_response, dict) and 'models' in models_response:
                # If it's a dict
                for m in models_response['models']:
                    if isinstance(m, dict):
                        # Try different possible keys
                        name = m.get('model') or m.get('name') or m.get('id')
                        if name:
                            available_models.append(name)
                    else:
                        available_models.append(str(m))

            # Check if the specified model is available
            if available_models and model not in available_models:
                raise ValueError(f"Le modèle '{model}' n'est pas disponible. Modèles disponibles : {', '.join(available_models)}. Utilisez 'ollama pull {model}' pour le télécharger.")

            return True
        except ConnectionError:
            raise ValueError("Impossible de se connecter à Ollama. Assurez-vous que le serveur est démarré avec 'ollama serve'.")
        except KeyError as e:
            raise ValueError(f"Format de réponse inattendu d'Ollama : {str(e)}")
        except Exception as e:
            raise ValueError(f"Erreur lors du test Ollama : {str(e)}")
    else:
        raise NotImplementedError(f"Test non implémenté pour le provider '{provider}'")
