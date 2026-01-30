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

export function RevenueEfficiency({ analytics }: Props) {
  const data = analytics.revenueEfficiency;
  if (!Array.isArray(data) || data.length === 0) return null;

  const chartData = data.slice(0, 20).map((p: Record<string, unknown>) => ({
    name: p.name as string,
    revenuePerTvl: ((p.revenuePerTvl as number) * 100),
    revenue30d: p.revenue30d as number,
    tvl: p.tvl as number,
  }));

  return (
    <div className="analytics-section">
      <h2 className="section-title">Revenue Efficiency</h2>
      <p className="section-desc">
        Which protocols extract the most revenue per dollar of TVL?
        Revenue/TVL ratio measures capital productivity — higher means the protocol generates more revenue relative to locked capital.
      </p>

      <div className="chart-container">
        <h3 className="chart-title">Revenue / TVL Ratio — Top 20</h3>
        <ResponsiveContainer width="100%" height={500}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 120 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
            <XAxis type="number" tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
            <YAxis type="category" dataKey="name" tick={{ fill: '#1a1a1a', fontSize: 12 }} stroke="#ccc" width={110} />
            <Tooltip
              formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Revenue/TVL (30d)']}
              contentStyle={{ background: '#fff', border: '1px solid #ddd', color: '#333' }}
            />
            <Bar dataKey="revenuePerTvl" fill="#1a1a1a" radius={[0, 2, 2, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="analytics-table-wrapper">
        <table className="category-summary-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Protocol</th>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>TVL</th>
              <th style={{ textAlign: 'right' }}>Revenue (30d)</th>
              <th style={{ textAlign: 'right' }}>Rev/TVL</th>
              <th style={{ textAlign: 'right' }}>Fee Retention</th>
              <th style={{ textAlign: 'right' }}>MC/Rev</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 30).map((p: Record<string, unknown>, i: number) => (
              <tr key={p.slug as string}>
                <td style={{ color: '#888' }}>{i + 1}</td>
                <td className="cat-name-cell">{p.name as string}</td>
                <td><span className="category-badge">{p.category as string}</span></td>
                <td className="num-cell">{fmt(p.tvl as number)}</td>
                <td className="num-cell">{fmt(p.revenue30d as number)}</td>
                <td className="num-cell">{((p.revenuePerTvl as number) * 100).toFixed(2)}%</td>
                <td className="num-cell">{p.revenueRetention != null ? `${((p.revenueRetention as number) * 100).toFixed(0)}%` : '—'}</td>
                <td className="num-cell">{p.mcapToRevenue != null ? `${(p.mcapToRevenue as number).toFixed(1)}x` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
