from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from ..models import Group, GroupMember, Expense, ExpenseSplit, User
from ..services.splitting import calculate_net_balances, simplify_debts
from ..services.ai_service import generate_group_summary
from .. import db

ai_bp = Blueprint("ai", __name__)


@ai_bp.route("/groups/<int:group_id>/summary", methods=["GET"])
@jwt_required()
def get_group_summary(group_id):
    group = Group.query.get_or_404(group_id)

    members = GroupMember.query.filter_by(group_id=group_id).all()
    members_data = [m.to_dict() for m in members]

    expenses = Expense.query.filter_by(group_id=group_id).order_by(
        Expense.date.desc()
    ).all()
    expenses_data = [e.to_dict() for e in expenses]

    balances = calculate_net_balances(
        group_id, db, Expense, ExpenseSplit, GroupMember, User
    )
    transactions = simplify_debts(balances)

    summary = generate_group_summary(
        group_name=group.name,
        members=members_data,
        expenses=expenses_data,
        balances=balances,
        transactions=transactions,
    )

    return jsonify({"summary": summary}), 200