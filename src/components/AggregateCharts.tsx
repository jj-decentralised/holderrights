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
  aggregateFees: { date: number; value: number }[];
  aggregateDexVolume: { date: number; value: number }[];
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

function AggChart({ id, title, data, dataKey, label }: {
  id: string; title: string; data: { date: number; [k: string]: number }[];
  dataKey: string; label: string;
}) {
  if (data.length === 0) return null;
  const lastVal = data[data.length - 1]?.[dataKey] || 0;
  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <div className="chart-current-price">{fmtDollar(lastVal)}/day</div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 25, left: 50 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a1a1a" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#1a1a1a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
          <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" interval="preserveStartEnd" />
          <YAxis tickFormatter={fmtDollar} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
          <Tooltip
            formatter={(value) => [fmtDollar(Number(value)), label]}
            labelFormatter={(ts) => formatDate(ts as number)}
            contentStyle={{ background: '#fff', border: '1px solid #ddd', color: '#333' }}
          />
          <Area type="monotone" dataKey={dataKey} stroke="#1a1a1a" strokeWidth={1.5} fill={`url(#${id})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AggregateCharts({ historicalTvl, aggregateRevenue, aggregateFees, aggregateDexVolume }: AggregateChartsProps) {
  return (
    <div className="aggregate-charts-section">
      <h2 className="section-title">DeFi Market Overview</h2>
      <p className="section-desc">
        Total DeFi TVL, aggregate daily revenue, fees, and DEX trading volume across all protocols tracked by DeFi Llama.
      </p>

      <div className="chart-grid">
        {historicalTvl.length > 0 && (
          <div className="chart-container">
            <h3 className="chart-title">Total DeFi TVL (1 Year)</h3>
            <div className="chart-current-price">{fmtDollar(historicalTvl[historicalTvl.length - 1]?.tvl || 0)}</div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={historicalTvl} margin={{ top: 5, right: 20, bottom: 25, left: 50 }}>
                <defs>
                  <linearGradient id="tvlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1a1a1a" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#1a1a1a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" interval="preserveStartEnd" />
                <YAxis tickFormatter={fmtDollar} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" domain={['auto', 'auto']} />
                <Tooltip
                  formatter={(value) => [fmtDollar(Number(value)), 'TVL']}
                  labelFormatter={(ts) => formatDate(ts as number)}
                  contentStyle={{ background: '#fff', border: '1px solid #ddd', color: '#333' }}
                />
                <Area type="monotone" dataKey="tvl" stroke="#1a1a1a" strokeWidth={1.5} fill="url(#tvlGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <AggChart id="aggRevGrad" title="DeFi Daily Revenue" data={aggregateRevenue} dataKey="value" label="Daily Revenue" />
        <AggChart id="aggFeesGrad" title="DeFi Daily Fees" data={aggregateFees} dataKey="value" label="Daily Fees" />
        <AggChart id="aggDexGrad" title="DEX Trading Volume" data={aggregateDexVolume} dataKey="value" label="Daily Volume" />
      </div>
    </div>
  );
}
