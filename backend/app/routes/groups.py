from flask import Blueprint, request, jsonify
from .. import db
from ..models import Group, GroupMember, User

groups_bp = Blueprint("groups", __name__)


@groups_bp.route("/", methods=["GET"])
def get_groups():
    groups = Group.query.order_by(Group.created_at.desc()).all()
    return jsonify([g.to_dict() for g in groups]), 200


@groups_bp.route("/", methods=["POST"])
def create_group():
    data = request.get_json()

    if not data or not data.get("name"):
        return jsonify({"error": "Group name is required"}), 400

    group = Group(
        name=data["name"].strip(),
        description=data.get("description", "").strip(),
    )
    db.session.add(group)
    db.session.commit()

    return jsonify(group.to_dict()), 201


@groups_bp.route("/<int:group_id>", methods=["GET"])
def get_group(group_id):
    group = Group.query.get_or_404(group_id)
    members = GroupMember.query.filter_by(group_id=group_id).all()
    data = group.to_dict()
    data["members"] = [m.to_dict() for m in members]
    return jsonify(data), 200


@groups_bp.route("/<int:group_id>/members", methods=["POST"])
def add_member(group_id):
    Group.query.get_or_404(group_id)
    data = request.get_json()

    if not data or not data.get("user_id"):
        return jsonify({"error": "user_id is required"}), 400

    user = User.query.get(data["user_id"])
    if not user:
        return jsonify({"error": "User not found"}), 404

    existing = GroupMember.query.filter_by(
        group_id=group_id, user_id=data["user_id"]
    ).first()
    if existing:
        return jsonify({"error": "User is already a member of this group"}), 409

    member = GroupMember(group_id=group_id, user_id=data["user_id"])
    db.session.add(member)
    db.session.commit()

    return jsonify(member.to_dict()), 201


@groups_bp.route("/<int:group_id>/members", methods=["GET"])
def get_members(group_id):
    Group.query.get_or_404(group_id)
    members = GroupMember.query.filter_by(group_id=group_id).all()
    return jsonify([m.to_dict() for m in members]), 200