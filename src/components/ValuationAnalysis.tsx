import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Cell,
} from 'recharts';
import type { ServerAnalytics } from '../hooks/useDefiData';

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
};

interface Props {
  analytics: ServerAnalytics;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function McapTvlTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.name}</div>
      <div>TVL: {fmt(d.tvl)}</div>
      <div>MCap: {fmt(d.mcap)}</div>
      <div>MCap/TVL: {d.tvlToMcap > 0 ? `${(d.mcap / d.tvl).toFixed(2)}x` : '—'}</div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function YieldPeTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.name}</div>
      <div>Revenue Yield: {(d.revenueYield * 100).toFixed(2)}%</div>
      <div>P/E Ratio: {d.peRatio != null ? `${d.peRatio.toFixed(1)}x` : '—'}</div>
      <div>TVL: {fmt(d.tvl)}</div>
    </div>
  );
}

export function ValuationAnalysis({ analytics }: Props) {
  const data = analytics.capitalEfficiency;
  if (!Array.isArray(data) || data.length === 0) return null;

  const mcapTvlData = data
    .filter((p: Record<string, unknown>) =>
      (p.tvl as number) > 0 && (p.mcap as number) > 0
    )
    .map((p: Record<string, unknown>) => ({
      name: p.name,
      tvl: p.tvl as number,
      mcap: p.mcap as number,
      tvlToMcap: p.tvlToMcap as number,
    }));

  const yieldPeData = data
    .filter((p: Record<string, unknown>) =>
      (p.peRatio as number) > 0 && (p.revenueYield as number) > 0
    )
    .map((p: Record<string, unknown>) => ({
      name: p.name,
      peRatio: Math.min(p.peRatio as number, 500),
      revenueYield: p.revenueYield as number,
      yieldPct: (p.revenueYield as number) * 100,
      tvl: p.tvl as number,
    }));

  const maxTvl = Math.max(...mcapTvlData.map((d) => Math.max(d.tvl, d.mcap)));
  const refLine = [
    { tvl: 0, mcap: 0 },
    { tvl: maxTvl, mcap: maxTvl },
  ];

  const sorted = [...data]
    .filter((p: Record<string, unknown>) => (p.revenueYield as number) > 0)
    .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
      (b.revenueYield as number) - (a.revenueYield as number)
    )
    .slice(0, 20);

  return (
    <div className="analytics-section">
      <h2 className="section-title">Valuation Analysis</h2>
      <p className="section-desc">
        Finding over- and undervalued protocols relative to their TVL and revenue generation.
        Scatter plots reveal pricing inefficiencies while the summary table ranks protocols by revenue yield.
      </p>

      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-card-title">MCap vs TVL</h3>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 25, left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
              <XAxis
                type="number" dataKey="tvl" name="TVL"
                tickFormatter={(v) => fmt(v)} scale="log" domain={['auto', 'auto']}
                tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                label={{ value: 'TVL', position: 'bottom', fill: '#888', fontSize: 12, offset: 10 }}
              />
              <YAxis
                type="number" dataKey="mcap" name="MCap"
                tickFormatter={(v) => fmt(v)} scale="log" domain={['auto', 'auto']}
                tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                label={{ value: 'Market Cap', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 12 }}
              />
              <Tooltip content={<McapTvlTooltip />} />
              <Scatter name="Reference" data={refLine} fill="none" stroke="#ccc" strokeDasharray="5 5" line={{ strokeWidth: 1 }} legendType="none" />
              <Scatter name="Protocols" data={mcapTvlData} fill="#1a1a1a" fillOpacity={0.5}>
                {mcapTvlData.map((_, i) => (
                  <Cell key={i} fill="#1a1a1a" fillOpacity={0.5} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-card-title">Revenue Yield vs P/E Ratio</h3>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 25, left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
              <XAxis
                type="number" dataKey="peRatio" name="P/E Ratio"
                tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                domain={[0, 500]}
                label={{ value: 'P/E Ratio', position: 'bottom', fill: '#888', fontSize: 12, offset: 10 }}
              />
              <YAxis
                type="number" dataKey="yieldPct" name="Revenue Yield"
                tickFormatter={(v) => `${v.toFixed(0)}%`}
                tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                label={{ value: 'Revenue Yield (%)', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 12 }}
              />
              <ZAxis type="number" dataKey="tvl" range={[30, 400]} name="TVL" />
              <Tooltip content={<YieldPeTooltip />} />
              <Scatter name="Protocols" data={yieldPeData} fill="#1a1a1a" fillOpacity={0.5}>
                {yieldPeData.map((_, i) => (
                  <Cell key={i} fill="#1a1a1a" fillOpacity={0.5} />
                ))}
              </Scatter>
              {/* Quadrant labels */}
              <text x="15%" y="15%" textAnchor="middle" fill="#2a9d6a" fontSize={12} fontWeight={600}>Strong Value</text>
              <text x="85%" y="85%" textAnchor="middle" fill="#d14" fontSize={12} fontWeight={600}>Overvalued</text>
            </ScatterChart>
          </ResponsiveContainer>
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
                <th style={{ textAlign: 'right' }}>TVL</th>
                <th style={{ textAlign: 'right' }}>MCap</th>
                <th style={{ textAlign: 'right' }}>Revenue (30d)</th>
                <th style={{ textAlign: 'right' }}>MCap/TVL</th>
                <th style={{ textAlign: 'right' }}>Rev Yield</th>
                <th style={{ textAlign: 'right' }}>P/E</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p: Record<string, unknown>, i: number) => (
                <tr key={p.slug as string}>
                  <td style={{ color: '#888' }}>{i + 1}</td>
                  <td className="cat-name-cell">{p.name as string}</td>
                  <td><span className="category-badge">{p.category as string}</span></td>
                  <td className="num-cell">{fmt(p.tvl as number)}</td>
                  <td className="num-cell">{fmt(p.mcap as number)}</td>
                  <td className="num-cell">{fmt(p.revenue30d as number)}</td>
                  <td className="num-cell">{(p.tvlToMcap as number) > 0 ? `${((p.mcap as number) / (p.tvl as number)).toFixed(2)}x` : '—'}</td>
                  <td className="num-cell">{((p.revenueYield as number) * 100).toFixed(2)}%</td>
                  <td className="num-cell">{p.peRatio != null ? `${(p.peRatio as number).toFixed(1)}x` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
