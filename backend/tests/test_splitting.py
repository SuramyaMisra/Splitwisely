from app.services.splitting import simplify_debts


def test_simplify_debts():

    balances = [
        {
            "user_id": 1,
            "user_name": "Rohan",
            "net_balance": 1400
        },
        {
            "user_id": 2,
            "user_name": "Ritam",
            "net_balance": -1000
        },
        {
            "user_id": 3,
            "user_name": "Pradeep",
            "net_balance": -400
        }
    ]

    result = simplify_debts(balances)

    assert len(result) == 2

    total = sum(t["amount"] for t in result)

    assert total == 1400