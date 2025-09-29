import sqlite3
from config import Config

def get_db_connection():
    conn = sqlite3.connect(Config.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()

    # Create transactions table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date DATE NOT NULL,
            label TEXT NOT NULL,
            amount REAL NOT NULL,
            category_id INTEGER,
            hash TEXT UNIQUE NOT NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id)
        )
    ''')

    # Create categories table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            color TEXT NOT NULL,
            icon TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Create categorization_rules table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS categorization_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pattern TEXT NOT NULL,
            category_id INTEGER NOT NULL,
            priority INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id)
        )
    ''')

    # Create indexes
    conn.execute('CREATE INDEX IF NOT EXISTS idx_date ON transactions(date)')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_hash ON transactions(hash)')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_category ON transactions(category_id)')

    # Insert default categories if not exist
    categories = [
        ('Alimentation', '#10b981'),
        ('Transport', '#3b82f6'),
        ('Logement', '#8b5cf6'),
        ('Santé', '#ef4444'),
        ('Loisirs', '#f59e0b'),
        ('Non catégorisé', '#6b7280')
    ]

    cursor = conn.cursor()
    for name, color in categories:
        cursor.execute('SELECT id FROM categories WHERE name = ?', (name,))
        if not cursor.fetchone():
            cursor.execute('INSERT INTO categories (name, color) VALUES (?, ?)', (name, color))

    # Insert default categorization rules
    rules = [
        ('CARREFOUR|AUCHAN|LECLERC', 'Alimentation', 10),
        ('SNCF|RATP|ESSENCE', 'Transport', 10),
        ('LOYER|EDF|EAU', 'Logement', 10)
    ]

    for pattern, category_name, priority in rules:
        cursor.execute('SELECT id FROM categories WHERE name = ?', (category_name,))
        category_row = cursor.fetchone()
        if category_row:
            category_id = category_row['id']
            cursor.execute('SELECT id FROM categorization_rules WHERE pattern = ?', (pattern,))
            if not cursor.fetchone():
                cursor.execute(
                    'INSERT INTO categorization_rules (pattern, category_id, priority) VALUES (?, ?, ?)',
                    (pattern, category_id, priority)
                )

    conn.commit()
    conn.close()