import { useState } from "react";
import GroupList from "./pages/GroupList";
import GroupDetail from "./pages/GroupDetail";
import "./index.css";

export default function App() {
  const [currentPage, setCurrentPage] = useState("groups");
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  const navigateTo = (page, groupId = null) => {
    setCurrentPage(page);
    setSelectedGroupId(groupId);
  };

  return (
    <div className="app">
      <header className="app-header">
        <button className="logo" onClick={() => navigateTo("groups")}>
          <span className="logo-icon">⚖</span>
          <span className="logo-text">SplitWise<em>ly</em></span>
        </button>
        <p className="header-tagline">Smart expense splitting for groups</p>
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