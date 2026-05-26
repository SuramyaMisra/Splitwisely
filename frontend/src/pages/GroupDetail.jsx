import ReactMarkdown from 'react-markdown'
import { useState, useEffect } from "react";
import {
  getGroup, getExpenses, getBalances, addExpense,
  addMember, removeMember, settleDebt, getGroupSummary,
  getUsers, parseExpense, deleteExpense, scanBill,
} from "../services/api";

export default function GroupDetail({ groupId, onBack }) {
  const [group, setGroup]               = useState(null);
  const [expenses, setExpenses]         = useState([]);
  const [balances, setBalances]         = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [allUsers, setAllUsers]         = useState([]);
  const [aiSummary, setAiSummary]       = useState("");
  const [aiLoading, setAiLoading]       = useState(false);
  const [activeTab, setActiveTab]       = useState("expenses");
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showMemberForm, setShowMemberForm]   = useState(false);
  const [expenseForm, setExpenseForm]   = useState({
    description: "", amount: "", paid_by: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [nlText, setNlText]           = useState("");
  const [nlLoading, setNlLoading]     = useState(false);
  const [nlError, setNlError]         = useState(null);
  const [nlSuccess, setNlSuccess]     = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError]     = useState(null);
  const [loading, setLoading]         = useState(true);
  const [settling, setSettling]       = useState(false);
  const [error, setError]             = useState(null);

  useEffect(() => { loadAll(); }, [groupId]);

  const loadAll = async () => {
    try {
      const [groupData, expensesData, balancesData, usersData] = await Promise.all([
        getGroup(groupId), getExpenses(groupId), getBalances(groupId), getUsers(),
      ]);
      setGroup(groupData);
      setExpenses(expensesData);
      setBalances(balancesData.balances);
      setTransactions(balancesData.suggested_transactions);
      setAllUsers(usersData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...expenseForm,
        amount:  parseFloat(expenseForm.amount),
        paid_by: parseInt(expenseForm.paid_by),
      };
      const newExpense = await addExpense(groupId, payload);
      setExpenses([newExpense, ...expenses]);
      setExpenseForm({
        description: "", amount: "", paid_by: "",
        date: new Date().toISOString().split("T")[0],
      });
      setShowExpenseForm(false);
      setNlText("");
      setNlSuccess(false);
      const balancesData = await getBalances(groupId);
      setBalances(balancesData.balances);
      setTransactions(balancesData.suggested_transactions);
    } catch (err) { setError(err.message); }
  };

  const handleParseExpense = async () => {
    if (!nlText.trim()) return;
    setNlLoading(true);
    setNlError(null);
    setNlSuccess(false);
    try {
      const parsed = await parseExpense(groupId, nlText);
      let paid_by_id = "";
      if (parsed.paid_by_name) {
        const match = group.members?.find(
          (m) => m.user_name.toLowerCase() === parsed.paid_by_name.toLowerCase()
        );
        if (match) paid_by_id = String(match.user_id);
      }
      setExpenseForm({
        description: parsed.description || "",
        amount:      parsed.amount ? String(parsed.amount) : "",
        paid_by:     paid_by_id,
        date:        parsed.date || new Date().toISOString().split("T")[0],
      });
      setShowExpenseForm(true);
      setNlSuccess(true);
    } catch (err) {
      setNlError(err.message);
    } finally {
      setNlLoading(false);
    }
  };

  const handleScanBill = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setScanLoading(true);
    setScanError(null);
    setNlSuccess(false);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const parsed = await scanBill(groupId, base64, file.type);
      let paid_by_id = "";
      if (parsed.paid_by_name) {
        const match = group.members?.find(
          (m) => m.user_name.toLowerCase() === parsed.paid_by_name.toLowerCase()
        );
        if (match) paid_by_id = String(match.user_id);
      }
      setExpenseForm({
        description: parsed.description || "",
        amount:      parsed.amount ? String(parsed.amount) : "",
        paid_by:     paid_by_id,
        date:        parsed.date || new Date().toISOString().split("T")[0],
      });
      setShowExpenseForm(true);
      setNlSuccess(true);
    } catch (err) {
      setScanError(err.message);
    } finally {
      setScanLoading(false);
    }
  };

  const handleAddMember = async (userId) => {
    try {
      await addMember(groupId, { user_id: parseInt(userId) });
      const groupData = await getGroup(groupId);
      setGroup(groupData);
    } catch (err) { setError(err.message); }
  };

  const handleRemoveMember = async (userId, userName) => {
    if (!window.confirm(`Remove ${userName} from this group?`)) return;
    try {
      await removeMember(groupId, userId);
      const groupData = await getGroup(groupId);
      setGroup(groupData);
    } catch (err) { setError(err.message); }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm("Delete this expense? This cannot be undone.")) return;
    try {
      await deleteExpense(groupId, expenseId);
      setExpenses(expenses.filter(e => e.id !== expenseId));
      const balancesData = await getBalances(groupId);
      setBalances(balancesData.balances);
      setTransactions(balancesData.suggested_transactions);
    } catch (err) { setError(err.message); }
  };

  const handleSettle = async (fromUserId, toUserId) => {
    if (settling) return;
    setSettling(true);
    try {
      await settleDebt(groupId, { from_user_id: fromUserId, to_user_id: toUserId });
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSettling(false);
    }
  };

  const handleAiSummary = async () => {
    setAiLoading(true);
    setAiSummary("");
    try {
      const data = await getGroupSummary(groupId);
      setAiSummary(data.summary);
    } catch (err) {
      setAiSummary("Could not generate summary. Please try again.");
    } finally { setAiLoading(false); }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const memberIds     = group?.members?.map((m) => m.user_id) || [];
  const nonMembers    = allUsers.filter((u) => !memberIds.includes(u.id));

  if (loading) return <div className="loading">Loading group...</div>;
  if (!group)  return null;

  return (
    <div className="page">
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="page-header">
        <div className="header-left">
          <button className="btn btn-ghost back-btn" onClick={onBack}>← Back</button>
          <div>
            <h1>{group.name}</h1>
            {group.description && <p className="page-subtitle">{group.description}</p>}
          </div>
        </div>
        <div className="stats-row">
          <div className="stat">
            <span className="stat-value">₹{totalExpenses.toFixed(2)}</span>
            <span className="stat-label">Total Spent</span>
          </div>
          <div className="stat">
            <span className="stat-value">{group.members?.length || 0}</span>
            <span className="stat-label">Members</span>
          </div>
          <div className="stat">
            <span className="stat-value">{expenses.length}</span>
            <span className="stat-label">Expenses</span>
          </div>
        </div>
      </div>

      <div className="members-strip">
        {group.members?.map((m) => (
          <div key={m.user_id} className="member-badge">
            <span className="member-avatar">{m.user_name.charAt(0)}</span>
            <span>{m.user_name}</span>
            <button className="member-remove-btn"
              onClick={() => handleRemoveMember(m.user_id, m.user_name)}
              title="Remove member">×</button>
          </div>
        ))}
        <button className="member-add-btn" onClick={() => setShowMemberForm(!showMemberForm)}>
          + Add
        </button>
      </div>

      {showMemberForm && nonMembers.length > 0 && (
        <div className="card form-card">
          <h3>Add Member</h3>
          <div className="user-picker">
            {nonMembers.map((u) => (
              <button key={u.id} className="btn btn-secondary"
                onClick={() => { handleAddMember(u.id); setShowMemberForm(false); }}>
                {u.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {showMemberForm && nonMembers.length === 0 && (
        <div className="card form-card">
          <p>All registered users are already in this group.</p>
        </div>
      )}

      <div className="tabs">
        {["expenses", "balances", "ai"].map((tab) => (
          <button key={tab}
            className={`tab ${activeTab === tab ? "tab-active" : ""}`}
            onClick={() => setActiveTab(tab)}>
            {tab === "ai" ? "✦ AI Summary" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "expenses" && (
        <div>
          <div className="section-header">
            <h2>Expenses</h2>
            <button className="btn btn-primary"
              onClick={() => { setShowExpenseForm(!showExpenseForm); setNlSuccess(false); }}>
              + Add Expense
            </button>
          </div>

          {showExpenseForm && (
            <div className="card form-card">
              <div className="nl-section">
                <h3>✦ Add with AI</h3>
                <p className="nl-hint">
                  Type naturally — e.g. <em>"Rahul paid 500 for dinner last night"</em>
                </p>
                <div className="nl-input-row">
                  <input className="input"
                    placeholder="Describe the expense in plain English..."
                    value={nlText}
                    onChange={(e) => { setNlText(e.target.value); setNlSuccess(false); setNlError(null); }}
                    onKeyDown={(e) => e.key === "Enter" && handleParseExpense()}
                  />
                  <button className="btn btn-primary"
                    onClick={handleParseExpense}
                    disabled={nlLoading || !nlText.trim()}>
                    {nlLoading ? "Parsing..." : "Parse ✦"}
                  </button>
                </div>
                {nlError   && <p className="nl-error">⚠ {nlError}</p>}
                {nlSuccess && <p className="nl-success">✓ Form filled — review and confirm below</p>}

                <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <label style={{
                    display: "inline-flex", alignItems: "center", gap: "0.4rem",
                    padding: "0.5rem 1rem",
                    background: "var(--teal-pale)",
                    border: "1px solid rgba(13,148,136,0.3)",
                    borderRadius: "var(--radius-xs)",
                    color: "var(--teal)", fontSize: "0.82rem", fontWeight: "600",
                    cursor: scanLoading ? "not-allowed" : "pointer",
                    opacity: scanLoading ? 0.6 : 1, transition: "all 0.2s",
                  }}>
                    {scanLoading ? "📷 Scanning..." : "📷 Scan Bill"}
                    <input type="file" accept="image/*" capture="environment"
                      style={{ display: "none" }}
                      onChange={handleScanBill}
                      disabled={scanLoading} />
                  </label>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Upload a photo of your bill
                  </span>
                </div>
                {scanError && <p className="nl-error">⚠ {scanError}</p>}
              </div>

              <div className="nl-divider"><span>or fill manually</span></div>

              <h3>Expense Details</h3>
              <form onSubmit={handleAddExpense} className="form">
                <input className="input" placeholder="What was this for? (e.g. Dinner)"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  required />
                <div className="form-row">
                  <input className="input" type="number" step="0.01" min="0.01"
                    placeholder="Amount (₹)" value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    required />
                  <input className="input" type="date" value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    required />
                </div>
                <select className="input" value={expenseForm.paid_by}
                  onChange={(e) => setExpenseForm({ ...expenseForm, paid_by: e.target.value })}
                  required>
                  <option value="">Who paid?</option>
                  {group.members?.map((m) => (
                    <option key={m.user_id} value={m.user_id}>{m.user_name}</option>
                  ))}
                </select>
                <p className="form-hint">Split equally among all {group.members?.length} members</p>
                <div className="form-actions">
                  <button type="button" className="btn btn-ghost"
                    onClick={() => { setShowExpenseForm(false); setNlText(""); setNlSuccess(false); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">Add Expense</button>
                </div>
              </form>
            </div>
          )}

          {expenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💸</div>
              <p>No expenses yet. Add the first one!</p>
            </div>
          ) : (
            <div className="expense-list">
              {expenses.map((exp) => (
                <div key={exp.id} className="card expense-item">
                  <div className="expense-left">
                    <div className="expense-icon">{exp.description.charAt(0).toUpperCase()}</div>
                    <div>
                      <h4>{exp.description}</h4>
                      <p className="expense-meta">
                        Paid by <strong>{exp.paid_by_name}</strong> · {exp.date}
                      </p>
                    </div>
                  </div>
                  <div className="expense-right">
                    <span className="expense-amount">₹{exp.amount.toFixed(2)}</span>
                    <span className="expense-per">
                      ₹{(exp.amount / (exp.splits?.length || 1)).toFixed(2)}/person
                    </span>
                    <button className="group-action-btn delete-btn"
                      onClick={() => handleDeleteExpense(exp.id)}
                      title="Delete expense">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "balances" && (
        <div>
          <h2>Current Balances</h2>
          <div className="balance-list">
            {balances.map((b) => (
              <div key={b.user_id} className="card balance-item">
                <div className="balance-left">
                  <span className="member-avatar">{b.user_name.charAt(0)}</span>
                  <span className="balance-name">{b.user_name}</span>
                </div>
                <span className={`balance-amount ${b.net_balance >= 0 ? "positive" : "negative"}`}>
                  {b.net_balance >= 0 ? "+" : ""}₹{b.net_balance.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {transactions.length > 0 && (
            <div className="section">
              <h2>Settle Up — Minimum Transactions</h2>
              <p className="section-desc">The fewest transactions needed to clear all debts.</p>
              {settling && <div className="settling-banner">⏳ Processing settlement — please wait...</div>}
              <div className="transaction-list">
                {transactions.map((t, i) => (
                  <div key={i} className="card transaction-item">
                    <div className="transaction-info">
                      <span className="tx-from">{t.from_user_name}</span>
                      <span className="tx-arrow">pays</span>
                      <span className="tx-to">{t.to_user_name}</span>
                      <span className="tx-amount">₹{t.amount.toFixed(2)}</span>
                    </div>
                    <button className="btn btn-success"
                      onClick={() => handleSettle(t.from_user_id, t.to_user_id)}
                      disabled={settling}>
                      {settling ? "Wait..." : "Mark Settled"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {transactions.length === 0 && balances.length > 0 && (
            <div className="empty-state">
              <div className="empty-icon">✓</div>
              <h3>All settled up!</h3>
              <p>No outstanding debts in this group.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "ai" && (
        <div>
          <div className="ai-header">
            <h2>✦ AI Group Summary</h2>
            <p>Let AI analyze your group's spending and give you actionable insights.</p>
            <button className="btn btn-primary" onClick={handleAiSummary} disabled={aiLoading}>
              {aiLoading ? "Generating..." : "Generate Summary"}
            </button>
          </div>
          {aiLoading && (
            <div className="ai-loading">
              <div className="ai-spinner" />
              <p>Analyzing group spending...</p>
            </div>
          )}
          {aiSummary && !aiLoading && (
            <div className="card ai-result">
              <div className="ai-badge">✦ AI Generated</div>
              <ReactMarkdown className="ai-text">{aiSummary}</ReactMarkdown>
            </div>

          )}
        </div>
      )}
    </div>
  );
}