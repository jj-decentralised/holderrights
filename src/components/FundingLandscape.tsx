import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { ServerAnalytics } from '../hooks/useDefiData';

function fmt(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

interface Props {
  analytics: ServerAnalytics;
}

export function FundingLandscape({ analytics }: Props) {
  const funding = analytics.fundingAnalysis;
  if (!funding || funding.raiseCount === 0) return null;

  const yearData = Object.entries(funding.raisesByYear as Record<string, { count: number; amount: number }>)
    .map(([year, d]) => ({ year, count: d.count, amount: d.amount }))
    .sort((a, b) => a.year.localeCompare(b.year));

  return (
    <div className="analytics-section">
      <h2 className="section-title">Funding Landscape</h2>
      <p className="section-desc">
        Venture capital and fundraising activity across DeFi.
        {' '}{fmt(funding.totalRaised)} raised across {funding.raiseCount} recorded rounds.
      </p>

      <div className="market-stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Raised</div>
          <div className="stat-value">{fmt(funding.totalRaised)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Rounds</div>
          <div className="stat-value">{funding.raiseCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg per Round</div>
          <div className="stat-value">{fmt(funding.totalRaised / funding.raiseCount)}</div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-container">
          <h3 className="chart-title">Funding by Year</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearData} margin={{ top: 5, right: 20, bottom: 25, left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
              <XAxis dataKey="year" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
              <YAxis tickFormatter={fmt} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
              <Tooltip
                formatter={(value) => [fmt(Number(value)), 'Amount Raised']}
                contentStyle={{ background: '#fff', border: '1px solid #ddd', color: '#333' }}
              />
              <Bar dataKey="amount" fill="#1a1a1a" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3 className="chart-title">Rounds by Year</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearData} margin={{ top: 5, right: 20, bottom: 25, left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
              <XAxis dataKey="year" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
              <YAxis tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
              <Tooltip
                formatter={(value) => [Number(value), 'Rounds']}
                contentStyle={{ background: '#fff', border: '1px solid #ddd', color: '#333' }}
              />
              <Bar dataKey="count" fill="#888" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {Array.isArray(funding.topFundedProtocols) && funding.topFundedProtocols.length > 0 && (
        <div className="analytics-table-wrapper" style={{ marginTop: 24 }}>
          <h3 className="analytics-subtitle">Top Funded Protocols</h3>
          <table className="category-summary-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Protocol</th>
                <th style={{ textAlign: 'right' }}>Total Raised</th>
                <th style={{ textAlign: 'right' }}>TVL</th>
                <th style={{ textAlign: 'right' }}>MCap</th>
                <th style={{ textAlign: 'right' }}>Raised/TVL</th>
                <th style={{ textAlign: 'right' }}>Raised/MCap</th>
              </tr>
            </thead>
            <tbody>
              {funding.topFundedProtocols.map((p: Record<string, unknown>, i: number) => (
                <tr key={p.slug as string}>
                  <td style={{ color: '#888' }}>{i + 1}</td>
                  <td className="cat-name-cell">{p.name as string}</td>
                  <td className="num-cell">{fmt(p.totalRaised as number)}</td>
                  <td className="num-cell">{fmt(p.tvl as number)}</td>
                  <td className="num-cell">{p.mcap ? fmt(p.mcap as number) : '—'}</td>
                  <td className="num-cell">{p.raisedToTvl != null ? `${(p.raisedToTvl as number).toFixed(2)}x` : '—'}</td>
                  <td className="num-cell">{p.raisedToMcap != null ? `${(p.raisedToMcap as number).toFixed(2)}x` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
