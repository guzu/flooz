from flask import Flask
from flask_cors import CORS
from config import Config
from models.database import init_db

def create_app():
    app = Flask(__name__)
    CORS(app)

    Config.init_app()
    init_db()

    from routes.transactions import transactions_bp
    from routes.categories import categories_bp
    from routes.subcategories import subcategories_bp
    from routes.import_routes import import_bp
    from routes.export_routes import export_bp
    from routes.stats import stats_bp

    app.register_blueprint(transactions_bp, url_prefix='/api')
    app.register_blueprint(categories_bp, url_prefix='/api')
    app.register_blueprint(subcategories_bp, url_prefix='/api')
    app.register_blueprint(import_bp, url_prefix='/api')
    app.register_blueprint(export_bp, url_prefix='/api')
    app.register_blueprint(stats_bp, url_prefix='/api')

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)