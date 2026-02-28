from collections import defaultdict
from decimal import Decimal, ROUND_HALF_UP


def calculate_net_balances(group_id, db, Expense, ExpenseSplit, GroupMember, User):
    members = GroupMember.query.filter_by(group_id=group_id).all()
    member_ids = [m.user_id for m in members]
    balances = defaultdict(Decimal)

    expenses = Expense.query.filter_by(group_id=group_id).all()
    for expense in expenses:
        balances[expense.paid_by] += Decimal(str(expense.amount))
        for split in expense.splits:
            if not split.is_settled:
                balances[split.user_id] -= Decimal(str(split.amount_owed))

    result = []
    for user_id in member_ids:
        user = User.query.get(user_id)
        net = balances.get(user_id, Decimal("0"))
        result.append({
            "user_id": user_id,
            "user_name": user.name,
            "net_balance": float(net.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        })
    return result


def simplify_debts(balances):
    creditors = []
    debtors = []

    for entry in balances:
        net = Decimal(str(entry["net_balance"]))
        if net > Decimal("0.01"):
            creditors.append([net, entry["user_id"], entry["user_name"]])
        elif net < Decimal("-0.01"):
            debtors.append([abs(net), entry["user_id"], entry["user_name"]])

    transactions = []
    creditors.sort(key=lambda x: x[0], reverse=True)
    debtors.sort(key=lambda x: x[0], reverse=True)

    while creditors and debtors:
        credit_amount, creditor_id, creditor_name = creditors[0]
        debt_amount, debtor_id, debtor_name = debtors[0]

        settle_amount = min(credit_amount, debt_amount).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        transactions.append({
            "from_user_id": debtor_id,
            "from_user_name": debtor_name,
            "to_user_id": creditor_id,
            "to_user_name": creditor_name,
            "amount": float(settle_amount),
        })

        creditors[0][0] -= settle_amount
        debtors[0][0] -= settle_amount

        if creditors[0][0] <= Decimal("0.01"):
            creditors.pop(0)
        if debtors[0][0] <= Decimal("0.01"):
            debtors.pop(0)

        creditors.sort(key=lambda x: x[0], reverse=True)
        debtors.sort(key=lambda x: x[0], reverse=True)

    return transactions