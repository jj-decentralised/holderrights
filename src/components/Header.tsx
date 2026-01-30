interface HeaderProps {
  totalRevenue24h: number;
  totalFees24h: number;
  protocolCount: number;
}

function fmt(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function Header({ totalRevenue24h, totalFees24h, protocolCount }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-title">
        <h1>Holder Rights Analysis</h1>
        <p className="subtitle">
          Correlation between token holder rights, revenue accrual, and market performance across DeFi protocols
        </p>
      </div>
      <div className="header-stats">
        <div className="stat-card">
          <div className="stat-label">Protocols Tracked</div>
          <div className="stat-value">{protocolCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total DeFi Revenue (24h)</div>
          <div className="stat-value">{fmt(totalRevenue24h)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total DeFi Fees (24h)</div>
          <div className="stat-value">{fmt(totalFees24h)}</div>
        </div>
      </div>
      <p className="data-source">Data source: DeFi Llama API &middot; Updated live</p>
    </header>
  );
}
