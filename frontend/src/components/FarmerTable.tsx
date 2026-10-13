import { ArrowUpDown, Search, X } from "lucide-react";
import type { FarmerRecord } from "../services/api";

export type SortKey =
  | "id"
  | "name"
  | "village"
  | "sugarcane_tons"
  | "payment_pending"
  | "amount_paid";

type SortDirection = "asc" | "desc";

type FarmerTableProps = {
  farmers: FarmerRecord[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  onClear: () => void;
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

const headers: Array<{ key: SortKey; label: string }> = [
  { key: "id", label: "Farmer ID" },
  { key: "name", label: "Farmer Name" },
  { key: "village", label: "Village" },
  { key: "sugarcane_tons", label: "Sugarcane Supplied (tonnes)" },
  { key: "payment_pending", label: "Payment Pending (₹)" },
  { key: "amount_paid", label: "Amount Paid (₹)" },
];

function FarmerTable({
  farmers,
  searchTerm,
  onSearchChange,
  sortKey,
  sortDirection,
  onSort,
  onClear,
}: FarmerTableProps) {
  if (farmers.length === 0) {
    return (
      <div className="empty-state">
        <h3>No farmer records found</h3>
        <p>
          {searchTerm
            ? "Try a different village or farmer name search."
            : "There are no farmer rows available from the current data source."}
        </p>
        <button type="button" className="secondary-button" onClick={onClear}>
          <X size={16} />
          Clear
        </button>
      </div>
    );
  }

  return (
    <div className="table-card">
      <div className="table-toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="search"
            value={searchTerm}
            placeholder="Search by farmer or village"
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label="Search farmers"
          />
        </div>
        {searchTerm ? (
          <button type="button" className="secondary-button" onClick={onClear}>
            <X size={16} />
            Clear
          </button>
        ) : null}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {headers.map(({ key, label }) => {
                const isActive = sortKey === key;
                return (
                  <th key={key}>
                    <button
                      type="button"
                      className={`sort-button ${isActive ? "active" : ""}`}
                      onClick={() => onSort(key)}
                    >
                      <span>{label}</span>
                      <ArrowUpDown size={14} />
                      {isActive ? (
                        <span className="sort-indicator">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      ) : null}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {farmers.map((farmer) => (
              <tr key={farmer.id}>
                <td>{farmer.id}</td>
                <td>{farmer.name}</td>
                <td>{farmer.village}</td>
                <td>{numberFormatter.format(farmer.sugarcane_tons)} t</td>
                <td>{currencyFormatter.format(farmer.payment_pending)}</td>
                <td>{currencyFormatter.format(farmer.amount_paid)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FarmerTable;
