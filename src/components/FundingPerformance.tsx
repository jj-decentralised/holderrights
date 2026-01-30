import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ZAxis,
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

interface Props {
  protocols: {
    name: string;
    slug: string;
    category: string;
    tvl: number;
    mcap: number;
    totalRaised: number;
    latestRound: string;
    latestRoundDate: string;
  }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FundingTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.name}</div>
      <div>Total Raised: {fmt(d.totalRaised)}</div>
      <div>TVL: {fmt(d.tvl)}</div>
      <div>MCap: {fmt(d.mcap)}</div>
      <div>TVL/Raised: {d.tvlRaisedRatio.toFixed(2)}x</div>
      <div>Latest Round: {d.latestRound || '—'}</div>
    </div>
  );
}

export function FundingPerformance({ protocols }: Props) {
  const qualifying = protocols
    .filter((p) => p.totalRaised > 0 && p.tvl > 0)
    .map((p) => ({
      name: p.name,
      slug: p.slug,
      category: p.category,
      tvl: p.tvl,
      mcap: p.mcap,
      totalRaised: p.totalRaised,
      latestRound: p.latestRound,
      latestRoundDate: p.latestRoundDate,
      tvlRaisedRatio: p.tvl / p.totalRaised,
    }));

  if (qualifying.length < 5) return null;

  const maxVal = Math.max(
    ...qualifying.map((d) => Math.max(d.tvl, d.totalRaised)),
  );
  const refLine = [
    { totalRaised: 1e4, tvl: 1e4 },
    { totalRaised: maxVal, tvl: maxVal },
  ];

  const top20 = [...qualifying]
    .sort((a, b) => b.tvlRaisedRatio - a.tvlRaisedRatio)
    .slice(0, 20);

  return (
    <div className="analytics-section">
      <h2 className="section-title">Funding vs Performance</h2>
      <p className="section-desc">
        How effectively have funded protocols converted venture capital into protocol TVL?
        Protocols above the diagonal have generated more TVL than they raised.
      </p>

      <div className="chart-card-full">
        <h3 className="chart-card-title">Total Raised vs Current TVL</h3>
        <ResponsiveContainer width="100%" height={480}>
          <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
            <XAxis
              type="number" dataKey="totalRaised" name="Total Raised"
              tickFormatter={(v: number) => fmt(v)} scale="log" domain={['auto', 'auto']}
              tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
              label={{ value: 'Total Raised (log)', position: 'bottom', fill: '#888', fontSize: 12, offset: 10 }}
            />
            <YAxis
              type="number" dataKey="tvl" name="TVL"
              tickFormatter={(v: number) => fmt(v)} scale="log" domain={['auto', 'auto']}
              tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
              label={{ value: 'TVL (log)', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 12 }}
            />
            <ZAxis type="number" dataKey="mcap" range={[30, 400]} name="MCap" />
            <Tooltip content={<FundingTooltip />} />
            <Scatter
              name="1:1 Line" data={refLine} fill="none" stroke="#ccc"
              strokeDasharray="5 5" line={{ strokeWidth: 1 }} legendType="none"
            />
            <Scatter name="Protocols" data={qualifying} fill="#1a1a1a" fillOpacity={0.4} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card-full">
        <div className="analytics-table-wrapper">
          <table className="category-summary-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Total Raised</th>
                <th style={{ textAlign: 'right' }}>TVL</th>
                <th style={{ textAlign: 'right' }}>MCap</th>
                <th style={{ textAlign: 'right' }}>TVL/Raised</th>
                <th>Latest Round</th>
              </tr>
            </thead>
            <tbody>
              {top20.map((p, i) => (
                <tr key={p.slug}>
                  <td style={{ color: '#888' }}>{i + 1}</td>
                  <td className="cat-name-cell">{p.name}</td>
                  <td><span className="category-badge">{p.category}</span></td>
                  <td className="num-cell">{fmt(p.totalRaised)}</td>
                  <td className="num-cell">{fmt(p.tvl)}</td>
                  <td className="num-cell">{p.mcap > 0 ? fmt(p.mcap) : '—'}</td>
                  <td className="num-cell">{p.tvlRaisedRatio.toFixed(2)}x</td>
                  <td>{p.latestRound || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
