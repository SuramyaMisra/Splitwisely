from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from ..models import User
from .. import db

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST", "OPTIONS"])
def register():
    """
    Register a new user.
    Expects: { "name": "...", "email": "...", "password": "..." }
    Returns: user object + JWT token
    """
    data = request.get_json()

    # Validate all required fields are present
    if not data or not all(k in data for k in ["name", "email", "password"]):
        return jsonify({"error": "Name, email and password are required"}), 400

    # Check if email already exists
    if User.query.filter_by(email=data["email"].lower().strip()).first():
        return jsonify({"error": "Email already registered"}), 409

    # Validate password length
    if len(data["password"]) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    # Create user
    user = User(
        name=data["name"].strip(),
        email=data["email"].lower().strip(),
    )

    user.set_password(data["password"])

    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))

    return jsonify({
        "user": user.to_dict(),
        "token": token,
        "message": "Account created successfully"
    }), 201


@auth_bp.route("/login", methods=["POST", "OPTIONS"])
def login():
    """
    Login with email and password.
    Expects: { "email": "...", "password": "..." }
    Returns: user object + JWT token
    """
    data = request.get_json()

    if not data or not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=data["email"].lower().strip()).first()

    if not user or not user.check_password(data["password"]):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_access_token(identity=str(user.id))

    return jsonify({
        "user": user.to_dict(),
        "token": token,
        "message": "Login successful"
    }), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """
    Get the currently logged in user.
    Requires valid JWT token in Authorization header.
    """
    user_id = get_jwt_identity()
    user = User.query.get_or_404(int(user_id))

    return jsonify(user.to_dict()), 200