import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { PulseData } from '../hooks/useDefiData';

function fmt(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function ChgCell({ value }: { value: number | null }) {
  if (value === null) return <span className="pulse-na">—</span>;
  const cls = value > 0 ? 'positive' : value < 0 ? 'negative' : '';
  return <span className={`pulse-chg ${cls}`}>{value > 0 ? '+' : ''}{value.toFixed(2)}%</span>;
}

interface Props {
  pulse: PulseData;
}

export function MarketPulse({ pulse }: Props) {
  if (!pulse || !pulse.deltas) {
    return (
      <div className="pulse-section">
        <h2 className="section-title">Market Pulse</h2>
        <p className="section-desc">
          Hourly monitoring of key DeFi metrics. Data collection starts when the server boots —
          change detection improves as more hourly snapshots accumulate.
        </p>
        <div className="pulse-waiting">
          <div className="pulse-waiting-text">
            Collecting hourly snapshots... {pulse?.snapshotCount || 0} of 2+ needed for change detection.
            {pulse?.snapshotCount === 1 && ' Next snapshot in ~1 hour.'}
          </div>
        </div>
      </div>
    );
  }

  const { deltas, topMovers, alerts, stablecoinBreakdown, timeSeries } = pulse;
  const snapshotCount = pulse.snapshotCount || 0;
  const hoursTracked = snapshotCount > 0
    ? ((pulse.latestTimestamp - pulse.oldestTimestamp) / (1000 * 60 * 60)).toFixed(1)
    : '0';

  const metrics = [
    { label: 'Total TVL', data: deltas.tvl, key: 'tvl' },
    { label: 'Daily Revenue', data: deltas.revenue24h, key: 'revenue24h' },
    { label: 'Daily Fees', data: deltas.fees24h, key: 'fees24h' },
    { label: 'DEX Volume', data: deltas.dexVolume24h, key: 'dexVolume24h' },
    { label: 'Stablecoin MCap', data: deltas.stablecoinMcap, key: 'stablecoinMcap' },
  ];

  return (
    <div className="pulse-section">
      <h2 className="section-title">Market Pulse</h2>
      <p className="section-desc">
        Real-time monitoring of key DeFi metrics — polled hourly from DeFi Llama.
        {' '}{snapshotCount} snapshots collected over {hoursTracked} hours.
        Significant movements are automatically flagged.
      </p>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="pulse-alerts">
          {alerts.map((alert: Record<string, unknown>, i: number) => (
            <div key={i} className={`pulse-alert pulse-alert-${alert.severity}`}>
              <span className="pulse-alert-badge">{alert.metric as string}</span>
              <span className="pulse-alert-msg">{alert.message as string}</span>
            </div>
          ))}
        </div>
      )}

      {/* Metric deltas table */}
      <div className="pulse-metrics-table-wrapper">
        <table className="pulse-metrics-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th style={{ textAlign: 'right' }}>Current</th>
              <th style={{ textAlign: 'right' }}>1h Change</th>
              <th style={{ textAlign: 'right' }}>6h Change</th>
              <th style={{ textAlign: 'right' }}>24h Change</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.key}>
                <td className="pulse-metric-name">{m.label}</td>
                <td className="num-cell">{fmt(m.data.current)}</td>
                <td className="num-cell"><ChgCell value={m.data.change1h} /></td>
                <td className="num-cell"><ChgCell value={m.data.change6h} /></td>
                <td className="num-cell"><ChgCell value={m.data.change24h} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sparkline charts */}
      {Array.isArray(timeSeries) && timeSeries.length >= 3 && (
        <div className="pulse-sparklines">
          {[
            { key: 'tvl', label: 'TVL', color: '#1a1a1a' },
            { key: 'revenue24h', label: 'Revenue', color: '#1a1a1a' },
            { key: 'dexVolume24h', label: 'DEX Volume', color: '#1a1a1a' },
            { key: 'stablecoinMcap', label: 'Stablecoin MCap', color: '#1a1a1a' },
          ].map((chart) => (
            <div key={chart.key} className="pulse-sparkline">
              <div className="pulse-sparkline-label">{chart.label}</div>
              <ResponsiveContainer width="100%" height={60}>
                <AreaChart data={timeSeries} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={`spark-${chart.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chart.color} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={chart.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="timestamp" hide />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip
                    formatter={(v) => [fmt(Number(v)), chart.label]}
                    labelFormatter={(ts) => formatTime(ts as number)}
                    contentStyle={{ background: '#fff', border: '1px solid #ddd', color: '#333', fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey={chart.key}
                    stroke={chart.color}
                    strokeWidth={1.5}
                    fill={`url(#spark-${chart.key})`}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}

      <div className="pulse-bottom-row">
        {/* Top movers */}
        {Array.isArray(topMovers) && topMovers.length > 0 && (
          <div className="pulse-movers">
            <h3 className="analytics-subtitle">Significant TVL Movers (1h)</h3>
            <table className="category-summary-table">
              <thead>
                <tr>
                  <th>Protocol</th>
                  <th style={{ textAlign: 'right' }}>TVL</th>
                  <th style={{ textAlign: 'right' }}>1h Change</th>
                  <th style={{ textAlign: 'right' }}>MCap</th>
                </tr>
              </thead>
              <tbody>
                {topMovers.map((m: Record<string, unknown>) => (
                  <tr key={m.slug as string}>
                    <td className="cat-name-cell">{m.name as string}</td>
                    <td className="num-cell">{fmt(m.tvl as number)}</td>
                    <td className="num-cell"><ChgCell value={m.change1h as number} /></td>
                    <td className="num-cell">{m.mcap ? fmt(m.mcap as number) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Stablecoin supply */}
        {Array.isArray(stablecoinBreakdown) && stablecoinBreakdown.length > 0 && (
          <div className="pulse-stablecoins">
            <h3 className="analytics-subtitle">Stablecoin Supply</h3>
            <table className="category-summary-table">
              <thead>
                <tr>
                  <th>Stablecoin</th>
                  <th style={{ textAlign: 'right' }}>Market Cap</th>
                </tr>
              </thead>
              <tbody>
                {stablecoinBreakdown.map((s: Record<string, unknown>) => (
                  <tr key={s.symbol as string}>
                    <td className="cat-name-cell">{s.name as string} ({s.symbol as string})</td>
                    <td className="num-cell">{fmt(s.mcap as number)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
