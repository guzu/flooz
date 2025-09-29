from models.database import get_db_connection

class CategoryService:
    @staticmethod
    def get_all_categories():
        """Get all categories with transaction counts"""
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT
                c.*,
                COUNT(t.id) as transaction_count
            FROM categories c
            LEFT JOIN transactions t ON c.id = t.category_id
            GROUP BY c.id
            ORDER BY c.name
        ''')

        rows = cursor.fetchall()
        conn.close()

        categories = []
        for row in rows:
            categories.append({
                'id': row['id'],
                'name': row['name'],
                'color': row['color'],
                'icon': row['icon'],
                'transaction_count': row['transaction_count'],
                'created_at': row['created_at']
            })

        return categories

    @staticmethod
    def get_category_by_id(category_id):
        """Get a single category by ID"""
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM categories WHERE id = ?', (category_id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            return {
                'id': row['id'],
                'name': row['name'],
                'color': row['color'],
                'icon': row['icon'],
                'created_at': row['created_at']
            }
        return None

    @staticmethod
    def create_category(name, color, icon=None):
        """Create a new category"""
        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            cursor.execute(
                'INSERT INTO categories (name, color, icon) VALUES (?, ?, ?)',
                (name, color, icon)
            )
            category_id = cursor.lastrowid
            conn.commit()
            conn.close()

            return CategoryService.get_category_by_id(category_id)

        except Exception as e:
            conn.close()
            raise e

    @staticmethod
    def update_category(category_id, name=None, color=None, icon=None):
        """Update an existing category"""
        conn = get_db_connection()
        cursor = conn.cursor()

        fields = []
        values = []

        if name is not None:
            fields.append('name = ?')
            values.append(name)
        if color is not None:
            fields.append('color = ?')
            values.append(color)
        if icon is not None:
            fields.append('icon = ?')
            values.append(icon)

        if fields:
            values.append(category_id)
            query = f"UPDATE categories SET {', '.join(fields)} WHERE id = ?"
            cursor.execute(query, values)
            conn.commit()

        conn.close()
        return CategoryService.get_category_by_id(category_id)

    @staticmethod
    def delete_category(category_id):
        """Delete a category (only if no transactions are using it)"""
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if category is in use
        cursor.execute('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?', (category_id,))
        count = cursor.fetchone()['count']

        if count > 0:
            conn.close()
            raise ValueError(f"Cannot delete category: {count} transactions are using it")

        cursor.execute('DELETE FROM categories WHERE id = ?', (category_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()

        return deleted

    @staticmethod
    def get_categorization_rules():
        """Get all categorization rules"""
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT r.*, c.name as category_name, c.color as category_color
            FROM categorization_rules r
            JOIN categories c ON r.category_id = c.id
            ORDER BY r.priority DESC, r.created_at DESC
        ''')

        rows = cursor.fetchall()
        conn.close()

        rules = []
        for row in rows:
            rules.append({
                'id': row['id'],
                'pattern': row['pattern'],
                'category_id': row['category_id'],
                'category_name': row['category_name'],
                'category_color': row['category_color'],
                'priority': row['priority'],
                'created_at': row['created_at']
            })

        return rules

    @staticmethod
    def create_categorization_rule(pattern, category_id, priority=0):
        """Create a new categorization rule"""
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            'INSERT INTO categorization_rules (pattern, category_id, priority) VALUES (?, ?, ?)',
            (pattern, category_id, priority)
        )
        rule_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return rule_id

    @staticmethod
    def delete_categorization_rule(rule_id):
        """Delete a categorization rule"""
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('DELETE FROM categorization_rules WHERE id = ?', (rule_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()

        return deleted