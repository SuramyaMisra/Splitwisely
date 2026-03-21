import os
import re
import json
import base64
import requests
from datetime import datetime, timedelta

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"


def _call_groq(system_prompt, user_prompt, max_tokens=500):
    """Call Groq API — completely free, 14400 requests/day, works in India."""
    try:
        response = requests.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_prompt},
                ],
                "max_tokens": max_tokens,
                "temperature": 0.3,
            },
            timeout=20,
        )
        data = response.json()
        if "choices" in data:
            return data["choices"][0]["message"]["content"].strip()
        print("GROQ ERROR:", json.dumps(data, indent=2))
        return None
    except Exception as e:
        print("GROQ EXCEPTION:", str(e))
        return None


def generate_group_summary(group_name, members, expenses, balances, transactions):
    """Generate AI summary using Groq. Falls back to rule-based if API fails."""
    member_names = [m["user_name"] for m in members]
    expense_lines = [
        f"- {e['description']}: Rs.{e['amount']} paid by {e['paid_by_name']}"
        for e in expenses
    ]
    balance_lines = [
        f"- {b['user_name']} {'is owed' if b['net_balance'] > 0 else 'owes'} Rs.{abs(b['net_balance']):.2f}"
        for b in balances
    ]
    transaction_lines = [
        f"- {t['from_user_name']} should pay {t['to_user_name']} Rs.{t['amount']:.2f}"
        for t in transactions
    ]

    system_prompt = "You are a friendly financial assistant for SplitWisely, a group expense splitting app. Features available: add expenses, split equally, track balances, settle debts, AI summary. Do NOT mention features that don't exist like messaging, notifications, or chat. Be concise, warm and helpful."

    user_prompt = f"""Analyze this group's expenses and give a helpful summary.

Group: {group_name}
Members: {', '.join(member_names)}

Expenses:
{chr(10).join(expense_lines) if expense_lines else 'No expenses yet.'}

Current balances:
{chr(10).join(balance_lines) if balance_lines else 'All settled.'}

Settlements needed:
{chr(10).join(transaction_lines) if transaction_lines else 'Nothing to settle.'}

Please provide:
1. A friendly summary of how this group has been spending
2. Who has contributed the most
3. Clear settlement instructions
4. One practical tip for the group

Keep it conversational and concise."""

    result = _call_groq(system_prompt, user_prompt, max_tokens=500)

    if result:
        return result

    # Rule-based fallback if Groq fails
    return _rule_based_summary(
        group_name, member_names, expenses, balances, transactions
    )


def _rule_based_summary(group_name, member_names, expenses, balances, transactions):
    """Fallback summary without any API."""
    if not expenses:
        return f"No expenses recorded in {group_name} yet. Add your first expense to get started!"

    total = sum(e["amount"] for e in expenses)
    top_payer = max(expenses, key=lambda e: e["amount"])
    settled = not transactions

    balance_strs = []
    for b in balances:
        if b["net_balance"] > 0:
            balance_strs.append(f"{b['user_name']} is owed ₹{b['net_balance']:.2f}")
        elif b["net_balance"] < 0:
            balance_strs.append(f"{b['user_name']} owes ₹{abs(b['net_balance']):.2f}")

    settlement_strs = [
        f"{t['from_user_name']} → {t['to_user_name']}: ₹{t['amount']:.2f}"
        for t in transactions
    ]

    return f"""📊 {group_name} — Expense Summary

💰 Total spent: ₹{total:.2f} across {len(expenses)} expense(s) by {len(member_names)} members.

🏆 Biggest contribution: {top_payer['paid_by_name']} paid ₹{top_payer['amount']:.2f} for {top_payer['description']}.

⚖️ Current balances:
{chr(10).join(balance_strs) if balance_strs else 'Everyone is even!'}

{"✅ All settled up! No payments needed." if settled else f"💸 To settle up ({len(transactions)} transaction(s)):{chr(10)}{chr(10).join(settlement_strs)}"}

💡 Tip: Use the Settle Up section to mark payments as done and keep balances accurate."""


