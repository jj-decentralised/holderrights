import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import type { ServerAnalytics } from '../hooks/useDefiData';

function fmt(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function pct(part: number, total: number): string {
  if (!total) return '0%';
  return `${((part / total) * 100).toFixed(1)}%`;
}

const tooltipStyle = {
  background: 'rgba(255,255,255,0.96)',
  border: '1px solid #e0e0dd',
  borderRadius: '6px',
  fontSize: 13,
  color: '#333',
} as const;

const COMPOSITION_COLORS = ['#4a7c59', '#4a6fa5', '#c17f3e', '#999'] as const;

interface ProtocolTreasury {
  name: string;
  slug: string;
  category: string;
  tvl: number;
  treasuryTotal: number;
  treasuryStablecoins: number;
  treasuryMajors: number;
  treasuryOwnTokens: number;
  treasuryOthers: number;
}

interface Props {
  analytics: ServerAnalytics;
  protocols: ProtocolTreasury[];
}

export function TreasuryHealth({ analytics: _analytics, protocols }: Props) {
  const withTreasury = protocols.filter((p) => p.treasuryTotal > 0);

  if (withTreasury.length === 0) return null;

  const totalTreasury = withTreasury.reduce((s, p) => s + p.treasuryTotal, 0);
  const totalStablecoins = withTreasury.reduce((s, p) => s + p.treasuryStablecoins, 0);
  const totalMajors = withTreasury.reduce((s, p) => s + p.treasuryMajors, 0);
  const totalOwnTokens = withTreasury.reduce((s, p) => s + p.treasuryOwnTokens, 0);
  const totalOthers = withTreasury.reduce((s, p) => s + p.treasuryOthers, 0);

  const pieData = [
    { name: 'Stablecoins', value: totalStablecoins, fill: COMPOSITION_COLORS[0] },
    { name: 'Major Crypto', value: totalMajors, fill: COMPOSITION_COLORS[1] },
    { name: 'Own Tokens', value: totalOwnTokens, fill: COMPOSITION_COLORS[2] },
    { name: 'Other', value: totalOthers, fill: COMPOSITION_COLORS[3] },
  ].filter((d) => d.value > 0);

  const top10 = [...withTreasury]
    .sort((a, b) => b.treasuryTotal - a.treasuryTotal)
    .slice(0, 10)
    .map((p) => ({ name: p.name, value: p.treasuryTotal }));

  const top15 = [...withTreasury]
    .sort((a, b) => b.treasuryTotal - a.treasuryTotal)
    .slice(0, 15);

  return (
    <div className="analytics-section">
      <h2 className="section-title">Treasury Health</h2>
      <p className="section-desc">
        Aggregate treasury composition across DeFi protocols. Protocols with larger stablecoin
        reserves have stronger runway and lower liquidation risk.
      </p>

      <div className="market-stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Treasury Value</div>
          <div className="stat-value">{fmt(totalTreasury)}</div>
          <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
            {withTreasury.length} protocols
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Stablecoin Holdings</div>
          <div className="stat-value">{fmt(totalStablecoins)}</div>
          <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
            {pct(totalStablecoins, totalTreasury)} of total
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Own Token Holdings</div>
          <div className="stat-value">{fmt(totalOwnTokens)}</div>
          <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
            {pct(totalOwnTokens, totalTreasury)} of total
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Major Crypto Holdings</div>
          <div className="stat-value">{fmt(totalMajors)}</div>
          <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
            {pct(totalMajors, totalTreasury)} of total
          </div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-card-title">Aggregate Treasury Composition</h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={110}
                innerRadius={50}
                paddingAngle={2}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(1)}%`
                }
                labelLine={{ stroke: '#999' }}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [fmt(value), 'Value']}
                contentStyle={tooltipStyle}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-card-title">Top 10 Treasury Holdings</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={top10}
              layout="vertical"
              margin={{ top: 5, right: 30, bottom: 5, left: 100 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
              <XAxis
                type="number"
                tickFormatter={(v) => fmt(v)}
                tick={{ fill: '#888', fontSize: 11 }}
                stroke="#ccc"
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#1a1a1a', fontSize: 12 }}
                stroke="#ccc"
                width={95}
              />
              <Tooltip
                formatter={(value: number) => [fmt(value), 'Treasury']}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="value" fill="#1a1a1a" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="analytics-table-wrapper">
        <table className="category-summary-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>TVL</th>
              <th style={{ textAlign: 'right' }}>Treasury Total</th>
              <th style={{ textAlign: 'right' }}>Stablecoins</th>
              <th style={{ textAlign: 'right' }}>Own Token</th>
              <th style={{ textAlign: 'right' }}>Stables %</th>
              <th style={{ textAlign: 'right' }}>Treasury/TVL</th>
            </tr>
          </thead>
          <tbody>
            {top15.map((p, i) => (
              <tr key={p.slug}>
                <td style={{ color: '#888' }}>{i + 1}</td>
                <td className="cat-name-cell">{p.name}</td>
                <td><span className="category-badge">{p.category}</span></td>
                <td className="num-cell">{fmt(p.tvl)}</td>
                <td className="num-cell">{fmt(p.treasuryTotal)}</td>
                <td className="num-cell">{fmt(p.treasuryStablecoins)}</td>
                <td className="num-cell">{fmt(p.treasuryOwnTokens)}</td>
                <td className="num-cell">{pct(p.treasuryStablecoins, p.treasuryTotal)}</td>
                <td className="num-cell">
                  {p.tvl > 0 ? `${((p.treasuryTotal / p.tvl) * 100).toFixed(1)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
