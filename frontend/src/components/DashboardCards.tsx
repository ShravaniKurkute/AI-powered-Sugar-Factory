import {
  IndianRupee,
  Leaf,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

export type DashboardCardsProps = {
  totalFarmers: number;
  totalSugarcaneTons: number;
  totalPendingPayments: number;
  totalAmountPaid: number;
  source?: string;
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

function DashboardCards({
  totalFarmers,
  totalSugarcaneTons,
  totalPendingPayments,
  totalAmountPaid,
  source,
}: DashboardCardsProps) {
  const cards = [
    {
      label: "Total registered farmers",
      value: numberFormatter.format(totalFarmers),
      icon: Users,
      tone: "green",
    },
    {
      label: "Total sugarcane supplied",
      value: `${numberFormatter.format(totalSugarcaneTons)} tonnes`,
      icon: Leaf,
      tone: "olive",
    },
    {
      label: "Total pending payments",
      value: currencyFormatter.format(totalPendingPayments),
      icon: Wallet,
      tone: "amber",
    },
    {
      label: "Total amount paid",
      value: currencyFormatter.format(totalAmountPaid),
      icon: IndianRupee,
      tone: "dark",
    },
  ];

  return (
    <div className="card-grid">
      {cards.map(({ label, value, icon: Icon, tone }) => (
        <div key={label} className={`stat-card ${tone}`}>
          <div className="stat-header">
            <div className="stat-icon-wrap">
              <Icon size={18} />
            </div>
            <span className="data-badge">
              {source === "fallback-demo" ? "Demo" : "Live"}
            </span>
          </div>
          <h3>{value}</h3>
          <p>{label}</p>
        </div>
      ))}
      <div className="stat-card compact highlight">
        <div className="stat-header">
          <div className="stat-icon-wrap">
            <TrendingUp size={18} />
          </div>
          <span className="data-badge">Source</span>
        </div>
        <h3>{source === "fallback-demo" ? "Fallback dataset" : "PostgreSQL"}</h3>
        <p>Operational data status</p>
      </div>
    </div>
  );
}

export default DashboardCards;
