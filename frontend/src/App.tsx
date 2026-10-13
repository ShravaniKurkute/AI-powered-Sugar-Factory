import { useState } from "react";
import Sidebar from "./components/Sidebar";
import DashboardPage from "./pages/Dashboard";
import AssistantPage from "./pages/Assistant";

export type PageName = "dashboard" | "assistant";

function App() {
  const [activePage, setActivePage] = useState<PageName>("dashboard");

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="main-panel">
        {activePage === "dashboard" ? <DashboardPage /> : <AssistantPage />}
      </main>
    </div>
  );
}

export default App;
