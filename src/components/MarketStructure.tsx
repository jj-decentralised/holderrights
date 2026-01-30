import type { ServerAnalytics } from '../hooks/useDefiData';

function fmt(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

interface Props {
  analytics: ServerAnalytics;
}

export function MarketStructure({ analytics }: Props) {
  const ms = analytics.marketStructure;
  if (!ms) return null;

  return (
    <div className="analytics-section">
      <h2 className="section-title">Market Structure</h2>
      <p className="section-desc">
        Concentration metrics and structural overview of the DeFi ecosystem.
        The Herfindahl index measures market concentration — values above 0.25 indicate high concentration.
      </p>

      <div className="market-stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Protocols</div>
          <div className="stat-value">{ms.totalProtocols.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total TVL</div>
          <div className="stat-value">{fmt(ms.totalTvl)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue (30d)</div>
          <div className="stat-value">{fmt(ms.totalRevenue30d)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Market Cap</div>
          <div className="stat-value">{fmt(ms.totalMcap)}</div>
        </div>
      </div>

      <div className="market-concentration">
        <h3 className="analytics-subtitle">Concentration Metrics</h3>
        <div className="concentration-grid">
          <div className="concentration-card">
            <div className="concentration-label">Herfindahl Index (TVL)</div>
            <div className="concentration-value">{ms.herfindahlTvl.toFixed(4)}</div>
            <div className="concentration-desc">
              {ms.herfindahlTvl > 0.25 ? 'Highly concentrated' : ms.herfindahlTvl > 0.15 ? 'Moderately concentrated' : 'Competitive'}
            </div>
          </div>
          <div className="concentration-card">
            <div className="concentration-label">Top 10 TVL Share</div>
            <div className="concentration-value">{pct(ms.top10TvlShare)}</div>
            <div className="concentration-bar">
              <div className="concentration-fill" style={{ width: pct(ms.top10TvlShare) }} />
            </div>
          </div>
          <div className="concentration-card">
            <div className="concentration-label">Top 10 Revenue Share</div>
            <div className="concentration-value">{pct(ms.top10RevenueShare)}</div>
            <div className="concentration-bar">
              <div className="concentration-fill" style={{ width: pct(ms.top10RevenueShare) }} />
            </div>
          </div>
        </div>
      </div>

      <div className="market-data-coverage">
        <h3 className="analytics-subtitle">Data Coverage</h3>
        <div className="coverage-grid">
          <div className="coverage-item">
            <span className="coverage-count">{ms.protocolsWithRevenue}</span>
            <span className="coverage-label">with revenue data</span>
          </div>
          <div className="coverage-item">
            <span className="coverage-count">{ms.protocolsWithFees}</span>
            <span className="coverage-label">with fee data</span>
          </div>
          <div className="coverage-item">
            <span className="coverage-count">{ms.protocolsWithMcap}</span>
            <span className="coverage-label">with market cap</span>
          </div>
          <div className="coverage-item">
            <span className="coverage-count">{ms.protocolsWithTreasury}</span>
            <span className="coverage-label">with treasury data</span>
          </div>
          <div className="coverage-item">
            <span className="coverage-count">{ms.protocolsMultichain}</span>
            <span className="coverage-label">multi-chain</span>
          </div>
          <div className="coverage-item">
            <span className="coverage-count">{ms.avgChainCount.toFixed(1)}</span>
            <span className="coverage-label">avg chains per protocol</span>
          </div>
        </div>
      </div>
    </div>
  );
}
