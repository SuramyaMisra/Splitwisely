import { useState, useEffect } from "react";
import { getGroup, getExpenses, getBalances, addExpense,
  addMember, settleDebt, getGroupSummary, getUsers } from "../services/api";

export default function GroupDetail({ groupId, onBack }) {
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("expenses");
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: "", amount: "", paid_by: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      const payload = { ...expenseForm, amount: parseFloat(expenseForm.amount), paid_by: parseInt(expenseForm.paid_by) };
      const newExpense = await addExpense(groupId, payload);
      setExpenses([newExpense, ...expenses]);
      setExpenseForm({ description: "", amount: "", paid_by: "", date: new Date().toISOString().split("T")[0] });
      setShowExpenseForm(false);
      const balancesData = await getBalances(groupId);
      setBalances(balancesData.balances);
      setTransactions(balancesData.suggested_transactions);
    } catch (err) { setError(err.message); }
  };

  const handleAddMember = async (userId) => {
    try {
      await addMember(groupId, { user_id: parseInt(userId) });
      const groupData = await getGroup(groupId);
      setGroup(groupData);
    } catch (err) { setError(err.message); }
  };

  const handleSettle = async (fromUserId, toUserId) => {
    try {
      await settleDebt(groupId, { from_user_id: fromUserId, to_user_id: toUserId });
      const [balancesData, expensesData] = await Promise.all([getBalances(groupId), getExpenses(groupId)]);
      setBalances(balancesData.balances);
      setTransactions(balancesData.suggested_transactions);
      setExpenses(expensesData);
    } catch (err) { setError(err.message); }
  };

  const handleAiSummary = async () => {
    setAiLoading(true);
    setAiSummary("");
    try {
      const data = await getGroupSummary(groupId);
      setAiSummary(data.summary);
    } catch (err) {
      setAiSummary("Could not generate summary. Check your OpenAI API key.");
    } finally { setAiLoading(false); }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const memberIds = group?.members?.map((m) => m.user_id) || [];
  const nonMembers = allUsers.filter((u) => !memberIds.includes(u.id));

  if (loading) return <div className="loading">Loading group...</div>;
  if (!group) return null;

  return (
    <div className="page">
      {error && <div className="error-banner">{error}<button onClick={() => setError(null)}>×</button></div>}

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
          </div>
        ))}
        <button className="member-add-btn" onClick={() => setShowMemberForm(!showMemberForm)}>+ Add</button>
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
          <p>All registered users are already in this group. Add more people from the home page.</p>
        </div>
      )}

      <div className="tabs">
        {["expenses", "balances", "ai"].map((tab) => (
          <button key={tab} className={`tab ${activeTab === tab ? "tab-active" : ""}`}
            onClick={() => setActiveTab(tab)}>
            {tab === "ai" ? "✦ AI Summary" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "expenses" && (
        <div>
          <div className="section-header">
            <h2>Expenses</h2>
            <button className="btn btn-primary" onClick={() => setShowExpenseForm(!showExpenseForm)}>+ Add Expense</button>
          </div>
          {showExpenseForm && (
            <div className="card form-card">
              <h3>Add New Expense</h3>
              <form onSubmit={handleAddExpense} className="form">
                <input className="input" placeholder="What was this for? (e.g. Dinner)" value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} required />
                <div className="form-row">
                  <input className="input" type="number" step="0.01" min="0.01" placeholder="Amount (₹)"
                    value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} required />
                  <input className="input" type="date" value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} required />
                </div>
                <select className="input" value={expenseForm.paid_by}
                  onChange={(e) => setExpenseForm({ ...expenseForm, paid_by: e.target.value })} required>
                  <option value="">Who paid?</option>
                  {group.members?.map((m) => (
                    <option key={m.user_id} value={m.user_id}>{m.user_name}</option>
                  ))}
                </select>
                <p className="form-hint">Split equally among all {group.members?.length} members</p>
                <div className="form-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowExpenseForm(false)}>Cancel</button>
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
                      <p className="expense-meta">Paid by <strong>{exp.paid_by_name}</strong> · {exp.date}</p>
                    </div>
                  </div>
                  <div className="expense-right">
                    <span className="expense-amount">₹{exp.amount.toFixed(2)}</span>
                    <span className="expense-per">₹{(exp.amount / (exp.splits?.length || 1)).toFixed(2)}/person</span>
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
              <div className="transaction-list">
                {transactions.map((t, i) => (
                  <div key={i} className="card transaction-item">
                    <div className="transaction-info">
                      <span className="tx-from">{t.from_user_name}</span>
                      <span className="tx-arrow">pays</span>
                      <span className="tx-to">{t.to_user_name}</span>
                      <span className="tx-amount">₹{t.amount.toFixed(2)}</span>
                    </div>
                    <button className="btn btn-success" onClick={() => handleSettle(t.from_user_id, t.to_user_id)}>
                      Mark Settled
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
              <p className="ai-text">{aiSummary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}