def parse_expense_text(text, member_names):
    """
    Parse natural language expense using Groq AI.
    Example: 'Rahul paid 500 for dinner last night'
    """
    today = datetime.utcnow().date()
    yesterday = (datetime.utcnow() - timedelta(days=1)).date()

    system_prompt = """You are an expense parser. Extract expense details from natural language.
You MUST respond with ONLY a valid JSON object — no explanation, no markdown, no backticks, nothing else.
Just the raw JSON."""

    user_prompt = f"""Extract expense details from: "{text}"

Group members (match paid_by_name exactly to one of these): {', '.join(member_names)}
Today's date: {today.isoformat()}
Yesterday's date: {yesterday.isoformat()}

Rules:
- paid_by_name must exactly match one of the group members listed above (case insensitive). If no match, use null.
- "last night" or "yesterday" means date = {yesterday.isoformat()}
- "today" or no date mentioned means date = {today.isoformat()}
- amount must be a number, not a string
- description should be 1-3 words describing what the expense was for

Respond with ONLY this JSON and nothing else:
{{"description": "dinner", "amount": 500.00, "paid_by_name": "Rahul", "date": "{today.isoformat()}"}}"""

    result = _call_groq(system_prompt, user_prompt, max_tokens=150)

    if not result:
        return _rule_based_parse(text, member_names)

    try:
        clean = result.strip()

        # Strip markdown fences if model adds them
        if "```" in clean:
            parts = clean.split("```")
            for part in parts:
                part = part.strip()
                if part.startswith("json"):
                    clean = part[4:].strip()
                    break
                if part.startswith("{"):
                    clean = part
                    break

        # Extract JSON even if there's surrounding text
        start = clean.find("{")
        end   = clean.rfind("}") + 1
        if start == -1 or end == 0:
            return _rule_based_parse(text, member_names)

        parsed = json.loads(clean[start:end])

        if not parsed.get("description") or not parsed.get("amount"):
            return _rule_based_parse(text, member_names)

        return {
            "description":  str(parsed.get("description", "")).strip().capitalize(),
            "amount":       float(parsed.get("amount", 0)),
            "paid_by_name": parsed.get("paid_by_name"),
            "date":         parsed.get("date") or today.isoformat(),
        }

    except (json.JSONDecodeError, ValueError, KeyError):
        return _rule_based_parse(text, member_names)


def _rule_based_parse(text, member_names):
    """
    Fallback parser using regex if Groq fails.
    Handles: 'Rahul paid 500 for dinner', '500 for lunch by Priya'
    """
    today     = datetime.utcnow().date()
    yesterday = (datetime.utcnow() - timedelta(days=1)).date()
    text_lower = text.lower().strip()

    # 1. Amount
    amount = None
    for pattern in [
        r'(?:rs\.?|inr|₹)\s*(\d+(?:\.\d+)?)',
        r'(\d+(?:\.\d+)?)\s*(?:rs\.?|inr|₹)',
        r'(\d+(?:\.\d+)?)',
    ]:
        m = re.search(pattern, text_lower)
        if m:
            amount = float(m.group(1))
            break

    if not amount:
        return None

    # 2. Payer
    paid_by_name = None
    for name in member_names:
        if name.lower() in text_lower:
            paid_by_name = name
            break
    if not paid_by_name:
        for pattern in [r'paid by\s+(\w+)', r'by\s+(\w+)']:
            m = re.search(pattern, text_lower)
            if m:
                found = m.group(1)
                for name in member_names:
                    if name.lower().startswith(found.lower()):
                        paid_by_name = name
                        break

    # 3. Description
    description = "Expense"
    m = re.search(r'for\s+([a-zA-Z][a-zA-Z\s]{1,25}?)(?:\s+(?:last|today|yesterday|by|paid|\d).*)?$', text_lower)
    if m:
        desc = m.group(1).strip()
        for word in ["last", "night", "today", "yesterday", "morning", "evening"]:
            desc = desc.replace(word, "").strip()
        if len(desc) > 1:
            description = desc.capitalize()

    # 4. Date
    date = today.isoformat()
    if any(w in text_lower for w in ["yesterday", "last night", "last evening"]):
        date = yesterday.isoformat()

    return {
        "description":  description,
        "amount":       amount,
        "paid_by_name": paid_by_name,
        "date":         date,
    }
    

def scan_bill_image(image_base64, image_type="image/jpeg"):
    """
    Send bill image to Groq Vision and extract expense details.
    image_base64: base64 encoded image string
    image_type: mime type like image/jpeg or image/png
    """
    today = datetime.utcnow().date()

    try:
        response = requests.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.2-11b-vision-preview",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{image_type};base64,{image_base64}"
                                }
                            },
                            {
                                "type": "text",
                                "text": f"""Look at this bill/receipt image and extract the expense details.
Respond with ONLY a JSON object, no explanation, no markdown:
{{"description": "what the bill is for in 1-3 words", "amount": total_amount_as_number, "date": "{today.isoformat()}"}}

Rules:
- amount must be the TOTAL amount as a number only, no currency symbols
- description should be short like "Dinner", "Groceries", "Petrol"
- if you cannot read the bill clearly, use null for that field"""
                            }
                        ]
                    }
                ],
                "max_tokens": 150,
                "temperature": 0.1,
            },
            timeout=30,
        )

        data = response.json()
        if "choices" not in data:
            print("GROQ VISION ERROR:", data)
            return None

        result = data["choices"][0]["message"]["content"].strip()

        # Clean and parse JSON
        start = result.find("{")
        end = result.rfind("}") + 1
        if start == -1 or end == 0:
            return None

        parsed = json.loads(result[start:end])
        return {    
            "description": parsed.get("description", "Expense"),
            "amount": float(parsed.get("amount", 0)) if parsed.get("amount") else None,
            "date": parsed.get("date") or today.isoformat(),
            "paid_by_name": None,
        }

    except Exception as e:
        print("GROQ VISION EXCEPTION:", str(e))
        return None