import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
  ZAxis,
} from 'recharts';
import type { CategoryStats } from '../hooks/useDefiData';

interface CategoryDeepDiveProps {
  categoryStats: CategoryStats[];
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtShort(n: number): string {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toFixed(0);
}

// Scatter data: one point per category
interface CatScatterPoint {
  category: string;
  avgScore: number;
  totalRevenue30d: number;
  totalTvl: number;
  protocolCount: number;
}

// Score range data for box-plot-style viz
interface ScoreRangePoint {
  category: string;
  min: number;
  max: number;
  avg: number;
  median: number;
  range: [number, number];
}

export function CategoryDeepDive({ categoryStats }: CategoryDeepDiveProps) {
  // Scatter: avg score vs total revenue, bubble size = TVL
  const scatterData: CatScatterPoint[] = categoryStats
    .filter((c) => c.totalRevenue30d > 0)
    .map((c) => ({
      category: c.category,
      avgScore: Math.round(c.avgScore * 10) / 10,
      totalRevenue30d: c.totalRevenue30d,
      totalTvl: c.totalTvl,
      protocolCount: c.protocolCount,
    }));

  // TVL by category (top 15)
  const tvlData = categoryStats
    .filter((c) => c.totalTvl > 0)
    .sort((a, b) => b.totalTvl - a.totalTvl)
    .slice(0, 15)
    .map((c) => ({
      category: c.category,
      tvl: c.totalTvl,
      mcap: c.totalMcap,
    }));

  // Score range data
  const scoreRangeData: ScoreRangePoint[] = categoryStats
    .filter((c) => c.protocolCount >= 2)
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 15)
    .map((c) => ({
      category: c.category,
      min: c.minScore,
      max: c.maxScore,
      avg: Math.round(c.avgScore * 10) / 10,
      median: c.medianScore,
      range: [c.minScore, c.maxScore],
    }));

  // Fee efficiency: revenue/fees ratio by category
  const efficiencyData = categoryStats
    .filter((c) => c.avgFeeToRevenue !== null && c.totalRevenue30d > 0)
    .sort((a, b) => (b.avgFeeToRevenue || 0) - (a.avgFeeToRevenue || 0))
    .slice(0, 15)
    .map((c) => ({
      category: c.category,
      ratio: Math.round((c.avgFeeToRevenue || 0) * 1000) / 10,
    }));

