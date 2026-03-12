from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from .. import db
from ..models import User

users_bp = Blueprint("users", __name__)


@users_bp.route("/", methods=["GET"])
@jwt_required()
def get_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users]), 200


@users_bp.route("/", methods=["POST"])
@jwt_required()
def create_user():
    data = request.get_json()

    if not data or not data.get("name") or not data.get("email"):
        return jsonify({"error": "Name and email are required"}), 400

    existing = User.query.filter_by(email=data["email"].lower().strip()).first()
    if existing:
        return jsonify({"error": "A user with this email already exists"}), 409

    user = User(
        name=data["name"].strip(),
        email=data["email"].lower().strip(),
    )
    db.session.add(user)
    db.session.commit()

    return jsonify(user.to_dict()), 201


@users_bp.route("/<int:user_id>", methods=["GET"])
@jwt_required()
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict()), 200