# SplitWisely ✨

A full-stack web application for splitting shared expenses among groups, with AI-powered expense parsing, OCR-based receipt scanning, smart balance calculation, and a debt simplification algorithm that minimizes the number of transactions needed to settle up.

Built for real-world trips, flat expenses, outings, and shared spending scenarios where financial correctness matters.

---

# 🚀 Live Deployment

## Frontend
https://splitwisely-5b82y2jz-suramyamisras-projects.vercel.app

## Backend API
https://splitwisely-backend.onrender.com

---

# The Problem It Solves

When groups of people share expenses — trips, rent, fuel, food, events — tracking who owes whom becomes messy very fast.

Most basic expense splitters fail in two major ways:

- they create too many unnecessary settlement transactions
- they recalculate old expenses incorrectly when new members join later

Example:

- 6 friends go on a trip
- expenses are added
- later a 7th member joins
- older expenses suddenly split among 7 people

That is financially wrong.

SplitWisely solves this using:
- participant snapshot preservation
- smart debt simplification
- accurate historical balance tracking

---

# ✨ Core Features

## 🔐 Authentication System
- JWT-based authentication
- Secure login/register flow
- Protected API routes
- Password hashing using bcrypt

---

## 👥 Group Management
- Create groups
- Add/remove members
- Group-wise expense tracking
- Dynamic member handling

---

## 💸 Expense System
- Add expenses manually
- Delete expenses
- Equal expense splitting
- Historical participant preservation
- Settlement tracking

---

## 🤖 AI Expense Parsing

Users can enter expenses naturally:

```text
"Rohan paid 500 for dinner yesterday"
```

The AI automatically extracts:
- payer
- amount
- description
- date

This reduces manual form filling significantly.

---

## 📷 OCR + AI Receipt Scanning

Users can upload bill images directly.

The system:
1. extracts bill information
2. sends structured context to the AI model
3. auto-generates expense data

This creates a near one-click expense entry workflow.

---

## 🧠 Smart Debt Simplification

Naive settlement systems create too many transactions.

SplitWisely uses a greedy debt simplification algorithm that minimizes transfers.

Instead of:

```text
A pays B
B pays C
C pays D
```

the algorithm simplifies to:

```text
A directly pays D
```

This significantly reduces settlement complexity in large groups.

---

# 🏗 Architecture

```text
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
PostgreSQL DB     Groq/OpenRouter API
```

### Key Architectural Decision

All business logic lives inside:

```text
backend/app/services/
```

Routes remain thin:
- validate input
- call services
- return JSON

This keeps:
- code modular
- logic testable
- architecture maintainable

---

# 🛠 Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React + Vite | Fast development and clean component architecture |
| Backend | Flask + Python | Lightweight, explicit, easy to reason about |
| Database | PostgreSQL | ACID compliance important for financial data |
| ORM | SQLAlchemy + Flask-Migrate | Migration-based schema management |
| AI | Groq + OpenRouter API | Fast and cost-effective LLM access |
| OCR | AI-assisted parsing | Smart receipt extraction |
| Styling | Vanilla CSS + CSS Variables | Full UI control without framework overhead |
| Deployment | Vercel + Render | Simple production deployment |

---

# 🗄 Database Schema

```text
users ──< group_members >── groups
                               │
                           expenses
                               │
                        expense_splits
```

---

# Why `expense_splits` Exists Separately

An expense may involve:
- all members
- only selected members

Using a separate `expense_splits` table allows:
- normalized financial records
- participant snapshot preservation
- independent settlement tracking

This becomes critical for financial correctness.

---

# Why Decimal Instead of Float

Money should NEVER use floating-point arithmetic.

Example:

```python
0.1 + 0.2 != 0.3
```

SplitWisely uses:
- Python `Decimal`
- PostgreSQL `NUMERIC(10,2)`

to maintain precise financial calculations.

---

# 🧠 Debt Simplification Algorithm

File:

```text
backend/app/services/splitting.py
```

### Approach

1. Calculate each user's net balance
2. Separate creditors and debtors
3. Greedily match largest debtor to largest creditor
4. Minimize total number of transfers

### Complexity

```text
O(n log n)
```

due to sorting.

---

# 🧪 Testing

Backend tests added using Pytest for:
- debt simplification logic
- participant snapshot logic
- authentication validation

Run tests:

```bash
cd backend
python -m pytest
```

---

# 📂 Project Structure

```bash
expense-splitter/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── config.py
│   │   ├── routes/
│   │   │   ├── users.py
│   │   │   ├── groups.py
│   │   │   ├── expenses.py
│   │   │   ├── auth.py
│   │   │   └── ai.py
│   │   │
│   │   └── services/
│   │       ├── splitting.py
│   │       └── ai_service.py
│   │
│   ├── tests/
│   ├── requirements.txt
│   └── run.py
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── index.css
│   │
│   └── package.json
│
└── README.md
```

---

# ⚙️ Setup & Running

# Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL

---

# Backend Setup

```bash
cd backend

python -m venv venv
```

Activate environment:

## Windows

```bash
venv\Scripts\activate
```

## Mac/Linux

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

# Configure Environment Variables

Create `.env` inside backend:

```env
DATABASE_URL=your_database_url
JWT_SECRET_KEY=your_secret_key
OPENROUTER_API_KEY=your_api_key
FLASK_ENV=development
```

---

# Run Database Migrations

```bash
flask db upgrade
```

---

# Start Backend

```bash
python run.py
```

Backend runs on:

```text
http://localhost:5000
```

---

# Frontend Setup

```bash
cd frontend

npm install
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

# 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Current user |
| GET | /api/groups | List groups |
| POST | /api/groups | Create group |
| GET | /api/groups/:id | Group details |
| POST | /api/groups/:id/members | Add member |
| GET | /api/groups/:id/expenses | List expenses |
| POST | /api/groups/:id/expenses | Add expense |
| GET | /api/groups/:id/balances | Get balances |
| POST | /api/groups/:id/settle | Settle debt |
| POST | /api/groups/:id/parse-expense | AI parsing |
| POST | /api/groups/:id/scan-bill | Receipt scanning |

---

# ⚠️ Known Trade-offs

- Equal splitting only
- No realtime websocket sync
- OCR quality depends on image clarity
- Free AI models may have rate limits
- Currency currently fixed to INR

---

# 🔮 Future Improvements

- Dark mode
- Custom percentage splits
- PDF settlement export
- Multi-currency support
- Realtime sync
- Spending analytics dashboard
- Mobile responsiveness improvements

---

# 📸 Screenshots

_Add screenshots here._

---

# 👨‍💻 Author

## Suramya Misra

GitHub:
https://github.com/SuramyaMisra

---

# 📄 License

This project is built for educational, learning, and portfolio purposes.
