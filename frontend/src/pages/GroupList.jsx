import { useState, useEffect } from "react";
import { getGroups, createGroup, getUsers, createUser } from "../services/api";

export default function GroupList({ onSelectGroup }) {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: "", description: "" });
  const [userForm, setUserForm] = useState({ name: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [groupsData, usersData] = await Promise.all([getGroups(), getUsers()]);
      setGroups(groupsData);
      setUsers(usersData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      const newGroup = await createGroup(groupForm);
      setGroups([newGroup, ...groups]);
      setGroupForm({ name: "", description: "" });
      setShowGroupForm(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const newUser = await createUser(userForm);
      setUsers([newUser, ...users]);
      setUserForm({ name: "", email: "" });
      setShowUserForm(false);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1>Your Groups</h1>
          <p className="page-subtitle">
            {groups.length} group{groups.length !== 1 ? "s" : ""} · {users.length} member{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => setShowUserForm(!showUserForm)}>
            + Add Person
          </button>
          <button className="btn btn-primary" onClick={() => setShowGroupForm(!showGroupForm)}>
            + New Group
          </button>
        </div>
      </div>

      {showUserForm && (
        <div className="card form-card">
          <h3>Add a New Person</h3>
          <form onSubmit={handleCreateUser} className="form">
            <div className="form-row">
              <input className="input" placeholder="Full name" value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required />
              <input className="input" type="email" placeholder="Email address" value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowUserForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Add Person</button>
            </div>
          </form>
        </div>
      )}

      {showGroupForm && (
        <div className="card form-card">
          <h3>Create a New Group</h3>
          <form onSubmit={handleCreateGroup} className="form">
            <input className="input" placeholder="Group name (e.g. Goa Trip 2024)" value={groupForm.name}
              onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} required />
            <input className="input" placeholder="Description (optional)" value={groupForm.description}
              onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} />
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowGroupForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Group</button>
            </div>
          </form>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🧾</div>
          <h2>No groups yet</h2>
          <p>Create your first group to start splitting expenses</p>
        </div>
      ) : (
        <div className="card-grid">
          {groups.map((group) => (
            <button key={group.id} className="card group-card" onClick={() => onSelectGroup(group.id)}>
              <div className="group-card-icon">{group.name.charAt(0).toUpperCase()}</div>
              <div className="group-card-info">
                <h3>{group.name}</h3>
                {group.description && <p className="group-desc">{group.description}</p>}
                <div className="group-card-meta">
                  <span>{group.member_count} member{group.member_count !== 1 ? "s" : ""}</span>
                  <span>·</span>
                  <span>{group.expense_count} expense{group.expense_count !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <span className="group-card-arrow">→</span>
            </button>
          ))}
        </div>
      )}

      {users.length > 0 && (
        <div className="section">
          <h2 className="section-title">All People</h2>
          <div className="user-list">
            {users.map((user) => (
              <div key={user.id} className="user-chip">
                <span className="user-avatar">{user.name.charAt(0)}</span>
                <span>{user.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}