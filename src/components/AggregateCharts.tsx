import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ComposedChart,
  Line,
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

function computeStats(data: { value: number }[]) {
  if (data.length === 0) return null;
  const values = data.map(d => d.value);
  const current = values[values.length - 1];
  const max = Math.max(...values);
  const min = Math.min(...values);

  const last7 = values.slice(-7);
  const last30 = values.slice(-30);
  const avg7d = last7.reduce((s, v) => s + v, 0) / last7.length;
  const avg30d = last30.reduce((s, v) => s + v, 0) / last30.length;

  const prior7 = values.slice(-14, -7);
  const prior30 = values.slice(-60, -30);
  const change7d = prior7.length > 0
    ? ((avg7d - prior7.reduce((s, v) => s + v, 0) / prior7.length) / (prior7.reduce((s, v) => s + v, 0) / prior7.length)) * 100
    : null;
  const change30d = prior30.length > 0
    ? ((avg30d - prior30.reduce((s, v) => s + v, 0) / prior30.length) / (prior30.reduce((s, v) => s + v, 0) / prior30.length)) * 100
    : null;

  return { current, max, min, avg7d, avg30d, change7d, change30d };
}

function computeTvlStats(data: { tvl: number }[]) {
  if (data.length === 0) return null;
  const values = data.map(d => d.tvl);
  const current = values[values.length - 1];
  const max = Math.max(...values);
  const min = Math.min(...values);

  const prior7 = data.length > 7 ? values[values.length - 8] : null;
  const prior30 = data.length > 30 ? values[values.length - 31] : null;
  const change7d = prior7 ? ((current - prior7) / prior7) * 100 : null;
  const change30d = prior30 ? ((current - prior30) / prior30) * 100 : null;

  return { current, max, min, change7d, change30d };
}

function addMovingAvg(data: { date: number; value: number }[], window: number) {
  return data.map((d, i) => {
    if (i < window - 1) return { ...d, ma: null as number | null };
    const slice = data.slice(i - window + 1, i + 1);
    const avg = slice.reduce((s, x) => s + x.value, 0) / window;
    return { ...d, ma: avg };
  });
}

function ChgBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const cls = value > 0 ? 'positive' : value < 0 ? 'negative' : '';
  return <span className={`chg-badge ${cls}`}>{value > 0 ? '+' : ''}{value.toFixed(1)}%</span>;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="chart-stat-item">
      <span className="chart-stat-label">{label}</span>
      <span className="chart-stat-val">{value}</span>
    </div>
  );
}

