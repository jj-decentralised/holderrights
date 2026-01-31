import { useMemo } from 'react';
import {
  Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, ComposedChart, Line,
} from 'recharts';
import type { ServerAnalytics } from '../hooks/useDefiData';

function fmt(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

const tooltipStyle = {
  background: 'rgba(255,255,255,0.96)',
  border: '1px solid #e0e0dd',
  borderRadius: '6px',
  fontSize: 13,
  color: '#333',
} as const;

interface Props {
  analytics: ServerAnalytics;
}

export function MarketStructure({ analytics }: Props) {
  const ms = analytics.marketStructure;
  if (!ms) return null;

  const lorenz = ms.lorenzCurve || [];
  const topProtocols = ms.topProtocols || [];
  const categoryShares = ms.categoryShares || [];
  const efficiencyDeciles = ms.efficiencyDeciles || [];

  // Compute Gini coefficient approximation from Lorenz curve
  const gini = useMemo(() => {
    if (lorenz.length < 3) return null;
    // Area between perfect equality line and Lorenz curve
    let areaUnderLorenz = 0;
    for (let i = 1; i < lorenz.length; i++) {
      const dx = (lorenz[i].percentile - lorenz[i - 1].percentile) / 100;
      const avgY = (lorenz[i].tvlShare + lorenz[i - 1].tvlShare) / 200;
      areaUnderLorenz += dx * avgY;
    }
    // Gini = (0.5 - areaUnderLorenz) / 0.5
    return Math.round(Math.max(0, Math.min(1, (0.5 - areaUnderLorenz) / 0.5)) * 1000) / 1000;
  }, [lorenz]);

  // Revenue-TVL dominance gap data for top protocols
  const dominanceData = useMemo(() => {
    return topProtocols.slice(0, 10).map((p: { name: string; tvlShare: number; revenueShare: number }) => ({
      name: p.name.length > 12 ? p.name.slice(0, 11) + '…' : p.name,
      fullName: p.name,
      tvlShare: p.tvlShare,
      revenueShare: p.revenueShare,
      gap: Math.round((p.revenueShare - p.tvlShare) * 100) / 100,
    }));
  }, [topProtocols]);

  // Category share data
  const catData = useMemo(() => {
    return categoryShares.slice(0, 8).map((c: { category: string; tvlShare: number; revenueShare: number; count: number }) => ({
      category: c.category.length > 14 ? c.category.slice(0, 13) + '…' : c.category,
      fullCategory: c.category,
      tvlShare: c.tvlShare,
      revenueShare: c.revenueShare,
      count: c.count,
    }));
  }, [categoryShares]);

  return (
    <div className="analytics-section">
      <h2 className="section-title">Market Structure</h2>
      <p className="section-desc">
        Concentration metrics, dominance analysis, and structural overview of the DeFi ecosystem.
        The Herfindahl index measures market concentration — values above 0.25 indicate high concentration.
      </p>

      {/* ── Row 1: Key metrics ── */}
      <div className="market-stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Protocols</div>
          <div className="stat-value">{ms.totalProtocols.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total TVL</div>
          <div className="stat-value">{fmt(ms.totalTvl)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue (30d)</div>
          <div className="stat-value">{fmt(ms.totalRevenue30d)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Market Cap</div>
          <div className="stat-value">{fmt(ms.totalMcap)}</div>
        </div>
      </div>

      {/* ── Row 2: Concentration + Gini ── */}
      <div className="market-concentration">
        <h3 className="analytics-subtitle">Concentration Metrics</h3>
        <div className="concentration-grid">
          <div className="concentration-card">
            <div className="concentration-label">Herfindahl Index (TVL)</div>
            <div className="concentration-value">{ms.herfindahlTvl.toFixed(4)}</div>
            <div className="concentration-desc">
              {ms.herfindahlTvl > 0.25 ? 'Highly concentrated' : ms.herfindahlTvl > 0.15 ? 'Moderately concentrated' : 'Competitive'}
            </div>
          </div>
          <div className="concentration-card">
            <div className="concentration-label">Top 10 TVL Share</div>
            <div className="concentration-value">{pct(ms.top10TvlShare)}</div>
            <div className="concentration-bar">
              <div className="concentration-fill" style={{ width: pct(ms.top10TvlShare) }} />
            </div>
          </div>
          <div className="concentration-card">
            <div className="concentration-label">Top 10 Revenue Share</div>
            <div className="concentration-value">{pct(ms.top10RevenueShare)}</div>
            <div className="concentration-bar">
              <div className="concentration-fill" style={{ width: pct(ms.top10RevenueShare) }} />
            </div>
          </div>
          {gini !== null && (
            <div className="concentration-card">
              <div className="concentration-label">Gini Coefficient (TVL)</div>
              <div className="concentration-value">{gini.toFixed(3)}</div>
              <div className="concentration-desc">
                {gini > 0.8 ? 'Extreme inequality' : gini > 0.6 ? 'High inequality' : gini > 0.4 ? 'Moderate inequality' : 'Relatively equal'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Lorenz Curve ── */}
      {lorenz.length > 3 && (
        <div style={{ marginTop: 24 }}>
          <h3 className="analytics-subtitle">Lorenz Curve — TVL & Revenue Concentration</h3>
          <p className="chart-meta">
            How evenly TVL and revenue are distributed across protocols. The further from the diagonal (perfect equality), the more concentrated the market.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={lorenz} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <defs>
                <linearGradient id="lorenzTvl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1a1a1a" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#1a1a1a" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
              <XAxis dataKey="percentile" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                tickFormatter={(v: number) => `${v}%`}
                label={{ value: 'Protocols (cumulative %)', position: 'insideBottom', offset: -5, fill: '#aaa', fontSize: 11 }} />
              <YAxis tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                tickFormatter={(v: number) => `${v}%`}
                label={{ value: 'Cumulative share', angle: -90, position: 'insideLeft', fill: '#aaa', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle}
                formatter={(value, name) => [`${(value as number).toFixed(1)}%`, String(name) === 'tvlShare' ? 'TVL Share' : 'Revenue Share']}
                labelFormatter={(v) => `Top ${v}% of protocols`} />
              <Area type="monotone" dataKey="tvlShare" fill="url(#lorenzTvl)" stroke="#1a1a1a" strokeWidth={2}
                name="tvlShare" dot={false} />
              <Line type="monotone" dataKey="revenueShare" stroke="#8b3a3a" strokeWidth={1.5}
                strokeDasharray="4 3" dot={false} name="revenueShare" />
              {/* Perfect equality reference line: render as data */}
              <Line type="linear" dataKey="percentile" stroke="#ccc" strokeWidth={1}
                strokeDasharray="2 4" dot={false} name="equality" />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="lorenz-legend">
            <span className="lorenz-legend-item"><span className="lorenz-swatch" style={{ background: '#1a1a1a' }} /> TVL distribution</span>
            <span className="lorenz-legend-item"><span className="lorenz-swatch lorenz-swatch-dashed" /> Revenue distribution</span>
            <span className="lorenz-legend-item"><span className="lorenz-swatch" style={{ background: '#ccc' }} /> Perfect equality</span>
          </div>
        </div>
      )}

      {/* ── Row 4: Protocol Dominance — TVL vs Revenue share ── */}
      {dominanceData.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 className="analytics-subtitle">Protocol Dominance — TVL vs Revenue Share</h3>
          <p className="chart-meta">
            Comparing each top protocol's share of total TVL against share of total revenue. Protocols earning disproportionate revenue relative to TVL are more capital-efficient.
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dominanceData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 90 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                tickFormatter={(v: number) => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#555', fontSize: 12 }} stroke="#ccc" width={85} />
              <Tooltip contentStyle={tooltipStyle}
                formatter={(value, name) => [`${(value as number).toFixed(2)}%`, String(name) === 'tvlShare' ? 'TVL Share' : 'Revenue Share']}
                labelFormatter={(n) => {
                  const d = dominanceData.find((x: { name: string }) => x.name === String(n));
                  return d?.fullName || String(n);
                }} />
              <Bar dataKey="tvlShare" fill="#1a1a1a" fillOpacity={0.2} radius={[0, 2, 2, 0]} name="tvlShare" />
              <Bar dataKey="revenueShare" fill="#1a1a1a" radius={[0, 2, 2, 0]} name="revenueShare" />
            </BarChart>
          </ResponsiveContainer>
          <div className="lorenz-legend" style={{ marginTop: 8 }}>
            <span className="lorenz-legend-item"><span className="lorenz-swatch" style={{ background: 'rgba(26,26,26,0.2)' }} /> TVL share</span>
            <span className="lorenz-legend-item"><span className="lorenz-swatch" style={{ background: '#1a1a1a' }} /> Revenue share</span>
          </div>
        </div>
      )}

      {/* ── Row 5: Category Market Share ── */}
      {catData.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 className="analytics-subtitle">Category Market Share</h3>
          <p className="chart-meta">TVL and revenue distribution across protocol categories</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={catData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" vertical={false} />
              <XAxis dataKey="category" tick={{ fill: '#555', fontSize: 11 }} stroke="#ccc" />
              <YAxis tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                tickFormatter={(v: number) => `${v}%`} />
              <Tooltip contentStyle={tooltipStyle}
                formatter={(value, name) => [`${(value as number).toFixed(1)}%`, String(name) === 'tvlShare' ? 'TVL Share' : 'Revenue Share']}
                labelFormatter={(cat) => {
                  const d = catData.find((x: { category: string }) => x.category === String(cat));
                  return d ? `${d.fullCategory} (${d.count} protocols)` : String(cat);
                }} />
              <Bar dataKey="tvlShare" fill="#1a1a1a" fillOpacity={0.2} radius={[2, 2, 0, 0]} name="tvlShare" />
              <Bar dataKey="revenueShare" fill="#1a1a1a" radius={[2, 2, 0, 0]} name="revenueShare" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Row 6: Revenue Efficiency Distribution ── */}
      {efficiencyDeciles.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 className="analytics-subtitle">Revenue Efficiency Distribution</h3>
          <p className="chart-meta">Average revenue-per-TVL (%) by decile — D1 = lowest efficiency, D10 = highest. Shows how efficiency is distributed across protocols.</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={efficiencyDeciles} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" vertical={false} />
              <XAxis dataKey="decile" tick={{ fill: '#555', fontSize: 11 }} stroke="#ccc" />
              <YAxis tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                tickFormatter={(v: number) => `${v}%`} />
              <Tooltip contentStyle={tooltipStyle}
                formatter={(value) => [`${(value as number).toFixed(3)}%`, 'Avg Rev/TVL']} />
              <Bar dataKey="avg" radius={[2, 2, 0, 0]}>
                {efficiencyDeciles.map((_: unknown, idx: number) => (
                  <Cell key={idx} fill="#1a1a1a" fillOpacity={0.15 + (idx / 10) * 0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Row 7: Data Coverage ── */}
      <div className="market-data-coverage">
        <h3 className="analytics-subtitle">Data Coverage</h3>
        <div className="coverage-grid">
          {[
            { count: ms.protocolsWithRevenue, label: 'with revenue data', pct: ms.protocolsWithRevenue / ms.totalProtocols },
            { count: ms.protocolsWithFees, label: 'with fee data', pct: ms.protocolsWithFees / ms.totalProtocols },
            { count: ms.protocolsWithMcap, label: 'with market cap', pct: ms.protocolsWithMcap / ms.totalProtocols },
            { count: ms.protocolsWithTreasury, label: 'with treasury data', pct: ms.protocolsWithTreasury / ms.totalProtocols },
            { count: ms.protocolsMultichain, label: 'multi-chain', pct: ms.protocolsMultichain / ms.totalProtocols },
            { count: ms.avgChainCount.toFixed(1), label: 'avg chains per protocol', pct: null as number | null },
          ].map((item, i) => (
            <div key={i} className="coverage-item">
              <span className="coverage-count">{typeof item.count === 'number' ? item.count.toLocaleString() : item.count}</span>
              <span className="coverage-label">{item.label}</span>
              {item.pct !== null && (
                <div className="coverage-bar">
                  <div className="coverage-bar-fill" style={{ width: `${Math.min(100, item.pct * 100)}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
