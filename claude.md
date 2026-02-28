# claude.md — AI Guidance & Prompting Rules

This file documents how AI was used throughout this project, what rules were applied, and how the AI was directed to produce high quality output.

---

## Role of AI in This Project

AI was used as a pair programmer and architectural advisor, not as a code dumper. Every piece of AI-generated code was reviewed, understood, and often modified before use.

---

## Prompting Philosophy

### 1. Architecture First
Before asking AI to write any code, the architecture was designed manually — DB schema drawn out, API endpoints listed, folder structure decided. AI was then asked to implement within those constraints.

### 2. One Concern at a Time
Each AI prompt addressed exactly one file or one function.

Bad prompt: "Build me a full expense splitting app"

Good prompt: "Write a Flask route that takes a group_id, queries all expenses in that group, and returns them as JSON. Use SQLAlchemy. Here is the Expense model: [model code]"

### 3. Always Provide Context
Every AI prompt included the relevant model/schema, the specific function signature expected, and what the function should NOT do.

### 4. Debt Algorithm — Human-Led, AI-Assisted
The debt simplification algorithm logic was designed by the developer first using pen and paper (greedy matching of creditors/debtors). AI was then asked to implement the Python code for the already-designed algorithm.

---

## Coding Standards Applied to AI Output

All AI-generated code was held to these standards before acceptance:

- No unused imports
- No magic numbers — use named variables
- Functions do one thing only (Single Responsibility Principle)
- Error handling on all API routes (400, 404, 409 responses)
- Decimal used for all monetary math, not float
- All DB relationships explicitly defined in models
- No bare except clauses

---

## What AI Was NOT Used For

- DB schema design — done manually based on domain analysis
- Algorithm design — greedy debt simplification designed by developer
- Architectural decisions — Flask Blueprint structure decided by developer

---

## AI Tools Used

- Claude (Anthropic) — code implementation, route structure, CSS design
- OpenRouter API — runtime AI feature for group spending summaries

---

## Example Prompt Pattern Used
```
Context: I have a Flask app with these models: [paste models.py]

Task: Write the POST /api/groups/<group_id>/expenses endpoint.

Requirements:
- Validate that paid_by user is a member of the group
- Use Decimal for amount calculation, not float
- Return 400 if amount <= 0
- Return the full expense object with splits on success

Do not add authentication. Do not over-engineer.
```

