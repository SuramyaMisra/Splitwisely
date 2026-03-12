import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)

    from .config import config
    app.config.from_object(config["development"])

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    allowed_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}})
    from . import models

    from .routes.users import users_bp
    from .routes.groups import groups_bp
    from .routes.expenses import expenses_bp
    from .routes.ai import ai_bp
    from .routes.auth import auth_bp

    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(groups_bp, url_prefix="/api/groups")
    app.register_blueprint(expenses_bp, url_prefix="/api")
    app.register_blueprint(ai_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")

    @app.route("/api/health")
    def health():
        return {"status": "ok", "message": "API is running"}, 200

    return app