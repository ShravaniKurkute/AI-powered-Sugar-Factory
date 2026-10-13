import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import DashboardCards from "../components/DashboardCards";
import FarmerTable, { type SortKey } from "../components/FarmerTable";
import { fetchFarmers, type FarmerRecord, type FarmerSummary } from "../services/api";

const defaultSummary: FarmerSummary = {
  totalFarmers: 0,
  totalSugarcaneTons: 0,
  totalPendingPayments: 0,
  totalAmountPaid: 0,
};

function DashboardPage() {
  const [farmers, setFarmers] = useState<FarmerRecord[]>([]);
  const [summary, setSummary] = useState<FarmerSummary>(defaultSummary);
  const [source, setSource] = useState("loading");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: "asc" | "desc";
  }>({ key: "id", direction: "asc" });

  async function loadDashboard() {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchFarmers();
      setFarmers(data.farmers);
      setSummary(data.summary);
      setSource(data.source);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unexpected error while loading farmer data."
      );
      setFarmers([]);
      setSummary(defaultSummary);
      setSource("error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const filteredFarmers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const rows = normalizedSearch
      ? farmers.filter((farmer) => {
          return (
            farmer.name.toLowerCase().includes(normalizedSearch) ||
            farmer.village.toLowerCase().includes(normalizedSearch)
          );
        })
      : [...farmers];

    rows.sort((first, second) => {
      const direction = sortConfig.direction === "asc" ? 1 : -1;
      const firstValue = first[sortConfig.key];
      const secondValue = second[sortConfig.key];

      if (typeof firstValue === "string" && typeof secondValue === "string") {
        return firstValue.localeCompare(secondValue) * direction;
      }

      return ((Number(firstValue) ?? 0) - (Number(secondValue) ?? 0)) * direction;
    });

    return rows;
  }, [farmers, searchTerm, sortConfig]);

  function handleSort(key: SortKey) {
    setSortConfig((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }

      return { key, direction: "asc" };
    });
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <p className="eyebrow muted">Factory overview</p>
          <h2>Farmer performance dashboard</h2>
        </div>
        <button type="button" className="primary-button" onClick={() => void loadDashboard()}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </header>

      {loading ? (
        <div className="status-panel">Loading farmer records...</div>
      ) : error ? (
        <div className="status-panel error">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button type="button" className="secondary-button" onClick={() => void loadDashboard()}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <DashboardCards
            totalFarmers={summary.totalFarmers}
            totalSugarcaneTons={summary.totalSugarcaneTons}
            totalPendingPayments={summary.totalPendingPayments}
            totalAmountPaid={summary.totalAmountPaid}
            source={source}
          />

          <FarmerTable
            farmers={filteredFarmers}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            sortKey={sortConfig.key}
            sortDirection={sortConfig.direction}
            onSort={handleSort}
            onClear={() => setSearchTerm("")}
          />
        </>
      )}
    </div>
  );
}

export default DashboardPage;
