import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

function fmt(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

const tooltipStyle = {
  background: 'rgba(255,255,255,0.96)',
  border: '1px solid #e0e0dd',
  borderRadius: '6px',
  fontSize: 13,
  color: '#333',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  padding: '8px 12px',
} as const;

const categoryColors: Record<string, string> = {
  'DEXes': '#1a1a1a',
  'Lending': '#666',
  'Liquid Staking': '#999',
  'CDP': '#bbb',
} as const;

const defaultColor = '#ddd';

function colorFor(category: string): string {
  return categoryColors[category] ?? defaultColor;
}

interface Props {
  correlationPoints: {
    name: string;
    holderRightsScore: number;
    revenue30d: number | null;
    mcap: number | null;
    tvl: number;
    category: string;
    priceChange30d: number | null;
  }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TvlTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.name}</div>
      <div>Score: {d.holderRightsScore}/10</div>
      <div>TVL: {fmt(d.tvl)}</div>
      <div>Category: {d.category}</div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RevenueTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.name}</div>
      <div>Score: {d.holderRightsScore}/10</div>
      <div>Revenue (30d): {fmt(d.revenue30d ?? 0)}</div>
      <div>Category: {d.category}</div>
    </div>
  );
}

export function GovernanceQuality({ correlationPoints }: Props) {
  if (correlationPoints.length < 5) return null;

  const tvlData = correlationPoints.filter((p) => p.tvl > 0);
  const revData = correlationPoints.filter((p) => (p.revenue30d ?? 0) > 0);

  const highScore = correlationPoints.filter((p) => p.holderRightsScore >= 7 && p.tvl > 0);
  const lowScore = correlationPoints.filter((p) => p.holderRightsScore < 4 && p.tvl > 0);
  const avgTvlHigh = highScore.length > 0
    ? highScore.reduce((s, p) => s + p.tvl, 0) / highScore.length
    : 0;
  const avgTvlLow = lowScore.length > 0
    ? lowScore.reduce((s, p) => s + p.tvl, 0) / lowScore.length
    : 0;

  const top20 = [...correlationPoints]
    .sort((a, b) => b.holderRightsScore - a.holderRightsScore)
    .slice(0, 20);

  return (
    <div className="analytics-section">
      <h2 className="section-title">Governance Quality Analysis</h2>
      <p className="section-desc">
        Do protocols with stronger holder rights attract more capital and generate more revenue?
        Scatter plots reveal the relationship between governance quality and protocol success.
      </p>

      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-card-title">Governance Score vs TVL</h3>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 25, left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
              <XAxis
                type="number" dataKey="holderRightsScore" name="Score"
                domain={[0, 10]}
                tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                label={{ value: 'Holder Rights Score', position: 'bottom', fill: '#888', fontSize: 12, offset: 10 }}
              />
              <YAxis
                type="number" dataKey="tvl" name="TVL"
                tickFormatter={(v: number) => fmt(v)} scale="log" domain={['auto', 'auto']}
                tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                label={{ value: 'TVL (log)', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 12 }}
              />
              <Tooltip content={<TvlTooltip />} />
              <Scatter name="Protocols" data={tvlData}>
                {tvlData.map((d, i) => (
                  <Cell key={i} fill={colorFor(d.category)} fillOpacity={0.6} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-card-title">Governance Score vs Revenue</h3>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 25, left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
              <XAxis
                type="number" dataKey="holderRightsScore" name="Score"
                domain={[0, 10]}
                tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                label={{ value: 'Holder Rights Score', position: 'bottom', fill: '#888', fontSize: 12, offset: 10 }}
              />
              <YAxis
                type="number" dataKey="revenue30d" name="Revenue"
                tickFormatter={(v: number) => fmt(v)} scale="log" domain={['auto', 'auto']}
                tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                label={{ value: 'Revenue 30d (log)', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 12 }}
              />
              <Tooltip content={<RevenueTooltip />} />
              <Scatter name="Protocols" data={revData}>
                {revData.map((d, i) => (
                  <Cell key={i} fill={colorFor(d.category)} fillOpacity={0.6} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card-full" style={{ marginTop: 16, padding: '16px 20px', background: '#f9f9f7', borderRadius: 8, border: '1px solid #e8e8e5' }}>
        <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6 }}>
          <strong>Insight:</strong>{' '}
          Average TVL for score &ge; 7: <strong>{fmt(avgTvlHigh)}</strong>
          {' | '}
          Average TVL for score &lt; 4: <strong>{fmt(avgTvlLow)}</strong>
        </div>
      </div>

      <div className="chart-card-full">
        <div className="analytics-table-wrapper">
          <table className="category-summary-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Score</th>
                <th style={{ textAlign: 'right' }}>TVL</th>
                <th style={{ textAlign: 'right' }}>MCap</th>
                <th style={{ textAlign: 'right' }}>Revenue (30d)</th>
                <th style={{ textAlign: 'right' }}>Price 30d %</th>
              </tr>
            </thead>
            <tbody>
              {top20.map((p, i) => {
                const chg = p.priceChange30d;
                const chgColor = chg != null ? (chg >= 0 ? '#1a7a35' : '#b33') : undefined;
                return (
                  <tr key={p.name}>
                    <td style={{ color: '#888' }}>{i + 1}</td>
                    <td className="cat-name-cell">{p.name}</td>
                    <td><span className="category-badge">{p.category}</span></td>
                    <td className="num-cell">{p.holderRightsScore}/10</td>
                    <td className="num-cell">{fmt(p.tvl)}</td>
                    <td className="num-cell">{(p.mcap ?? 0) > 0 ? fmt(p.mcap!) : '—'}</td>
                    <td className="num-cell">{(p.revenue30d ?? 0) > 0 ? fmt(p.revenue30d!) : '—'}</td>
                    <td className="num-cell" style={{ color: chgColor }}>
                      {chg != null ? `${chg >= 0 ? '+' : ''}${chg.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
