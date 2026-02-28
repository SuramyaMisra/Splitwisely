from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from flask import Blueprint, request, jsonify
from .. import db
from ..models import Group, GroupMember, Expense, ExpenseSplit, User

expenses_bp = Blueprint("expenses", __name__)


@expenses_bp.route("/groups/<int:group_id>/expenses", methods=["GET"])
def get_expenses(group_id):
    Group.query.get_or_404(group_id)
    expenses = (
        Expense.query.filter_by(group_id=group_id)
        .order_by(Expense.date.desc(), Expense.created_at.desc())
        .all()
    )
    return jsonify([e.to_dict() for e in expenses]), 200


@expenses_bp.route("/groups/<int:group_id>/expenses", methods=["POST"])
def add_expense(group_id):
    Group.query.get_or_404(group_id)
    data = request.get_json()

    for field in ["paid_by", "description", "amount"]:
        if not data or field not in data:
            return jsonify({"error": f"'{field}' is required"}), 400

    paid_by_user = User.query.get(data["paid_by"])
    if not paid_by_user:
        return jsonify({"error": "Paying user not found"}), 404

    payer_membership = GroupMember.query.filter_by(
        group_id=group_id, user_id=data["paid_by"]
    ).first()
    if not payer_membership:
        return jsonify({"error": "Paying user is not a member of this group"}), 400

    amount = Decimal(str(data["amount"]))
    if amount <= 0:
        return jsonify({"error": "Amount must be greater than 0"}), 400

    members = GroupMember.query.filter_by(group_id=group_id).all()
    split_user_ids = [m.user_id for m in members]

    per_person = (amount / Decimal(str(len(split_user_ids)))).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )

    expense_date = datetime.utcnow().date()
    if data.get("date"):
        try:
            expense_date = datetime.strptime(data["date"], "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    expense = Expense(
        group_id=group_id,
        paid_by=data["paid_by"],
        description=data["description"].strip(),
        amount=amount,
        date=expense_date,
    )
    db.session.add(expense)
    db.session.flush()

    for user_id in split_user_ids:
        split = ExpenseSplit(
            expense_id=expense.id,
            user_id=user_id,
            amount_owed=per_person,
            is_settled=False,
        )
        db.session.add(split)

    db.session.commit()
    return jsonify(expense.to_dict()), 201


@expenses_bp.route("/groups/<int:group_id>/balances", methods=["GET"])
def get_balances(group_id):
    from ..services.splitting import calculate_net_balances, simplify_debts
    Group.query.get_or_404(group_id)
    balances = calculate_net_balances(group_id, db, Expense, ExpenseSplit, GroupMember, User)
    transactions = simplify_debts(balances)
    return jsonify({
        "balances": balances,
        "suggested_transactions": transactions,
    }), 200


@expenses_bp.route("/groups/<int:group_id>/settle", methods=["POST"])
def settle_debt(group_id):
    Group.query.get_or_404(group_id)
    data = request.get_json()

    if not data or not data.get("from_user_id") or not data.get("to_user_id"):
        return jsonify({"error": "from_user_id and to_user_id are required"}), 400

    expenses_paid_by_to_user = Expense.query.filter_by(
        group_id=group_id, paid_by=data["to_user_id"]
    ).all()

    settled_count = 0
    for expense in expenses_paid_by_to_user:
        for split in expense.splits:
            if split.user_id == data["from_user_id"] and not split.is_settled:
                split.is_settled = True
                split.settled_at = datetime.utcnow()
                settled_count += 1

    db.session.commit()
    return jsonify({
        "message": f"Successfully settled {settled_count} split(s)",
        "settled_count": settled_count,
    }), 200