from datetime import datetime
from models.database import get_db_connection

class Transaction:
    def __init__(self, id=None, date=None, label=None, amount=None, category_id=None, subcategory_id=None, hash=None, notes=None, operation_date=None, created_at=None):
        self.id = id
        self.date = date
        self.label = label
        self.amount = amount
        self.category_id = category_id
        self.subcategory_id = subcategory_id
        self.hash = hash
        self.notes = notes
        self.operation_date = operation_date
        self.created_at = created_at

    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date,
            'label': self.label,
            'amount': self.amount,
            'category_id': self.category_id,
            'subcategory_id': self.subcategory_id,
            'hash': self.hash,
            'notes': self.notes,
            'operation_date': self.operation_date,
            'created_at': self.created_at
        }

    @staticmethod
    def create(date, label, amount, category_id=None, subcategory_id=None, hash=None, notes=None, operation_date=None):
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO transactions (date, label, amount, category_id, subcategory_id, hash, notes, operation_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (date, label, amount, category_id, subcategory_id, hash, notes, operation_date))

        transaction_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return Transaction.get_by_id(transaction_id)

    @staticmethod
    def get_by_id(transaction_id):
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM transactions WHERE id = ?', (transaction_id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            # Handle subcategory_id safely in case column doesn't exist yet
            try:
                subcategory_id = row['subcategory_id']
            except (KeyError, IndexError):
                subcategory_id = None

            # Handle operation_date safely in case column doesn't exist yet
            try:
                operation_date = row['operation_date']
            except (KeyError, IndexError):
                operation_date = None

            return Transaction(
                id=row['id'],
                date=row['date'],
                label=row['label'],
                amount=row['amount'],
                category_id=row['category_id'],
                subcategory_id=subcategory_id,
                hash=row['hash'],
                notes=row['notes'],
                operation_date=operation_date,
                created_at=row['created_at']
            )
        return None

    @staticmethod
    def get_all(year=None):
        conn = get_db_connection()
        cursor = conn.cursor()

        if year:
            cursor.execute('''
                SELECT t.*, c.name as category_name, c.color as category_color,
                       s.name as subcategory_name
                FROM transactions t
                LEFT JOIN categories c ON t.category_id = c.id
                LEFT JOIN subcategories s ON t.subcategory_id = s.id
                WHERE strftime('%Y', t.date) = ?
                ORDER BY t.date DESC
            ''', (str(year),))
        else:
            cursor.execute('''
                SELECT t.*, c.name as category_name, c.color as category_color,
                       s.name as subcategory_name
                FROM transactions t
                LEFT JOIN categories c ON t.category_id = c.id
                LEFT JOIN subcategories s ON t.subcategory_id = s.id
                ORDER BY t.date DESC
            ''')

        rows = cursor.fetchall()
        conn.close()

        transactions = []
        for row in rows:
            # Handle subcategory fields safely
            try:
                subcategory_id = row['subcategory_id']
            except (KeyError, IndexError):
                subcategory_id = None

            try:
                subcategory_name = row['subcategory_name']
            except (KeyError, IndexError):
                subcategory_name = None

            # Handle operation_date safely
            try:
                operation_date = row['operation_date']
            except (KeyError, IndexError):
                operation_date = None

            transaction = Transaction(
                id=row['id'],
                date=row['date'],
                label=row['label'],
                amount=row['amount'],
                category_id=row['category_id'],
                subcategory_id=subcategory_id,
                hash=row['hash'],
                notes=row['notes'],
                operation_date=operation_date,
                created_at=row['created_at']
            )
            transaction_dict = transaction.to_dict()
            transaction_dict['category_name'] = row['category_name']
            transaction_dict['category_color'] = row['category_color']
            transaction_dict['subcategory_name'] = subcategory_name
            transactions.append(transaction_dict)

        return transactions

    @staticmethod
    def update(transaction_id, date=None, label=None, amount=None, category_id=None, subcategory_id=None, notes='__UNSET__'):
        conn = get_db_connection()
        cursor = conn.cursor()

        fields = []
        values = []

        if date is not None:
            fields.append('date = ?')
            values.append(date)
        if label is not None:
            fields.append('label = ?')
            values.append(label)
        if amount is not None:
            fields.append('amount = ?')
            values.append(amount)
        if category_id is not None:
            fields.append('category_id = ?')
            values.append(category_id)
        if subcategory_id is not None:
            fields.append('subcategory_id = ?')
            values.append(subcategory_id)
        if notes != '__UNSET__':
            fields.append('notes = ?')
            values.append(notes)

        if fields:
            values.append(transaction_id)
            query = f"UPDATE transactions SET {', '.join(fields)} WHERE id = ?"
            cursor.execute(query, values)
            conn.commit()

        conn.close()
        return Transaction.get_by_id(transaction_id)

    @staticmethod
    def delete(transaction_id):
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('DELETE FROM transactions WHERE id = ?', (transaction_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()

        return deleted

    @staticmethod
    def exists_by_hash(hash_value):
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT id FROM transactions WHERE hash = ?', (hash_value,))
        exists = cursor.fetchone() is not None
        conn.close()

        return exists