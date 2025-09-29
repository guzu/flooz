import hashlib

def calculate_transaction_hash(date, label, amount):
    """
    Calculate SHA256 hash for transaction using date, label, and amount.
    Used for duplicate detection during import.
    """
    hash_string = f"{date}{label}{amount}"
    return hashlib.sha256(hash_string.encode('utf-8')).hexdigest()