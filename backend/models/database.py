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

    # Create subcategories table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS subcategories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category_id INTEGER NOT NULL,
            color TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id),
            UNIQUE(name, category_id)
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

    # Add subcategory_id column to transactions table if it doesn't exist
    try:
        conn.execute('ALTER TABLE transactions ADD COLUMN subcategory_id INTEGER REFERENCES subcategories(id)')
        print("Added subcategory_id column to transactions table")
    except Exception as e:
        if "duplicate column name" not in str(e).lower():
            print(f"Could not add subcategory_id column: {e}")

    # Add operation_date column to transactions table if it doesn't exist
    try:
        conn.execute('ALTER TABLE transactions ADD COLUMN operation_date DATE')
        print("Added operation_date column to transactions table")
    except Exception as e:
        if "duplicate column name" not in str(e).lower():
            print(f"Could not add operation_date column: {e}")

    # Create indexes
    conn.execute('CREATE INDEX IF NOT EXISTS idx_date ON transactions(date)')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_hash ON transactions(hash)')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_category ON transactions(category_id)')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_subcategory ON transactions(subcategory_id)')

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

    # Insert default subcategories
    subcategories_data = [
        # Alimentation subcategories
        ('Courses', 'Alimentation'),
        ('Restaurant', 'Alimentation'),
        ('Boulangerie', 'Alimentation'),
        ('Livraison', 'Alimentation'),

        # Transport subcategories
        ('Transports en commun', 'Transport'),
        ('Carburant', 'Transport'),
        ('Parking', 'Transport'),
        ('Taxi/VTC', 'Transport'),

        # Logement subcategories
        ('Loyer', 'Logement'),
        ('Électricité', 'Logement'),
        ('Gaz', 'Logement'),
        ('Internet', 'Logement'),
        ('Assurance habitation', 'Logement'),

        # Loisirs subcategories
        ('Cinéma', 'Loisirs'),
        ('Sport', 'Loisirs'),
        ('Sortie', 'Loisirs'),
        ('Voyage', 'Loisirs'),

        # Santé subcategories
        ('Médecin', 'Santé'),
        ('Pharmacie', 'Santé'),
        ('Dentiste', 'Santé'),
        ('Mutuelle', 'Santé'),
    ]

    for subcategory_name, category_name in subcategories_data:
        cursor.execute('SELECT id FROM categories WHERE name = ?', (category_name,))
        category_row = cursor.fetchone()
        if category_row:
            category_id = category_row['id']
            cursor.execute('SELECT id FROM subcategories WHERE name = ? AND category_id = ?', (subcategory_name, category_id))
            if not cursor.fetchone():
                cursor.execute('INSERT INTO subcategories (name, category_id) VALUES (?, ?)', (subcategory_name, category_id))

    conn.commit()
    conn.close()