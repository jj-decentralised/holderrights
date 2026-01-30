import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { ServerAnalytics } from '../hooks/useDefiData';

function fmt(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

interface Props {
  analytics: ServerAnalytics;
}

export function ChainDominance({ analytics }: Props) {
  const data = analytics.chainAnalysis;
  if (!Array.isArray(data) || data.length === 0) return null;

  const chartData = data.slice(0, 15).map((c: Record<string, unknown>) => ({
    chain: c.chain as string,
    totalTvl: c.totalTvl as number,
    totalRevenue30d: c.totalRevenue30d as number,
    protocolCount: c.protocolCount as number,
  }));

  return (
    <div className="analytics-section">
      <h2 className="section-title">Chain Dominance</h2>
      <p className="section-desc">
        TVL and revenue distribution across blockchain networks.
        Protocol counts are attributed to every chain a protocol supports; TVL and revenue are attributed to the primary chain.
      </p>

      <div className="chart-grid">
        <div className="chart-container">
          <h3 className="chart-title">TVL by Chain — Top 15</h3>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
              <XAxis type="number" tickFormatter={fmt} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
              <YAxis type="category" dataKey="chain" tick={{ fill: '#1a1a1a', fontSize: 12 }} stroke="#ccc" width={70} />
              <Tooltip
                formatter={(value) => [fmt(Number(value)), 'TVL']}
                contentStyle={{ background: '#fff', border: '1px solid #ddd', color: '#333' }}
              />
              <Bar dataKey="totalTvl" fill="#1a1a1a" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3 className="chart-title">Revenue (30d) by Chain — Top 15</h3>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
              <XAxis type="number" tickFormatter={fmt} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
              <YAxis type="category" dataKey="chain" tick={{ fill: '#1a1a1a', fontSize: 12 }} stroke="#ccc" width={70} />
              <Tooltip
                formatter={(value) => [fmt(Number(value)), 'Revenue (30d)']}
                contentStyle={{ background: '#fff', border: '1px solid #ddd', color: '#333' }}
              />
              <Bar dataKey="totalRevenue30d" fill="#888" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="analytics-table-wrapper" style={{ marginTop: 24 }}>
        <table className="category-summary-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Chain</th>
              <th style={{ textAlign: 'right' }}>Protocols</th>
              <th style={{ textAlign: 'right' }}>TVL</th>
              <th style={{ textAlign: 'right' }}>Revenue (30d)</th>
              <th style={{ textAlign: 'right' }}>Fees (30d)</th>
              <th style={{ textAlign: 'right' }}>Rev/TVL</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c: Record<string, unknown>, i: number) => (
              <tr key={c.chain as string}>
                <td style={{ color: '#888' }}>{i + 1}</td>
                <td className="cat-name-cell">{c.chain as string}</td>
                <td className="num-cell">{c.protocolCount as number}</td>
                <td className="num-cell">{fmt(c.totalTvl as number)}</td>
                <td className="num-cell">{(c.totalRevenue30d as number) > 0 ? fmt(c.totalRevenue30d as number) : '—'}</td>
                <td className="num-cell">{(c.totalFees30d as number) > 0 ? fmt(c.totalFees30d as number) : '—'}</td>
                <td className="num-cell">
                  {(c.totalTvl as number) > 0 && (c.totalRevenue30d as number) > 0
                    ? `${(((c.totalRevenue30d as number) / (c.totalTvl as number)) * 100).toFixed(3)}%`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
