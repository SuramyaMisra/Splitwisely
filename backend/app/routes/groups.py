from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..models import Group, GroupMember, User, Expense, ExpenseSplit
from .. import db

groups_bp = Blueprint("groups", __name__)


@groups_bp.route("/", methods=["GET"])
@jwt_required()
def get_groups():
    groups = Group.query.order_by(Group.created_at.desc()).all()
    return jsonify([g.to_dict() for g in groups]), 200


@groups_bp.route("/", methods=["POST"])
@jwt_required()
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
@jwt_required()
def get_group(group_id):
    group = Group.query.get_or_404(group_id)
    members = GroupMember.query.filter_by(group_id=group_id).all()
    group_data = group.to_dict()
    group_data["members"] = [m.to_dict() for m in members]
    return jsonify(group_data), 200


@groups_bp.route("/<int:group_id>/members", methods=["POST"])
@jwt_required()
def add_member(group_id):
    Group.query.get_or_404(group_id)
    data = request.get_json()

    if not data or not data.get("user_id"):
        return jsonify({"error": "user_id is required"}), 400

    existing = GroupMember.query.filter_by(
        group_id=group_id, user_id=data["user_id"]
    ).first()
    if existing:
        return jsonify({"error": "User is already a member"}), 409

    member = GroupMember(group_id=group_id, user_id=data["user_id"])
    db.session.add(member)
    db.session.commit()

    return jsonify(member.to_dict()), 201


@groups_bp.route("/<int:group_id>/members", methods=["GET"])
@jwt_required()
def get_members(group_id):
    Group.query.get_or_404(group_id)
    members = GroupMember.query.filter_by(group_id=group_id).all()
    return jsonify([m.to_dict() for m in members]), 200


@groups_bp.route("/<int:group_id>/members/<int:user_id>", methods=["DELETE"])
@jwt_required()
def remove_member(group_id, user_id):
    member = GroupMember.query.filter_by(
        group_id=group_id,
        user_id=user_id
    ).first_or_404()

    unsettled = ExpenseSplit.query.join(Expense).filter(
        Expense.group_id == group_id,
        ExpenseSplit.user_id == user_id,
        ExpenseSplit.is_settled == False
    ).first()

    if unsettled:
        return jsonify({
            "error": "Cannot remove member with unsettled expenses. Settle all debts first."
        }), 400

    db.session.delete(member)
    db.session.commit()

    return jsonify({"message": "Member removed from group"}), 200

@groups_bp.route("/<int:group_id>", methods=["PUT"])
@jwt_required()
def update_group(group_id):
    group = Group.query.get_or_404(group_id)
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    if "name" in data and data["name"].strip():
        group.name = data["name"].strip()

    if "description" in data:
        group.description = data.get("description", "").strip()

    db.session.commit()
    return jsonify(group.to_dict()), 200


@groups_bp.route("/<int:group_id>", methods=["DELETE"])
@jwt_required()
def delete_group(group_id):
    group = Group.query.get_or_404(group_id)

    # Delete in correct order to avoid foreign key errors
    # 1. Get all expense IDs for this group
    expenses = Expense.query.filter_by(group_id=group_id).all()

    # 2. Delete all splits for each expense
    for expense in expenses:
        ExpenseSplit.query.filter_by(expense_id=expense.id).delete()

    # 3. Delete all expenses
    Expense.query.filter_by(group_id=group_id).delete()

    # 4. Delete all members
    GroupMember.query.filter_by(group_id=group_id).delete()

    # 5. Delete the group itself
    db.session.delete(group)
    db.session.commit()

    return jsonify({"message": f"Group '{group.name}' deleted successfully"}), 200