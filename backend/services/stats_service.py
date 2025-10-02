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
            ORDER BY c.id, total DESC
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
        for row in category_rows:
            category = row['category'] or 'Non catégorisé'
            category_id = row['category_id']
            category_color = row['category_color'] or '#6b7280'
            total = float(row['total'])

            category_map[category_id] = node_index
            nodes.append({
                'name': category,
                'color': category_color
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
        for row in subcategory_rows:
            category_id = row['category_id']
            category = row['category'] or 'Non catégorisé'
            subcategory = row['subcategory']
            category_color = row['category_color'] or '#6b7280'
            subcategory_color = row['subcategory_color'] or category_color
            total = float(row['total'])

            if subcategory:
                # Add subcategory node
                nodes.append({
                    'name': subcategory,
                    'color': subcategory_color
                })

                # Link from Category to Subcategory
                links.append({
                    'source': category_map[category_id],
                    'target': node_index,
                    'value': total,
                    'color': subcategory_color
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