export function AggregateCharts({ historicalTvl, aggregateRevenue, aggregateFees, aggregateDexVolume }: AggregateChartsProps) {
  const tvlStats = computeTvlStats(historicalTvl);
  const revStats = computeStats(aggregateRevenue);
  const feeStats = computeStats(aggregateFees);
  const dexStats = computeStats(aggregateDexVolume);

  const revWithMa = addMovingAvg(aggregateRevenue, 7);
  const feeWithMa = addMovingAvg(aggregateFees, 7);
  const dexWithMa = addMovingAvg(aggregateDexVolume, 7);

  return (
    <div className="aggregate-charts-section">
      <h2 className="section-title">DeFi Market Overview</h2>
      <p className="section-desc">
        Historical time-series across the entire DeFi ecosystem. 7-day moving averages smooth daily volatility.
        Period changes compare recent averages to prior period averages.
      </p>

      {/* TVL Chart — full width */}
      {historicalTvl.length > 0 && (
        <div className="chart-container chart-container-full">
          <div className="chart-header-row">
            <div>
              <h3 className="chart-title">Total DeFi TVL</h3>
              <div className="chart-current-price">{fmtDollar(tvlStats?.current || 0)}</div>
            </div>
            {tvlStats && (
              <div className="chart-stats-row">
                <div className="chart-stat-group">
                  <span className="chart-stat-label">7d</span>
                  <ChgBadge value={tvlStats.change7d} />
                </div>
                <div className="chart-stat-group">
                  <span className="chart-stat-label">30d</span>
                  <ChgBadge value={tvlStats.change30d} />
                </div>
                <StatRow label="Peak" value={fmtDollar(tvlStats.max)} />
                <StatRow label="Trough" value={fmtDollar(tvlStats.min)} />
              </div>
            )}
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={historicalTvl} margin={{ top: 5, right: 20, bottom: 25, left: 50 }}>
              <defs>
                <linearGradient id="tvlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1a1a1a" stopOpacity={0.12} />
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

      <div className="chart-grid" style={{ marginTop: 24 }}>
        {/* Revenue with 7d MA */}
        {aggregateRevenue.length > 0 && (
          <div className="chart-container">
            <div className="chart-header-row">
              <div>
                <h3 className="chart-title">Daily Revenue</h3>
                <div className="chart-current-price">{fmtDollar(revStats?.current || 0)}/day</div>
              </div>
              {revStats && (
                <div className="chart-stats-col">
                  <div className="chart-stat-group">
                    <span className="chart-stat-label">7d avg</span>
                    <span className="chart-stat-val">{fmtDollar(revStats.avg7d)}</span>
                    <ChgBadge value={revStats.change7d} />
                  </div>
                  <div className="chart-stat-group">
                    <span className="chart-stat-label">30d avg</span>
                    <span className="chart-stat-val">{fmtDollar(revStats.avg30d)}</span>
                    <ChgBadge value={revStats.change30d} />
                  </div>
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={revWithMa} margin={{ top: 5, right: 20, bottom: 25, left: 50 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1a1a1a" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#1a1a1a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" interval="preserveStartEnd" />
                <YAxis tickFormatter={fmtDollar} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
                <Tooltip
                  formatter={(value, name) => [fmtDollar(Number(value)), name === 'ma' ? '7d MA' : 'Daily Revenue']}
                  labelFormatter={(ts) => formatDate(ts as number)}
                  contentStyle={{ background: '#fff', border: '1px solid #ddd', color: '#333' }}
                />
                <Area type="monotone" dataKey="value" stroke="#ccc" strokeWidth={0.5} fill="url(#revGrad)" dot={false} name="Daily Revenue" />
                <Line type="monotone" dataKey="ma" stroke="#1a1a1a" strokeWidth={2} dot={false} name="ma" connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Fees with 7d MA */}
        {aggregateFees.length > 0 && (
          <div className="chart-container">
            <div className="chart-header-row">
              <div>
                <h3 className="chart-title">Daily Fees</h3>
                <div className="chart-current-price">{fmtDollar(feeStats?.current || 0)}/day</div>
              </div>
              {feeStats && (
                <div className="chart-stats-col">
                  <div className="chart-stat-group">
                    <span className="chart-stat-label">7d avg</span>
                    <span className="chart-stat-val">{fmtDollar(feeStats.avg7d)}</span>
                    <ChgBadge value={feeStats.change7d} />
                  </div>
                  <div className="chart-stat-group">
                    <span className="chart-stat-label">30d avg</span>
                    <span className="chart-stat-val">{fmtDollar(feeStats.avg30d)}</span>
                    <ChgBadge value={feeStats.change30d} />
                  </div>
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={feeWithMa} margin={{ top: 5, right: 20, bottom: 25, left: 50 }}>
                <defs>
                  <linearGradient id="feeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1a1a1a" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#1a1a1a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" interval="preserveStartEnd" />
                <YAxis tickFormatter={fmtDollar} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
                <Tooltip
                  formatter={(value, name) => [fmtDollar(Number(value)), name === 'ma' ? '7d MA' : 'Daily Fees']}
                  labelFormatter={(ts) => formatDate(ts as number)}
                  contentStyle={{ background: '#fff', border: '1px solid #ddd', color: '#333' }}
                />
                <Area type="monotone" dataKey="value" stroke="#ccc" strokeWidth={0.5} fill="url(#feeGrad)" dot={false} name="Daily Fees" />
                <Line type="monotone" dataKey="ma" stroke="#1a1a1a" strokeWidth={2} dot={false} name="ma" connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* DEX Volume — full width */}
      {aggregateDexVolume.length > 0 && (
        <div className="chart-container chart-container-full" style={{ marginTop: 24 }}>
          <div className="chart-header-row">
            <div>
              <h3 className="chart-title">DEX Trading Volume</h3>
              <div className="chart-current-price">{fmtDollar(dexStats?.current || 0)}/day</div>
            </div>
            {dexStats && (
              <div className="chart-stats-row">
                <div className="chart-stat-group">
                  <span className="chart-stat-label">7d avg</span>
                  <span className="chart-stat-val">{fmtDollar(dexStats.avg7d)}</span>
                  <ChgBadge value={dexStats.change7d} />
                </div>
                <div className="chart-stat-group">
                  <span className="chart-stat-label">30d avg</span>
                  <span className="chart-stat-val">{fmtDollar(dexStats.avg30d)}</span>
                  <ChgBadge value={dexStats.change30d} />
                </div>
                <StatRow label="Peak" value={fmtDollar(dexStats.max)} />
              </div>
            )}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={dexWithMa} margin={{ top: 5, right: 20, bottom: 25, left: 50 }}>
              <defs>
                <linearGradient id="dexGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1a1a1a" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#1a1a1a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" interval="preserveStartEnd" />
              <YAxis tickFormatter={fmtDollar} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
              <Tooltip
                formatter={(value, name) => [fmtDollar(Number(value)), name === 'ma' ? '7d MA' : 'Daily Volume']}
                labelFormatter={(ts) => formatDate(ts as number)}
                contentStyle={{ background: '#fff', border: '1px solid #ddd', color: '#333' }}
              />
              <Area type="monotone" dataKey="value" stroke="#ccc" strokeWidth={0.5} fill="url(#dexGrad)" dot={false} name="Daily Volume" />
              <Line type="monotone" dataKey="ma" stroke="#1a1a1a" strokeWidth={2} dot={false} name="ma" connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