  return (
    <div className="deep-dive-section">
      <h2 className="section-title">Category Deep Dive</h2>
      <p className="section-desc">
        Multi-dimensional comparison across DeFi verticals — TVL concentration, holder rights distribution,
        revenue efficiency, and score spread within each category.
      </p>

      {/* Summary table */}
      <div className="category-summary-table-wrapper">
        <table className="category-summary-table">
          <thead>
            <tr>
              <th>Category</th>
              <th># Protocols</th>
              <th>Total TVL</th>
              <th>Total MCap</th>
              <th>Revenue 30d</th>
              <th>Fees 30d</th>
              <th>Avg Score</th>
              <th>Median Score</th>
              <th>Score Range</th>
            </tr>
          </thead>
          <tbody>
            {categoryStats.slice(0, 20).map((c) => (
              <tr key={c.category}>
                <td className="cat-name-cell">{c.category}</td>
                <td className="num-cell">{c.protocolCount}</td>
                <td className="num-cell">{fmt(c.totalTvl)}</td>
                <td className="num-cell">{fmt(c.totalMcap)}</td>
                <td className="num-cell">{fmt(c.totalRevenue30d)}</td>
                <td className="num-cell">{fmt(c.totalFees30d)}</td>
                <td className="num-cell">{c.avgScore.toFixed(1)}</td>
                <td className="num-cell">{c.medianScore}</td>
                <td className="num-cell">{c.minScore}–{c.maxScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="chart-grid" style={{ marginTop: 32 }}>
        {/* Scatter: Avg Score vs Total Revenue (bubble = TVL) */}
        <div className="chart-container">
          <h3 className="chart-title">Avg Holder Rights Score vs Category Revenue</h3>
          <div className="chart-meta">Bubble size = total category TVL</div>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis
                dataKey="avgScore"
                name="Avg Score"
                tick={{ fill: '#999', fontSize: 11 }}
                stroke="#333"
                label={{ value: 'Avg Holder Rights Score', position: 'bottom', fill: '#666', fontSize: 11 }}
              />
              <YAxis
                dataKey="totalRevenue30d"
                name="Revenue"
                tickFormatter={fmt}
                tick={{ fill: '#999', fontSize: 11 }}
                stroke="#333"
              />
              <ZAxis dataKey="totalTvl" range={[40, 400]} name="TVL" />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as CatScatterPoint;
                  return (
                    <div className="scatter-tooltip">
                      <div className="tooltip-name">{d.category}</div>
                      <div>Avg Score: {d.avgScore}</div>
                      <div>Revenue 30d: {fmt(d.totalRevenue30d)}</div>
                      <div>TVL: {fmt(d.totalTvl)}</div>
                      <div>Protocols: {d.protocolCount}</div>
                    </div>
                  );
                }}
              />
              <Scatter data={scatterData}>
                {scatterData.map((_, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? '#fff' : '#888'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* TVL by category */}
        <div className="chart-container">
          <h3 className="chart-title">Total Value Locked by Category</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={tvlData} margin={{ top: 10, right: 20, bottom: 60, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis
                dataKey="category"
                tick={{ fill: '#999', fontSize: 11 }}
                stroke="#333"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tickFormatter={(v) => `$${fmtShort(v)}`}
                tick={{ fill: '#999', fontSize: 11 }}
                stroke="#333"
              />
              <Tooltip
                formatter={(value) => [fmt(Number(value)), 'TVL']}
                contentStyle={{ background: '#111', border: '1px solid #333', color: '#ccc' }}
              />
              <Bar dataKey="tvl" fill="#fff" radius={[2, 2, 0, 0]}>
                {tvlData.map((_, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? '#fff' : '#888'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-grid" style={{ marginTop: 24 }}>
        {/* Score range by category (min/avg/max) */}
        <div className="chart-container">
          <h3 className="chart-title">Holder Rights Score Spread by Category</h3>
          <div className="chart-meta">Showing min, average, and max scores per category</div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={scoreRangeData} margin={{ top: 10, right: 20, bottom: 60, left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis
                dataKey="category"
                tick={{ fill: '#999', fontSize: 11 }}
                stroke="#333"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tick={{ fill: '#999', fontSize: 11 }}
                stroke="#333"
                domain={[0, 50]}
              />
              <Tooltip
                contentStyle={{ background: '#111', border: '1px solid #333', color: '#ccc' }}
                formatter={(value, name) => [
                  Number(value).toFixed(1),
                  name === 'max' ? 'Max Score' : name === 'avg' ? 'Avg Score' : 'Min Score',
                ]}
              />
              <Bar dataKey="min" fill="#333" radius={[2, 2, 0, 0]} name="min" />
              <Bar dataKey="avg" fill="#999" radius={[2, 2, 0, 0]} name="avg" />
              <Bar dataKey="max" fill="#fff" radius={[2, 2, 0, 0]} name="max" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue efficiency */}
        {efficiencyData.length > 0 && (
          <div className="chart-container">
            <h3 className="chart-title">Revenue Capture Rate by Category</h3>
            <div className="chart-meta">Average % of fees captured as protocol revenue</div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={efficiencyData} margin={{ top: 10, right: 20, bottom: 60, left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis
                  dataKey="category"
                  tick={{ fill: '#999', fontSize: 11 }}
                  stroke="#333"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: '#999', fontSize: 11 }}
                  stroke="#333"
                />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Revenue/Fees']}
                  contentStyle={{ background: '#111', border: '1px solid #333', color: '#ccc' }}
                />
                <Bar dataKey="ratio" fill="#fff" radius={[2, 2, 0, 0]}>
                  {efficiencyData.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? '#fff' : '#888'} />
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
