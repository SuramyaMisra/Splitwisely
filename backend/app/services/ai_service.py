import os
import requests

OPENROUTER_API_KEY = os.environ.get("OPENAI_API_KEY", "")

FREE_MODELS = [
    "deepseek/deepseek-chat-v3-0324:free",
    "deepseek/deepseek-r1:free",
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.1-8b-instruct:free",
    "qwen/qwen-2.5-7b-instruct:free",
]


def generate_group_summary(group_name, members, expenses, balances, transactions):
    member_names = [m["user_name"] for m in members]

    expense_lines = [
        f"- {exp['description']}: Rs.{exp['amount']} paid by {exp['paid_by_name']}"
        for exp in expenses
    ]
    balance_lines = [
        f"- {b['user_name']} {'is owed' if b['net_balance'] > 0 else 'owes'} Rs.{abs(b['net_balance']):.2f}"
        for b in balances
    ]
    transaction_lines = [
        f"- {t['from_user_name']} should pay {t['to_user_name']} Rs.{t['amount']:.2f}"
        for t in transactions
    ]

    prompt = f"""
You are a helpful financial assistant for a group expense app.

Group: {group_name}
Members: {', '.join(member_names)}

Expenses:
{chr(10).join(expense_lines) if expense_lines else 'No expenses yet.'}

Current balances:
{chr(10).join(balance_lines) if balance_lines else 'All settled.'}

Minimum transactions to settle:
{chr(10).join(transaction_lines) if transaction_lines else 'Nothing to settle.'}

Please provide:
1. A friendly summary of how this group has been spending
2. Who has contributed the most
3. Clear settlement instructions
4. One practical tip for the group

Keep it conversational, helpful and concise.
"""

    for model in FREE_MODELS:
        try:
            response = requests.post(
                url="https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a helpful financial assistant for group expense management."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "max_tokens": 500,
                },
                timeout=15
            )

            data = response.json()

            if "choices" in data and data["choices"][0]["message"]["content"]:
                return data["choices"][0]["message"]["content"]

        except Exception:
            continue

    return "AI summary temporarily unavailable. All free models are currently rate limited. Please try again in a few minutes."