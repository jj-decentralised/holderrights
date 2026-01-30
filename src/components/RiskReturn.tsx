import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ZAxis, ReferenceLine,
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
    mcap: number | null;
    revenue30d: number | null;
    priceChange7d: number | null;
    priceChange30d: number | null;
    priceChange1d: number | null;
  }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RiskTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.name}</div>
      <div>Yield: {d.yield.toFixed(1)}%</div>
      <div>Volatility: {d.volatility.toFixed(1)}</div>
      <div>Yield/Vol: {d.yieldVolRatio.toFixed(2)}</div>
      <div>TVL: {fmt(d.tvl)}</div>
      <div>MCap: {fmt(d.mcap)}</div>
    </div>
  );
}

export function RiskReturn({ protocols }: Props) {
  const qualifying = protocols
    .filter((p): p is typeof p & { mcap: number; revenue30d: number } => (p.mcap ?? 0) > 0 && (p.revenue30d ?? 0) > 0)
    .map((p) => {
      const volatility = Math.min(
        Math.abs(p.priceChange1d || 0) +
        Math.abs(p.priceChange7d || 0) * 0.3 +
        Math.abs(p.priceChange30d || 0) * 0.1,
        100,
      );
      const annualizedYield = Math.min(
        ((p.revenue30d * 12) / p.mcap) * 100,
        200,
      );
      const yieldVolRatio = volatility > 0 ? annualizedYield / volatility : 0;
      return {
        name: p.name,
        slug: p.slug,
        category: p.category,
        tvl: p.tvl,
        mcap: p.mcap,
        revenue30d: p.revenue30d,
        volatility,
        yield: annualizedYield,
        yieldVolRatio,
      };
    });

  if (qualifying.length < 10) return null;

  const yields = qualifying.map((d) => d.yield).sort((a, b) => a - b);
  const medianYield = yields[Math.floor(yields.length / 2)];

  const top20 = [...qualifying]
    .sort((a, b) => b.yieldVolRatio - a.yieldVolRatio)
    .slice(0, 20);

  return (
    <div className="analytics-section">
      <h2 className="section-title">Risk-Adjusted Returns</h2>
      <p className="section-desc">
        Compares annualized revenue yield against price volatility. Protocols in the
        upper-left quadrant offer the best risk-adjusted returns.
      </p>

      <div className="chart-card-full">
        <h3 className="chart-card-title">Revenue Yield vs Price Volatility</h3>
        <ResponsiveContainer width="100%" height={480}>
          <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
            <XAxis
              type="number" dataKey="volatility" name="Volatility"
              domain={[0, 100]}
              tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
              label={{ value: 'Price Volatility Index', position: 'bottom', fill: '#888', fontSize: 12, offset: 10 }}
            />
            <YAxis
              type="number" dataKey="yield" name="Yield"
              domain={[0, 200]}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
              label={{ value: 'Annualized Revenue Yield %', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 12 }}
            />
            <ZAxis type="number" dataKey="tvl" range={[30, 400]} name="TVL" />
            <ReferenceLine
              y={medianYield}
              stroke="#999"
              strokeDasharray="5 5"
              label={{ value: `Median ${medianYield.toFixed(1)}%`, position: 'right', fill: '#888', fontSize: 11 }}
            />
            <Tooltip content={<RiskTooltip />} />
            <Scatter name="Protocols" data={qualifying} fill="#1a1a1a" fillOpacity={0.4} />
            <text x="12%" y="10%" textAnchor="middle" fill="#2a9d6a" fontSize={11} fontWeight={600}>High yield, low risk</text>
            <text x="88%" y="90%" textAnchor="middle" fill="#d14" fontSize={11} fontWeight={600}>High risk, low yield</text>
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
                <th style={{ textAlign: 'right' }}>TVL</th>
                <th style={{ textAlign: 'right' }}>MCap</th>
                <th style={{ textAlign: 'right' }}>Revenue (30d)</th>
                <th style={{ textAlign: 'right' }}>Yield %</th>
                <th style={{ textAlign: 'right' }}>Volatility</th>
                <th style={{ textAlign: 'right' }}>Yield/Vol Ratio</th>
              </tr>
            </thead>
            <tbody>
              {top20.map((p, i) => (
                <tr key={p.slug}>
                  <td style={{ color: '#888' }}>{i + 1}</td>
                  <td className="cat-name-cell">{p.name}</td>
                  <td><span className="category-badge">{p.category}</span></td>
                  <td className="num-cell">{fmt(p.tvl)}</td>
                  <td className="num-cell">{fmt(p.mcap)}</td>
                  <td className="num-cell">{fmt(p.revenue30d)}</td>
                  <td className="num-cell">{p.yield.toFixed(1)}%</td>
                  <td className="num-cell">{p.volatility.toFixed(1)}</td>
                  <td className="num-cell">{p.yieldVolRatio.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
