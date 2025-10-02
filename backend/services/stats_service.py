from models.database import get_db_connection
from datetime import datetime

class StatsService:
    @staticmethod
    def get_monthly_stats(year):
        """Get monthly spending stats for a given year"""
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT
                strftime('%m', date) as month,
                SUM(amount) as total_amount,
                COUNT(*) as transaction_count
            FROM transactions
            WHERE strftime('%Y', date) = ? AND amount > 0
            GROUP BY strftime('%m', date)
            ORDER BY month
        ''', (str(year),))

        rows = cursor.fetchall()
        conn.close()

        monthly_data = []
        month_names = [
            'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
            'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
        ]

        # Initialize all months with 0
        for i in range(1, 13):
            monthly_data.append({
                'month': month_names[i-1],
                'month_num': i,
                'amount': 0,
                'transaction_count': 0
            })

        # Fill in actual data
        for row in rows:
            month_num = int(row['month'])
            monthly_data[month_num - 1].update({
                'amount': float(row['total_amount']),
                'transaction_count': row['transaction_count']
            })

        return monthly_data

    @staticmethod
    def get_monthly_stats_by_category(year):
        """Get monthly spending stats by category for a given year"""
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get all categories with their colors
        cursor.execute('SELECT id, name, color FROM categories ORDER BY name')
        categories = {row['id']: {'name': row['name'], 'color': row['color']} for row in cursor.fetchall()}

        # Get monthly data by category
        cursor.execute('''
            SELECT
                strftime('%m', date) as month,
                category_id,
                SUM(amount) as total_amount
            FROM transactions
            WHERE strftime('%Y', date) = ? AND amount > 0
            GROUP BY strftime('%m', date), category_id
            ORDER BY month
        ''', (str(year),))

        rows = cursor.fetchall()
        conn.close()

        month_names = [
            'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
            'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
        ]

        # Initialize all months
        monthly_data = []
        for i in range(1, 13):
            month_entry = {
                'month': month_names[i-1],
                'month_num': i,
                'total': 0
            }
            # Initialize each category to 0
            for cat_id, cat_info in categories.items():
                month_entry[cat_info['name']] = 0
            monthly_data.append(month_entry)

        # Fill in actual data
        for row in rows:
            month_num = int(row['month'])
            category_id = row['category_id']
            amount = float(row['total_amount'])

            if category_id and category_id in categories:
                category_name = categories[category_id]['name']
                monthly_data[month_num - 1][category_name] = amount
                monthly_data[month_num - 1]['total'] += amount

        return {
            'data': monthly_data,
            'categories': [{'name': info['name'], 'color': info['color']} for info in categories.values()]
        }

    @staticmethod
    def get_category_stats(year):
        """Get spending stats by category for a given year"""
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT
                c.id,
                c.name,
                c.color,
                SUM(t.amount) as total_amount,
                COUNT(t.id) as transaction_count,
                AVG(t.amount) as avg_amount
            FROM categories c
            JOIN transactions t ON c.id = t.category_id
            WHERE strftime('%Y', t.date) = ? AND t.amount > 0
            GROUP BY c.id, c.name, c.color
            ORDER BY total_amount DESC
        ''', (str(year),))

        rows = cursor.fetchall()
        conn.close()

        # Calculate total for percentage
        total_spending = sum(row['total_amount'] for row in rows)

        category_data = []
        for row in rows:
            amount = float(row['total_amount'])
            percentage = (amount / total_spending * 100) if total_spending > 0 else 0

            category_data.append({
                'category_id': row['id'],
                'category_name': row['name'],
                'color': row['color'],
                'amount': amount,
                'percentage': round(percentage, 1),
                'transaction_count': row['transaction_count'],
                'avg_amount': round(float(row['avg_amount']), 2)
            })

        return category_data

    @staticmethod
    def get_year_summary(year):
        """Get summary stats for a given year"""
        conn = get_db_connection()
        cursor = conn.cursor()

        # Total spending (positive amounts)
        cursor.execute('''
            SELECT
                SUM(amount) as total_spending,
                COUNT(*) as spending_transactions
            FROM transactions
            WHERE strftime('%Y', date) = ? AND amount > 0
        ''', (str(year),))

        spending_row = cursor.fetchone()

        # Total income (negative amounts)
        cursor.execute('''
            SELECT
                SUM(ABS(amount)) as total_income,
                COUNT(*) as income_transactions
            FROM transactions
            WHERE strftime('%Y', date) = ? AND amount < 0
        ''', (str(year),))

        income_row = cursor.fetchone()

        # Most used category
        cursor.execute('''
            SELECT
                c.name as category_name,
                COUNT(t.id) as usage_count
            FROM categories c
            JOIN transactions t ON c.id = t.category_id
            WHERE strftime('%Y', t.date) = ?
            GROUP BY c.id, c.name
            ORDER BY usage_count DESC
            LIMIT 1
        ''', (str(year),))

        category_row = cursor.fetchone()

        # Average transaction
        cursor.execute('''
            SELECT AVG(ABS(amount)) as avg_transaction
            FROM transactions
            WHERE strftime('%Y', date) = ?
        ''', (str(year),))

        avg_row = cursor.fetchone()

        conn.close()

        return {
            'year': year,
            'total_spending': float(spending_row['total_spending'] or 0),
            'spending_transactions': spending_row['spending_transactions'] or 0,
            'total_income': float(income_row['total_income'] or 0),
            'income_transactions': income_row['income_transactions'] or 0,
            'net_balance': float(income_row['total_income'] or 0) - float(spending_row['total_spending'] or 0),
            'most_used_category': category_row['category_name'] if category_row else None,
            'avg_transaction': round(float(avg_row['avg_transaction'] or 0), 2),
            'total_transactions': (spending_row['spending_transactions'] or 0) + (income_row['income_transactions'] or 0)
        }

    @staticmethod
    def get_sankey_data(year):
        """Get Sankey diagram data with 3 columns: Total -> Categories -> Subcategories"""
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get total spending
        cursor.execute('''
            SELECT SUM(amount) as total
            FROM transactions
            WHERE strftime('%Y', date) = ? AND amount > 0
        ''', (str(year),))
        total_spending = float(cursor.fetchone()['total'] or 0)

        # Get spending by category
        cursor.execute('''
            SELECT
                c.id as category_id,
                c.name as category,
                c.color as category_color,
                SUM(t.amount) as total
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE strftime('%Y', t.date) = ? AND t.amount > 0
            GROUP BY c.id
            HAVING total > 0
            ORDER BY total DESC
        ''', (str(year),))
        category_rows = cursor.fetchall()

        # Get spending by category and subcategory
        cursor.execute('''
            SELECT
                c.id as category_id,
                c.name as category,
                c.color as category_color,
                s.id as subcategory_id,
                s.name as subcategory,
                s.color as subcategory_color,
                SUM(t.amount) as total
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN subcategories s ON t.subcategory_id = s.id
            WHERE strftime('%Y', t.date) = ? AND t.amount > 0
            GROUP BY c.id, s.id
            HAVING total > 0
        ''', (str(year),))
        subcategory_rows = cursor.fetchall()

        conn.close()

        # Build Sankey structure
        nodes = []
        links = []
        node_index = 0

        # Node 0: Total
        nodes.append({
            'name': 'Total Dépenses',
            'color': '#8c70c7'
        })
        total_node_index = node_index
        node_index += 1

        # Category nodes and links from Total to Categories
        category_map = {}
        category_order = {}

        # Sort categories by total spending (descending)
        sorted_categories = sorted(category_rows, key=lambda x: float(x['total']), reverse=True)

        for idx, row in enumerate(sorted_categories):
            category_order[row['category_id']] = idx
            category = row['category'] or 'Non catégorisé'
            category_id = row['category_id']
            category_color = row['category_color'] or '#6b7280'
            total = float(row['total'])

            category_map[category_id] = node_index
            nodes.append({
                'name': category,
                'color': category_color,
                'value': total  # Add value for debugging
            })

            # Link from Total to Category
            links.append({
                'source': total_node_index,
                'target': node_index,
                'value': total,
                'color': category_color
            })

            node_index += 1

        # Subcategory nodes and links from Categories to Subcategories
        # Process subcategories grouped by category to keep them together
        for cat_row in sorted_categories:
            cat_id = cat_row['category_id']
            cat_name = cat_row['category'] or 'Non catégorisé'
            cat_color = cat_row['category_color'] or '#6b7280'
            cat_total = float(cat_row['total'])

            subcategories_total = 0

            # Get subcategories for this category
            cat_subcategories = [
                row for row in subcategory_rows
                if row['category_id'] == cat_id and row['subcategory']
            ]

            # Calculate subcategories total
            subcategories_total = sum(float(row['total']) for row in cat_subcategories)

            # Calculate uncategorized amount
            uncategorized_amount = cat_total - subcategories_total

            # Create a list of all items (subcategories + uncategorized) to sort together
            all_items = []

            for row in cat_subcategories:
                all_items.append({
                    'name': row['subcategory'],
                    'color': row['subcategory_color'] or cat_color,
                    'value': float(row['total'])
                })

            if uncategorized_amount > 0.01:
                # Use "Autres" if there are other subcategories, otherwise use category name
                uncategorized_name = 'Autres' if len(cat_subcategories) > 0 else cat_name
                all_items.append({
                    'name': uncategorized_name,
                    'color': cat_color,
                    'value': uncategorized_amount
                })

            # Sort all items by value DESC
            all_items.sort(key=lambda x: x['value'], reverse=True)

            # Add sorted nodes and links
            for item in all_items:
                nodes.append({
                    'name': item['name'],
                    'color': item['color'],
                    'value': item['value']
                })

                links.append({
                    'source': category_map[cat_id],
                    'target': node_index,
                    'value': item['value'],
                    'color': item['color']
                })

                node_index += 1

        return {
            'nodes': nodes,
            'links': links,
            'total': total_spending
        }

    @staticmethod
    def get_available_years():
        """Get list of years with transactions"""
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT DISTINCT strftime('%Y', date) as year
            FROM transactions
            ORDER BY year DESC
        ''')

        rows = cursor.fetchall()
        conn.close()

        return [int(row['year']) for row in rows]