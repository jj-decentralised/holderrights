import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface AggregateChartsProps {
  historicalTvl: { date: number; tvl: number }[];
  aggregateRevenue: { date: number; value: number }[];
}

function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function fmtDollar(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export function AggregateCharts({ historicalTvl, aggregateRevenue }: AggregateChartsProps) {
  return (
    <div className="aggregate-charts-section">
      <h2 className="section-title">DeFi Market Overview</h2>
      <p className="section-desc">
        Total DeFi TVL and aggregate daily revenue across all protocols tracked by DeFi Llama.
      </p>

      <div className="chart-grid">
        {/* Historical TVL */}
        {historicalTvl.length > 0 && (
          <div className="chart-container">
            <h3 className="chart-title">Total DeFi TVL (1 Year)</h3>
            <div className="chart-current-price">{fmtDollar(historicalTvl[historicalTvl.length - 1]?.tvl || 0)}</div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={historicalTvl} margin={{ top: 5, right: 20, bottom: 25, left: 50 }}>
                <defs>
                  <linearGradient id="tvlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fff" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#fff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fill: '#666', fontSize: 11 }}
                  stroke="#333"
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={fmtDollar}
                  tick={{ fill: '#666', fontSize: 11 }}
                  stroke="#333"
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  formatter={(value) => [fmtDollar(Number(value)), 'TVL']}
                  labelFormatter={(ts) => formatDate(ts as number)}
                  contentStyle={{ background: '#111', border: '1px solid #333', color: '#ccc' }}
                />
                <Area
                  type="monotone"
                  dataKey="tvl"
                  stroke="#fff"
                  strokeWidth={1.5}
                  fill="url(#tvlGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Aggregate Revenue */}
        {aggregateRevenue.length > 0 && (
          <div className="chart-container">
            <h3 className="chart-title">DeFi Daily Revenue (All Protocols)</h3>
            <div className="chart-current-price">
              {fmtDollar(aggregateRevenue[aggregateRevenue.length - 1]?.value || 0)}/day
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={aggregateRevenue} margin={{ top: 5, right: 20, bottom: 25, left: 50 }}>
                <defs>
                  <linearGradient id="aggRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fff" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#fff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fill: '#666', fontSize: 11 }}
                  stroke="#333"
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={fmtDollar}
                  tick={{ fill: '#666', fontSize: 11 }}
                  stroke="#333"
                />
                <Tooltip
                  formatter={(value) => [fmtDollar(Number(value)), 'Daily Revenue']}
                  labelFormatter={(ts) => formatDate(ts as number)}
                  contentStyle={{ background: '#111', border: '1px solid #333', color: '#ccc' }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#fff"
                  strokeWidth={1.5}
                  fill="url(#aggRevGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
