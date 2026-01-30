import type { ServerAnalytics } from '../hooks/useDefiData';

function fmt(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

interface HeaderProps {
  totalRevenue24h: number;
  totalFees24h: number;
  protocolCount: number;
  analytics: ServerAnalytics | null;
}

export function Header({ totalRevenue24h, totalFees24h, protocolCount, analytics }: HeaderProps) {
  const ms = analytics?.marketStructure;
  const retentionRate = totalRevenue24h > 0 && totalFees24h > 0
    ? ((totalRevenue24h / totalFees24h) * 100).toFixed(1)
    : null;

  const annualizedRevenue = totalRevenue24h * 365;
  const revenueToTvl = ms?.totalTvl > 0 ? ((annualizedRevenue / ms.totalTvl) * 100).toFixed(2) : null;
  const mcapToRevenue = ms?.totalMcap > 0 && annualizedRevenue > 0
    ? (ms.totalMcap / annualizedRevenue).toFixed(1)
    : null;

  return (
    <header className="header">
      <div className="header-title">
        <h1>DeFi Financial Analytics</h1>
        <p className="subtitle">
          Deep quantitative analysis of {protocolCount.toLocaleString()} DeFi protocols — revenue efficiency,
          capital allocation, security risk, funding flows, and token holder rights
        </p>
      </div>

      <div className="header-metrics">
        <div className="header-metric-row">
          <div className="metric-block">
            <div className="metric-label">Total Value Locked</div>
            <div className="metric-value">{ms ? fmt(ms.totalTvl) : '—'}</div>
            <div className="metric-sub">across {protocolCount.toLocaleString()} protocols</div>
          </div>
          <div className="metric-block">
            <div className="metric-label">Aggregate Market Cap</div>
            <div className="metric-value">{ms ? fmt(ms.totalMcap) : '—'}</div>
            <div className="metric-sub">
              {ms ? `${ms.protocolsWithMcap} protocols with token` : ''}
            </div>
          </div>
          <div className="metric-block">
            <div className="metric-label">Daily Revenue</div>
            <div className="metric-value">{fmt(totalRevenue24h)}</div>
            <div className="metric-sub">
              {revenueToTvl ? `${revenueToTvl}% annualized yield on TVL` : `${fmt(annualizedRevenue)}/yr annualized`}
            </div>
          </div>
          <div className="metric-block">
            <div className="metric-label">Daily Fees</div>
            <div className="metric-value">{fmt(totalFees24h)}</div>
            <div className="metric-sub">
              {retentionRate ? `${retentionRate}% retained as protocol revenue` : ''}
            </div>
          </div>
        </div>

        {ms && (
          <div className="header-derived-row">
            <div className="derived-stat">
              <span className="derived-label">Market P/E</span>
              <span className="derived-value">{mcapToRevenue ? `${mcapToRevenue}x` : '—'}</span>
            </div>
            <div className="derived-stat">
              <span className="derived-label">TVL Concentration</span>
              <span className="derived-value">
                Top 10 = {(ms.top10TvlShare * 100).toFixed(1)}%
              </span>
            </div>
            <div className="derived-stat">
              <span className="derived-label">Revenue Concentration</span>
              <span className="derived-value">
                Top 10 = {(ms.top10RevenueShare * 100).toFixed(1)}%
              </span>
            </div>
            <div className="derived-stat">
              <span className="derived-label">Herfindahl (TVL)</span>
              <span className="derived-value">
                {ms.herfindahlTvl.toFixed(4)}
                {' '}
                <span className="derived-tag">
                  {ms.herfindahlTvl > 0.25 ? 'concentrated' : ms.herfindahlTvl > 0.15 ? 'moderate' : 'competitive'}
                </span>
              </span>
            </div>
            <div className="derived-stat">
              <span className="derived-label">Multi-chain</span>
              <span className="derived-value">
                {ms.protocolsMultichain} protocols ({((ms.protocolsMultichain / ms.totalProtocols) * 100).toFixed(0)}%)
              </span>
            </div>
            <div className="derived-stat">
              <span className="derived-label">Fee Retention</span>
              <span className="derived-value">
                {retentionRate ? `${retentionRate}%` : '—'} ecosystem avg
              </span>
            </div>
          </div>
        )}
      </div>

      <p className="data-source">
        Data: DeFi Llama API ({ms?.protocolsWithRevenue || 0} with revenue,
        {' '}{ms?.protocolsWithFees || 0} with fees,
        {' '}{ms?.protocolsWithTreasury || 0} with treasury data) &middot; Updated every 4 hours
      </p>
    </header>
  );
}
