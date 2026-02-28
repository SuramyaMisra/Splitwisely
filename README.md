# SplitWisely — Smart Group Expense Splitter

A full-stack web application for splitting shared expenses among groups, with AI-powered spending summaries and a debt simplification algorithm that minimizes the number of transactions needed to settle up.

---

## The Problem It Solves

When groups of people share expenses (trips, flatmates, events), tracking who owes whom becomes messy fast. Naively settling 10 expenses among 5 people could require 20+ transactions. SplitWisely calculates the minimum transactions needed using a greedy debt simplification algorithm.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React + Vite | Fast dev experience, component model maps well to groups/expenses/balances |
| Backend | Python + Flask | Lightweight, explicit — no magic, easy to reason about |
| Database | PostgreSQL | ACID compliance important for financial data; relational model fits domain perfectly |
| ORM | SQLAlchemy + Flask-Migrate | Migration-based schema management; prevents manual SQL errors |
| AI | OpenRouter API | Access to free LLM models for summarization |
| Styling | Vanilla CSS + CSS Variables | No framework overhead; full control over design |

---

## Architecture
```
┌──────────────────────────────────────────┐
│         React Frontend (Vite)            │
│  GroupList → GroupDetail → Tabs          │
│  All API calls via /src/services/api.js  │
└─────────────────┬────────────────────────┘
                  │  REST/JSON over HTTP
                  ▼
┌──────────────────────────────────────────┐
│         Flask Backend                    │
│  app/routes/  → Request handling         │
│  app/services/ → Business logic          │
│  app/models.py → DB schema               │
└────────────┬─────────────────────────────┘
             │
    ┌────────┴────────┐
    ▼                 ▼
PostgreSQL DB     OpenRouter API
```

**Key architectural decision:** All business logic lives in `app/services/`, not in routes. Routes are thin — they validate input, call services, return JSON. This makes the core logic independently testable.

---

## Database Schema

Five tables with clear relationships:
```
users ──< group_members >── groups
                               │
                           expenses
                               │
                        expense_splits
```

**Why `expense_splits` is a separate table:** An expense can be split among a subset of group members. Embedding splits in the expense row would require denormalization — wrong for financial data that needs to be queried and updated independently.

**Why `Decimal` not `Float`:** Floating-point arithmetic is imprecise for money. `0.1 + 0.2 != 0.3` in floating point. All monetary values use Python's `Decimal` type and are stored as `NUMERIC(10, 2)` in PostgreSQL.

---

## The Debt Simplification Algorithm

**File:** `backend/app/services/splitting.py`

**Problem:** With n people and m expenses, a naive approach produces O(n*m) transactions. The algorithm reduces this to at most n-1 transactions.

**Approach:** Greedy matching
1. Calculate each person's net balance (total paid minus total owed)
2. Separate into creditors (net positive) and debtors (net negative)
3. Greedily match the largest debtor to the largest creditor
4. Settlement amount is `min(debt, credit)`
5. Reduce both balances and repeat until settled

**Complexity:** O(n log n) for sorting, O(n) for settlement passes.

---

## AI Integration

**Endpoint:** `GET /api/groups/<id>/summary`

Sends structured group data to an LLM via OpenRouter API. Returns natural language summary with spending overview, who contributed most, settlement instructions, and practical tips.

---

## Project Structure
```
expense-splitter/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask app factory
│   │   ├── models.py            # All DB models
│   │   ├── config.py            # Environment config
│   │   ├── routes/
│   │   │   ├── users.py
│   │   │   ├── groups.py
│   │   │   ├── expenses.py
│   │   │   └── ai.py
│   │   └── services/
│   │       ├── splitting.py     # Debt algorithm
│   │       └── ai_service.py    # AI integration
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── GroupList.jsx
│   │   │   └── GroupDetail.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json
├── claude.md
└── README.md
```

---

## Setup & Running

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL running locally

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your DATABASE_URL and OPENAI_API_KEY (OpenRouter key)

flask --app run db upgrade
python run.py
# API running at http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# App running at http://localhost:5173
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |
| GET | /api/users/ | List all users |
| POST | /api/users/ | Create user |
| GET | /api/groups/ | List all groups |
| POST | /api/groups/ | Create group |
| GET | /api/groups/:id | Get group details |
| POST | /api/groups/:id/members | Add member |
| GET | /api/groups/:id/expenses | List expenses |
| POST | /api/groups/:id/expenses | Add expense |
| GET | /api/groups/:id/balances | Get balances + settlements |
| POST | /api/groups/:id/settle | Mark debt as settled |
| GET | /api/groups/:id/summary | AI summary |

---

## Known Risks & Trade-offs

1. **No authentication** — deliberate scope decision for this assessment
2. **Equal splits only** — schema supports unequal splits, not yet exposed in UI
3. **Free AI models** — OpenRouter free tier has rate limits; app works fully without AI
4. **Currency** — hardcoded to INR; multi-currency would need exchange rate service

---

## Extension Approach

1. JWT authentication and user sessions
2. Custom splits by percentage or exact amount
3. Receipt scanning with OCR
4. Push notifications for settlement reminders
5. Multi-currency support
6. CSV/PDF export