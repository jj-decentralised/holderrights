import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface CategoryAnalysisProps {
  revenueByCategory: Record<string, number>;
  avgScoreByCategory: Record<string, number>;
}

function fmt(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function CategoryAnalysis({ revenueByCategory, avgScoreByCategory }: CategoryAnalysisProps) {
  const categories = Object.keys(revenueByCategory).sort(
    (a, b) => revenueByCategory[b] - revenueByCategory[a]
  );

  const revenueData = categories.map((cat) => ({
    category: cat,
    revenue: revenueByCategory[cat],
    avgScore: avgScoreByCategory[cat] || 0,
  }));

  const scoreData = Object.entries(avgScoreByCategory)
    .map(([category, score]) => ({ category, score, revenue: revenueByCategory[category] || 0 }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="category-section">
      <h2 className="section-title">Category Analysis</h2>
      <p className="section-desc">
        How do holder rights scores compare across DeFi verticals? Categories with stronger holder rights
        may show different revenue dynamics.
      </p>

      <div className="chart-grid">
        <div className="chart-container">
          <h3 className="chart-title">30d Revenue by Category</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={revenueData} margin={{ top: 10, right: 20, bottom: 60, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
              <XAxis
                dataKey="category"
                tick={{ fill: '#888', fontSize: 11 }}
                stroke="#ccc"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tickFormatter={fmt}
                tick={{ fill: '#888', fontSize: 11 }}
                stroke="#ccc"
              />
              <Tooltip
                formatter={(value) => [fmt(Number(value)), 'Revenue (30d)']}
                contentStyle={{ background: '#fff', border: '1px solid #ddd', color: '#333' }}
              />
              <Bar dataKey="revenue" fill="#1a1a1a" radius={[2, 2, 0, 0]}>
                {revenueData.map((_, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? '#1a1a1a' : '#888'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3 className="chart-title">Average Holder Rights Score by Category</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={scoreData} margin={{ top: 10, right: 20, bottom: 60, left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
              <XAxis
                dataKey="category"
                tick={{ fill: '#888', fontSize: 11 }}
                stroke="#ccc"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tick={{ fill: '#888', fontSize: 11 }}
                stroke="#ccc"
              />
              <Tooltip
                formatter={(value) => [Number(value).toFixed(1), 'Avg Rights Score']}
                contentStyle={{ background: '#fff', border: '1px solid #ddd', color: '#333' }}
              />
              <Bar dataKey="score" fill="#1a1a1a" radius={[2, 2, 0, 0]}>
                {scoreData.map((_, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? '#1a1a1a' : '#888'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
