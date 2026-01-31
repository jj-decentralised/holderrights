import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
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

function ChgCell({ value }: { value: number | null }) {
  if (value == null) return <td className="num-cell">—</td>;
  const color = value >= 0 ? '#1a7a35' : '#b33';
  return (
    <td className="num-cell" style={{ color }}>
      {value >= 0 ? '+' : ''}{value.toFixed(1)}%
    </td>
  );
}

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
    tvlChange7d: number | null;
    tvlChange1m: number | null;
    fees30d: number | null;
  }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DivergenceTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.name}</div>
      <div>Price Change (30d): {d.priceChange30d != null ? `${d.priceChange30d.toFixed(1)}%` : '—'}</div>
      <div>TVL Change (1m): {d.tvlChange1m != null ? `${d.tvlChange1m.toFixed(1)}%` : '—'}</div>
      <div>TVL: {fmt(d.tvl)}</div>
      <div>MCap: {fmt(d.mcap)}</div>
    </div>
  );
}

export function MomentumScanner({ protocols }: Props) {
  const withChangeData = protocols.filter(
    (p) =>
      p.tvlChange7d != null ||
      p.tvlChange1m != null ||
      p.priceChange7d != null ||
      p.priceChange30d != null,
  );
  if (withChangeData.length < 5) return null;

  // --- Section 1: TVL Movers (7d) ---
  const withTvl7d = protocols.filter((p) => p.tvlChange7d != null);
  const tvlGainers = withTvl7d
    .filter((p) => p.tvlChange7d! > 0)
    .sort((a, b) => b.tvlChange7d! - a.tvlChange7d!)
    .slice(0, 10);
  const tvlLosers = withTvl7d
    .filter((p) => p.tvlChange7d! < 0)
    .sort((a, b) => a.tvlChange7d! - b.tvlChange7d!)
    .slice(0, 10);

  // --- Section 2: Price Movers (30d) ---
  const withPrice30d = protocols.filter((p) => p.priceChange30d != null);
  const priceGainers = [...withPrice30d]
    .sort((a, b) => b.priceChange30d! - a.priceChange30d!)
    .slice(0, 10);
  const priceLosers = [...withPrice30d]
    .sort((a, b) => a.priceChange30d! - b.priceChange30d!)
    .slice(0, 10);

  // --- Section 3: TVL-Price Divergences ---
  const withBoth = protocols.filter(
    (p) => p.priceChange30d != null && p.tvlChange1m != null,
  );
  const scatterData = withBoth.map((p) => ({
    name: p.name,
    priceChange30d: p.priceChange30d!,
    tvlChange1m: p.tvlChange1m!,
    tvl: p.tvl,
    mcap: p.mcap,
    category: p.category,
    divergence: Math.abs(p.tvlChange1m! - p.priceChange30d!),
  }));

  const topDivergences = [...scatterData]
    .sort((a, b) => b.divergence - a.divergence)
    .slice(0, 15);

  return (
    <div className="analytics-section">
      <h2 className="section-title">Momentum Scanner</h2>
      <p className="section-desc">
        Identifies protocols with the strongest price and TVL movements over recent periods,
        plus divergences where TVL and price are moving in opposite directions.
      </p>

      {/* Section 1: TVL Movers (7d) */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-card-title">Biggest TVL Gainers (7d)</h3>
          <div className="analytics-table-wrapper">
            <table className="category-summary-table">
              <thead>
                <tr>
                  <th className="cat-name-cell">Protocol</th>
                  <th className="cat-name-cell">Category</th>
                  <th className="num-cell">TVL</th>
                  <th className="num-cell">7d Change%</th>
                </tr>
              </thead>
              <tbody>
                {tvlGainers.map((p) => (
                  <tr key={p.slug}>
                    <td className="cat-name-cell">{p.name}</td>
                    <td className="cat-name-cell">{p.category}</td>
                    <td className="num-cell">{fmt(p.tvl)}</td>
                    <ChgCell value={p.tvlChange7d} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-card-title">Biggest TVL Losers (7d)</h3>
          <div className="analytics-table-wrapper">
            <table className="category-summary-table">
              <thead>
                <tr>
                  <th className="cat-name-cell">Protocol</th>
                  <th className="cat-name-cell">Category</th>
                  <th className="num-cell">TVL</th>
                  <th className="num-cell">7d Change%</th>
                </tr>
              </thead>
              <tbody>
                {tvlLosers.map((p) => (
                  <tr key={p.slug}>
                    <td className="cat-name-cell">{p.name}</td>
                    <td className="cat-name-cell">{p.category}</td>
                    <td className="num-cell">{fmt(p.tvl)}</td>
                    <ChgCell value={p.tvlChange7d} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section 2: Price Movers (30d) */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-card-title">Strongest Price Performance (30d)</h3>
          <div className="analytics-table-wrapper">
            <table className="category-summary-table">
              <thead>
                <tr>
                  <th className="cat-name-cell">Protocol</th>
                  <th className="cat-name-cell">Category</th>
                  <th className="num-cell">MCap</th>
                  <th className="num-cell">30d Change%</th>
                </tr>
              </thead>
              <tbody>
                {priceGainers.map((p) => (
                  <tr key={p.slug}>
                    <td className="cat-name-cell">{p.name}</td>
                    <td className="cat-name-cell">{p.category}</td>
                    <td className="num-cell">{fmt(p.mcap ?? 0)}</td>
                    <ChgCell value={p.priceChange30d} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-card-title">Weakest Price Performance (30d)</h3>
          <div className="analytics-table-wrapper">
            <table className="category-summary-table">
              <thead>
                <tr>
                  <th className="cat-name-cell">Protocol</th>
                  <th className="cat-name-cell">Category</th>
                  <th className="num-cell">MCap</th>
                  <th className="num-cell">30d Change%</th>
                </tr>
              </thead>
              <tbody>
                {priceLosers.map((p) => (
                  <tr key={p.slug}>
                    <td className="cat-name-cell">{p.name}</td>
                    <td className="cat-name-cell">{p.category}</td>
                    <td className="num-cell">{fmt(p.mcap ?? 0)}</td>
                    <ChgCell value={p.priceChange30d} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section 3: TVL-Price Divergences */}
      <div className="chart-card chart-card-full">
        <h3 className="chart-card-title">TVL vs Price Divergence (30d)</h3>
        <ResponsiveContainer width="100%" height={420}>
          <ScatterChart margin={{ top: 20, right: 40, bottom: 30, left: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
            <XAxis
              type="number"
              dataKey="priceChange30d"
              name="Price Change (30d)"
              tick={{ fill: '#888', fontSize: 11 }}
              stroke="#ccc"
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              label={{ value: 'Price Change 30d (%)', position: 'bottom', fill: '#888', fontSize: 12, offset: 10 }}
            />
            <YAxis
              type="number"
              dataKey="tvlChange1m"
              name="TVL Change (1m)"
              tick={{ fill: '#888', fontSize: 11 }}
              stroke="#ccc"
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              label={{ value: 'TVL Change 1m (%)', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 12 }}
            />
            <ReferenceLine x={0} stroke="#999" strokeDasharray="4 4" />
            <ReferenceLine y={0} stroke="#999" strokeDasharray="4 4" />
            <Tooltip content={<DivergenceTooltip />} />
            <Scatter data={scatterData} fill="#1a1a1a" fillOpacity={0.5} r={4} />
          </ScatterChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 60px', fontSize: 11, color: '#888', marginTop: -10 }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600 }}>TVL up, Price down</div>
            <div>Undervalued Momentum</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 600 }}>Price up, TVL down</div>
            <div>Hot Air</div>
          </div>
        </div>
      </div>

      <div className="analytics-table-wrapper" style={{ marginTop: 24 }}>
        <h3 className="chart-card-title">Top 15 TVL-Price Divergences</h3>
        <table className="category-summary-table">
          <thead>
            <tr>
              <th className="cat-name-cell">Protocol</th>
              <th className="cat-name-cell">Category</th>
              <th className="num-cell">TVL</th>
              <th className="num-cell">MCap</th>
              <th className="num-cell">TVL Change (1m)</th>
              <th className="num-cell">Price Change (30d)</th>
              <th className="num-cell">Divergence</th>
            </tr>
          </thead>
          <tbody>
            {topDivergences.map((p) => (
              <tr key={p.name}>
                <td className="cat-name-cell">{p.name}</td>
                <td className="cat-name-cell">{p.category}</td>
                <td className="num-cell">{fmt(p.tvl)}</td>
                <td className="num-cell">{fmt(p.mcap ?? 0)}</td>
                <ChgCell value={p.tvlChange1m} />
                <ChgCell value={p.priceChange30d} />
                <td className="num-cell" style={{ fontWeight: 600 }}>{p.divergence.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
