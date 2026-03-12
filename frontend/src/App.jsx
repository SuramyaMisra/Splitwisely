import { useState } from "react";
import GroupList from "./pages/GroupList";
import GroupDetail from "./pages/GroupDetail";
import Login from "./pages/Login";
import { clearToken } from "./services/api";
import "./index.css";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState("groups");
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setCurrentPage("groups");
  };

  const handleLogout = () => {
    clearToken();
    setCurrentUser(null);
    setCurrentPage("groups");
    setSelectedGroupId(null);
  };

  const navigateTo = (page, groupId = null) => {
    setCurrentPage(page);
    setSelectedGroupId(groupId);
  };

  // If not logged in show login page
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <button className="logo" onClick={() => navigateTo("groups")}>
          <span className="logo-icon">⚖</span>
          <span className="logo-text">SplitWise<em>ly</em></span>
        </button>
        <p className="header-tagline">Smart expense splitting for groups</p>
        <div className="header-user">
          <span className="header-username">👤 {currentUser.name}</span>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="app-main">
        {currentPage === "groups" && (
          <GroupList onSelectGroup={(id) => navigateTo("detail", id)} />
        )}
        {currentPage === "detail" && selectedGroupId && (
          <GroupDetail
            groupId={selectedGroupId}
            onBack={() => navigateTo("groups")}
          />
        )}
      </main>
    </div>
  );
}