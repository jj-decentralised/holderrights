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

export function HackAnalysis({ analytics }: Props) {
  const hack = analytics.hackAnalysis;
  if (!hack || hack.totalHacks === 0) return null;

  const yearData = Object.entries(hack.hacksByYear as Record<string, { count: number; amount: number }>)
    .map(([year, d]) => ({ year, count: d.count, amount: d.amount }))
    .sort((a, b) => a.year.localeCompare(b.year));

  const chainData = Object.entries(hack.hacksByChain as Record<string, { count: number; amount: number }>)
    .map(([chain, d]) => ({ chain, count: d.count, amount: d.amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 15);

  const techniqueData = Object.entries(hack.hacksByTechnique as Record<string, { count: number; amount: number }>)
    .map(([technique, d]) => ({ technique, count: d.count, amount: d.amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  return (
    <div className="analytics-section">
      <h2 className="section-title">Security & Hack Analysis</h2>
      <p className="section-desc">
        Historical analysis of DeFi exploits and security incidents.
        {' '}{fmt(hack.totalValueLost)} lost across {hack.totalHacks} recorded incidents.
      </p>

      <div className="market-stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Incidents</div>
          <div className="stat-value">{hack.totalHacks}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Value Lost</div>
          <div className="stat-value hack-value">{fmt(hack.totalValueLost)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg per Hack</div>
          <div className="stat-value">{fmt(hack.totalValueLost / hack.totalHacks)}</div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-container">
          <h3 className="chart-title">Value Lost by Year</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearData} margin={{ top: 5, right: 20, bottom: 25, left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
              <XAxis dataKey="year" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
              <YAxis tickFormatter={fmt} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
              <Tooltip
                formatter={(value) => [fmt(Number(value)), 'Value Lost']}
                contentStyle={{ background: '#fff', border: '1px solid #ddd', color: '#333' }}
              />
              <Bar dataKey="amount" fill="#1a1a1a" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3 className="chart-title">Incidents by Year</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearData} margin={{ top: 5, right: 20, bottom: 25, left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
              <XAxis dataKey="year" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
              <YAxis tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
              <Tooltip
                formatter={(value) => [Number(value), 'Incidents']}
                contentStyle={{ background: '#fff', border: '1px solid #ddd', color: '#333' }}
              />
              <Bar dataKey="count" fill="#888" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-grid" style={{ marginTop: 24 }}>
        <div className="chart-container">
          <h3 className="chart-title">Value Lost by Chain</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chainData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
              <XAxis type="number" tickFormatter={fmt} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
              <YAxis type="category" dataKey="chain" tick={{ fill: '#1a1a1a', fontSize: 12 }} stroke="#ccc" width={70} />
              <Tooltip
                formatter={(value) => [fmt(Number(value)), 'Value Lost']}
                contentStyle={{ background: '#fff', border: '1px solid #ddd', color: '#333' }}
              />
              <Bar dataKey="amount" fill="#1a1a1a" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3 className="chart-title">Value Lost by Technique</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={techniqueData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
              <XAxis type="number" tickFormatter={fmt} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
              <YAxis type="category" dataKey="technique" tick={{ fill: '#1a1a1a', fontSize: 12 }} stroke="#ccc" width={110} />
              <Tooltip
                formatter={(value) => [fmt(Number(value)), 'Value Lost']}
                contentStyle={{ background: '#fff', border: '1px solid #ddd', color: '#333' }}
              />
              <Bar dataKey="amount" fill="#888" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {Array.isArray(hack.mostHackedProtocols) && hack.mostHackedProtocols.length > 0 && (
        <div className="analytics-table-wrapper" style={{ marginTop: 24 }}>
          <h3 className="analytics-subtitle">Most Affected Protocols</h3>
          <table className="category-summary-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Protocol</th>
                <th style={{ textAlign: 'right' }}>Incidents</th>
                <th style={{ textAlign: 'right' }}>Total Lost</th>
                <th style={{ textAlign: 'right' }}>Current TVL</th>
              </tr>
            </thead>
            <tbody>
              {hack.mostHackedProtocols.map((p: Record<string, unknown>, i: number) => (
                <tr key={p.slug as string}>
                  <td style={{ color: '#888' }}>{i + 1}</td>
                  <td className="cat-name-cell">{p.name as string}</td>
                  <td className="num-cell">{p.hackCount as number}</td>
                  <td className="num-cell hack-value">{fmt(p.totalLost as number)}</td>
                  <td className="num-cell">{fmt(p.tvl as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
