import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import type { RightTypeStats } from '../hooks/useDefiData';

interface RightsBreakdownProps {
  rightTypeStats: RightTypeStats[];
  totalProtocols: number;
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

const FILLS = ['#1a1a1a', '#444', '#666', '#888', '#aaa', '#bbb', '#ccc'];

export function RightsBreakdown({ rightTypeStats, totalProtocols }: RightsBreakdownProps) {
  const adoptionData = rightTypeStats.map((r) => ({
    label: r.label,
    count: r.count,
    pct: Math.round((r.count / totalProtocols) * 100),
  }));

  const revenueData = rightTypeStats
    .filter((r) => r.avgRevenue30d !== null)
    .map((r) => ({
      label: r.label,
      avgRevenue: r.avgRevenue30d!,
      weight: r.weight,
    }))
    .sort((a, b) => b.avgRevenue - a.avgRevenue);

  const tvlData = rightTypeStats
    .filter((r) => r.avgTvl > 0)
    .map((r) => ({
      label: r.label,
      avgTvl: r.avgTvl,
    }))
    .sort((a, b) => b.avgTvl - a.avgTvl);

  const pieData = rightTypeStats.map((r, i) => ({
    name: r.label,
    value: r.count,
    fill: FILLS[i % FILLS.length],
  }));

  return (
    <div className="rights-breakdown-section">
      <h2 className="section-title">Holder Rights Distribution</h2>
      <p className="section-desc">
        How are different holder rights adopted across the {totalProtocols} tracked protocols?
        Which right types correlate with higher revenue and TVL?
      </p>

      <div className="rights-stats-grid">
        {rightTypeStats.map((r) => (
          <div key={r.right} className="rights-stat-card">
            <div className="rights-stat-header">
              <span className="rights-stat-label">{r.label}</span>
              <span className="rights-stat-weight">wt: {r.weight}</span>
            </div>
            <div className="rights-stat-count">
              {r.count} <span className="rights-stat-pct">({Math.round((r.count / totalProtocols) * 100)}%)</span>
            </div>
            <div className="rights-stat-details">
              <div>Avg Revenue 30d: {r.avgRevenue30d !== null ? fmt(r.avgRevenue30d) : '\u2014'}</div>
              <div>Avg TVL: {r.avgTvl > 0 ? fmt(r.avgTvl) : '\u2014'}</div>
              <div>Avg MCap: {r.avgMcap !== null ? fmt(r.avgMcap) : '\u2014'}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="chart-grid" style={{ marginTop: 32 }}>
        <div className="chart-container">
          <h3 className="chart-title">Right Type Adoption</h3>
          <div className="chart-meta">Number of protocols with each right type</div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={adoptionData} layout="vertical" margin={{ top: 10, right: 30, bottom: 10, left: 130 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
              <YAxis
                dataKey="label"
                type="category"
                tick={{ fill: '#888', fontSize: 11 }}
                stroke="#ccc"
                width={120}
              />
              <Tooltip
                formatter={(value, _name, props) => [
                  `${value} protocols (${props.payload.pct}%)`,
                  'Count',
                ]}
                contentStyle={{ background: '#fff', border: '1px solid #ddd', color: '#333' }}
              />
              <Bar dataKey="count" fill="#1a1a1a" radius={[0, 2, 2, 0]}>
                {adoptionData.map((_, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? '#1a1a1a' : '#888'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3 className="chart-title">Rights Adoption Share</h3>
          <div className="chart-meta">Relative adoption of each right type</div>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                innerRadius={60}
                paddingAngle={2}
                stroke="#fafaf8"
                strokeWidth={2}
                label={({ name, percent }: { name?: string | number; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${value} protocols`, 'Count']}
                contentStyle={{ background: '#fff', border: '1px solid #ddd', color: '#333' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-grid" style={{ marginTop: 24 }}>
        {revenueData.length > 0 && (
          <div className="chart-container">
            <h3 className="chart-title">Avg 30d Revenue by Right Type</h3>
            <div className="chart-meta">Higher value rights tend to correlate with more revenue</div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={revenueData} layout="vertical" margin={{ top: 10, right: 30, bottom: 10, left: 130 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" horizontal={false} />
                <XAxis type="number" tickFormatter={fmt} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
                <YAxis
                  dataKey="label"
                  type="category"
                  tick={{ fill: '#888', fontSize: 11 }}
                  stroke="#ccc"
                  width={120}
                />
                <Tooltip
                  formatter={(value) => [fmt(Number(value)), 'Avg Revenue 30d']}
                  contentStyle={{ background: '#fff', border: '1px solid #ddd', color: '#333' }}
                />
                <Bar dataKey="avgRevenue" fill="#1a1a1a" radius={[0, 2, 2, 0]}>
                  {revenueData.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? '#1a1a1a' : '#888'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {tvlData.length > 0 && (
          <div className="chart-container">
            <h3 className="chart-title">Avg TVL by Right Type</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={tvlData} layout="vertical" margin={{ top: 10, right: 30, bottom: 10, left: 130 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" horizontal={false} />
                <XAxis type="number" tickFormatter={fmt} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
                <YAxis
                  dataKey="label"
                  type="category"
                  tick={{ fill: '#888', fontSize: 11 }}
                  stroke="#ccc"
                  width={120}
                />
                <Tooltip
                  formatter={(value) => [fmt(Number(value)), 'Avg TVL']}
                  contentStyle={{ background: '#fff', border: '1px solid #ddd', color: '#333' }}
                />
                <Bar dataKey="avgTvl" fill="#1a1a1a" radius={[0, 2, 2, 0]}>
                  {tvlData.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? '#1a1a1a' : '#888'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
