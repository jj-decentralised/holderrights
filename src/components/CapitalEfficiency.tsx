import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { ServerAnalytics } from '../hooks/useDefiData';

function fmt(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

interface Props {
  analytics: ServerAnalytics;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="scatter-tooltip">
      <div className="tooltip-name">{d.name}</div>
      <div>Revenue Yield: {(d.revenueYield * 100).toFixed(2)}%</div>
      <div>P/E Ratio: {d.peRatio != null ? `${d.peRatio.toFixed(1)}x` : '—'}</div>
      <div>TVL/MCap: {d.tvlToMcap.toFixed(2)}x</div>
      <div>MCap: {fmt(d.mcap)}</div>
    </div>
  );
}

export function CapitalEfficiency({ analytics }: Props) {
  const data = analytics.capitalEfficiency;
  if (!Array.isArray(data) || data.length === 0) return null;

  const scatterData = data
    .filter((p: Record<string, unknown>) => (p.peRatio as number) > 0 && (p.peRatio as number) < 200)
    .map((p: Record<string, unknown>) => ({
      name: p.name,
      revenueYield: p.revenueYield,
      peRatio: p.peRatio,
      tvlToMcap: p.tvlToMcap,
      mcap: p.mcap,
    }));

  return (
    <div className="analytics-section">
      <h2 className="section-title">Capital Efficiency</h2>
      <p className="section-desc">
        How efficiently do protocols convert market cap into revenue?
        Revenue yield (annualized revenue / market cap) is the DeFi equivalent of earnings yield.
        Lower P/E ratios suggest undervaluation relative to earnings.
      </p>

      <div className="chart-container">
        <h3 className="chart-title">Revenue Yield vs P/E Ratio</h3>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 25, left: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
            <XAxis
              type="number" dataKey="peRatio" name="P/E Ratio"
              tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
              label={{ value: 'P/E Ratio (MC/Rev annualized)', position: 'bottom', fill: '#888', fontSize: 12, offset: 10 }}
            />
            <YAxis
              type="number" dataKey="revenueYield" name="Revenue Yield"
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
              label={{ value: 'Revenue Yield', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter data={scatterData} fill="#1a1a1a" fillOpacity={0.6} r={5} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="analytics-table-wrapper">
        <table className="category-summary-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Protocol</th>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>MCap</th>
              <th style={{ textAlign: 'right' }}>TVL</th>
              <th style={{ textAlign: 'right' }}>Revenue (30d)</th>
              <th style={{ textAlign: 'right' }}>Rev Yield</th>
              <th style={{ textAlign: 'right' }}>P/E</th>
              <th style={{ textAlign: 'right' }}>TVL/MCap</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 25).map((p: Record<string, unknown>, i: number) => (
              <tr key={p.slug as string}>
                <td style={{ color: '#888' }}>{i + 1}</td>
                <td className="cat-name-cell">{p.name as string}</td>
                <td><span className="category-badge">{p.category as string}</span></td>
                <td className="num-cell">{fmt(p.mcap as number)}</td>
                <td className="num-cell">{fmt(p.tvl as number)}</td>
                <td className="num-cell">{fmt(p.revenue30d as number)}</td>
                <td className="num-cell">{((p.revenueYield as number) * 100).toFixed(2)}%</td>
                <td className="num-cell">{p.peRatio != null ? `${(p.peRatio as number).toFixed(1)}x` : '—'}</td>
                <td className="num-cell">{(p.tvlToMcap as number).toFixed(2)}x</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
