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

export function YieldLandscape({ analytics }: Props) {
  const yld = analytics.yieldAnalysis;
  if (!yld || yld.protocolsWithYield === 0) return null;

  const catApyData = Object.entries(yld.avgApyByCategory as Record<string, { avg: number; median: number; count: number }>)
    .map(([category, d]) => ({ category, avg: d.avg, median: d.median, count: d.count }))
    .filter(d => d.count >= 2)
    .sort((a, b) => b.median - a.median)
    .slice(0, 15);

  return (
    <div className="analytics-section">
      <h2 className="section-title">Yield Landscape</h2>
      <p className="section-desc">
        DeFi yield opportunities across protocols and categories.
        {' '}{yld.totalPools.toLocaleString()} pools tracked across {yld.protocolsWithYield} protocols.
      </p>

      <div className="market-stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Pools</div>
          <div className="stat-value">{yld.totalPools.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Protocols with Yield</div>
          <div className="stat-value">{yld.protocolsWithYield}</div>
        </div>
      </div>

      <div className="chart-container" style={{ marginTop: 24 }}>
        <h3 className="chart-title">Median APY by Category</h3>
        <ResponsiveContainer width="100%" height={450}>
          <BarChart data={catApyData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 120 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
            <XAxis
              type="number" tickFormatter={(v) => `${v.toFixed(0)}%`}
              tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
            />
            <YAxis type="category" dataKey="category" tick={{ fill: '#1a1a1a', fontSize: 12 }} stroke="#ccc" width={110} />
            <Tooltip
              formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Median APY']}
              contentStyle={{ background: '#fff', border: '1px solid #ddd', color: '#333' }}
            />
            <Bar dataKey="median" fill="#1a1a1a" radius={[0, 2, 2, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {Array.isArray(yld.topByApy) && yld.topByApy.length > 0 && (
        <div className="analytics-table-wrapper" style={{ marginTop: 24 }}>
          <h3 className="analytics-subtitle">Highest Yielding Protocols</h3>
          <table className="category-summary-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Protocol</th>
                <th style={{ textAlign: 'right' }}>Top APY</th>
                <th style={{ textAlign: 'right' }}>Avg APY</th>
                <th style={{ textAlign: 'right' }}>Pools</th>
                <th style={{ textAlign: 'right' }}>TVL</th>
              </tr>
            </thead>
            <tbody>
              {yld.topByApy.map((p: Record<string, unknown>, i: number) => (
                <tr key={p.slug as string}>
                  <td style={{ color: '#888' }}>{i + 1}</td>
                  <td className="cat-name-cell">{p.name as string}</td>
                  <td className="num-cell">{(p.topApy as number).toFixed(1)}%</td>
                  <td className="num-cell">{p.avgApy != null ? `${(p.avgApy as number).toFixed(1)}%` : '—'}</td>
                  <td className="num-cell">{p.poolCount as number}</td>
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
