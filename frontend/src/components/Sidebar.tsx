import { LayoutDashboard, MessageSquareText } from "lucide-react";
import type { PageName } from "../App";

type SidebarProps = {
  activePage: PageName;
  onNavigate: (page: PageName) => void;
};

const navItems = [
  { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { id: "assistant" as const, label: "AI Assistant", icon: MessageSquareText },
];

function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-icon">S</div>
        <div>
          <p className="eyebrow">AgriOps</p>
          <h1>Sanjivani Sugar</h1>
        </div>
      </div>

      <nav className="nav-list" aria-label="Main navigation">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`nav-item ${activePage === id ? "active" : ""}`}
            onClick={() => onNavigate(id)}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
