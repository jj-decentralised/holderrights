import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ComposedChart, Line, ScatterChart, Scatter, ZAxis,
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
} as const;

interface Props {
  analytics: ServerAnalytics;
}

export function FundingLandscape({ analytics }: Props) {
  const funding = analytics.fundingAnalysis;
  if (!funding || funding.raiseCount === 0) return null;

  const [investorSort, setInvestorSort] = useState<'deals' | 'tvl' | 'mcap'>('deals');

  const yearData = Object.entries(funding.raisesByYear as Record<string, { count: number; amount: number; median: number }>)
    .map(([year, d]) => ({ year, count: d.count, amount: d.amount, median: d.median || 0 }))
    .sort((a, b) => a.year.localeCompare(b.year));

  const roundTypes = Array.isArray(funding.roundTypeBreakdown) ? funding.roundTypeBreakdown : [];
  const vintageData = Array.isArray(funding.vintageData) ? funding.vintageData : [];
  const topInvestors = Array.isArray(funding.topInvestors) ? funding.topInvestors : [];
  const catEfficiency = Array.isArray(funding.categoryFundingEfficiency) ? funding.categoryFundingEfficiency : [];
  const sizeDist = Array.isArray(funding.fundingSizeDistribution) ? funding.fundingSizeDistribution : [];
  const deploymentCurve = Array.isArray(funding.deploymentCurve) ? funding.deploymentCurve : [];

  const sortedInvestors = [...topInvestors].sort((a: Record<string, number>, b: Record<string, number>) => {
    if (investorSort === 'tvl') return (b.tvlPerDollarInvested ?? 0) - (a.tvlPerDollarInvested ?? 0);
    if (investorSort === 'mcap') return (b.mcapPerDollarInvested ?? 0) - (a.mcapPerDollarInvested ?? 0);
    return (b.deals ?? 0) - (a.deals ?? 0);
  }).slice(0, 15);

  return (
    <div className="analytics-section">
      <h2 className="section-title">Funding Landscape</h2>
      <p className="section-desc">
        Venture capital and fundraising activity across DeFi.
        {' '}{fmt(funding.totalRaised)} raised across {funding.raiseCount.toLocaleString()} recorded rounds
        by {(funding.fundedProtocolCount || 0).toLocaleString()} protocols.
      </p>

      {/* ── Summary Stats ── */}
      <div className="market-stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Raised</div>
          <div className="stat-value">{fmt(funding.totalRaised)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Rounds</div>
          <div className="stat-value">{funding.raiseCount.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Median Round</div>
          <div className="stat-value">{fmt(funding.medianRaise || 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Average Round</div>
          <div className="stat-value">{fmt(funding.avgRaise || 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Funded Protocols</div>
          <div className="stat-value">{(funding.fundedProtocolCount || 0).toLocaleString()}</div>
        </div>
      </div>

      {/* ── Funding by Year (with median line) ── */}
      <div className="chart-grid">
        <div className="chart-container">
          <h3 className="chart-title">Funding Volume by Year</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={yearData} margin={{ top: 5, right: 20, bottom: 25, left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
              <XAxis dataKey="year" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
              <YAxis yAxisId="left" tickFormatter={fmt} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
              <YAxis yAxisId="right" orientation="right" tickFormatter={fmt} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
              <Tooltip contentStyle={tooltipStyle}
                formatter={(value, name) => [fmt(Number(value)), String(name) === 'amount' ? 'Total Raised' : String(name) === 'median' ? 'Median Round' : 'Rounds']} />
              <Bar yAxisId="left" dataKey="amount" fill="#1a1a1a" fillOpacity={0.2} radius={[2, 2, 0, 0]} name="amount" />
              <Line yAxisId="right" type="monotone" dataKey="median" stroke="#1a1a1a" strokeWidth={2} dot={{ r: 3, fill: '#1a1a1a' }} name="median" />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="lorenz-legend" style={{ marginTop: 4 }}>
            <span className="lorenz-legend-item"><span className="lorenz-swatch" style={{ background: 'rgba(26,26,26,0.2)' }} /> Total raised</span>
            <span className="lorenz-legend-item"><span className="lorenz-swatch" style={{ background: '#1a1a1a' }} /> Median round size</span>
          </div>
        </div>

        <div className="chart-container">
          <h3 className="chart-title">Rounds by Year</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearData} margin={{ top: 5, right: 20, bottom: 25, left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
              <XAxis dataKey="year" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
              <YAxis tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
              <Tooltip contentStyle={tooltipStyle}
                formatter={(value) => [Number(value), 'Rounds']} />
              <Bar dataKey="count" fill="#888" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Round Type Breakdown ── */}
      {roundTypes.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 className="analytics-subtitle">Round Type Breakdown</h3>
          <p className="chart-meta">Distribution of capital across funding round types — Seed, Series A-D, strategic rounds, and more.</p>
          <div className="chart-grid">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={roundTypes.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 90 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" horizontal={false} />
                  <XAxis type="number" tickFormatter={fmt} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
                  <YAxis type="category" dataKey="round" tick={{ fill: '#555', fontSize: 11 }} stroke="#ccc" width={85} />
                  <Tooltip contentStyle={tooltipStyle}
                    formatter={(value, name) => [
                      String(name) === 'totalAmount' ? fmt(Number(value)) : Number(value).toLocaleString(),
                      String(name) === 'totalAmount' ? 'Total Raised' : 'Round Count',
                    ]} />
                  <Bar dataKey="totalAmount" fill="#1a1a1a" fillOpacity={0.7} radius={[0, 2, 2, 0]} name="totalAmount" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-container">
              <table className="category-summary-table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Round Type</th>
                    <th style={{ textAlign: 'right' }}>Count</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>Avg</th>
                    <th style={{ textAlign: 'right' }}>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {roundTypes.slice(0, 10).map((r: Record<string, unknown>) => (
                    <tr key={r.round as string}>
                      <td className="cat-name-cell">{r.round as string}</td>
                      <td className="num-cell">{(r.count as number).toLocaleString()}</td>
                      <td className="num-cell">{fmt(r.totalAmount as number)}</td>
                      <td className="num-cell">{fmt(r.avgAmount as number)}</td>
                      <td className="num-cell">{r.shareOfTotal as number}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Funding Size Distribution ── */}
      {sizeDist.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 className="analytics-subtitle">Round Size Distribution</h3>
          <p className="chart-meta">Number of funding rounds by size bucket — shows the typical scale of DeFi fundraises.</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sizeDist} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#555', fontSize: 11 }} stroke="#ccc" />
              <YAxis tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
              <Tooltip contentStyle={tooltipStyle}
                formatter={(value, name) => [
                  String(name) === 'count' ? Number(value).toLocaleString() : fmt(Number(value)),
                  String(name) === 'count' ? 'Rounds' : 'Total Raised',
                ]} />
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {sizeDist.map((_: unknown, idx: number) => (
                  <Cell key={idx} fill="#1a1a1a" fillOpacity={0.15 + (idx / sizeDist.length) * 0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Vintage Cohort Analysis ── */}
      {vintageData.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 className="analytics-subtitle">Vintage Cohort Analysis</h3>
          <p className="chart-meta">
            How effectively capital from each funding vintage converts into TVL and revenue.
            Capital efficiency = TVL / Total Raised for the cohort.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={vintageData} margin={{ top: 5, right: 20, bottom: 25, left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
              <XAxis dataKey="year" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
              <YAxis yAxisId="left" tickFormatter={fmt} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                label={{ value: 'Capital', angle: -90, position: 'insideLeft', fill: '#aaa', fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                label={{ value: 'TVL/Raised', angle: 90, position: 'insideRight', fill: '#aaa', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle}
                formatter={(value, name) => {
                  const n = String(name);
                  if (n === 'totalRaised') return [fmt(Number(value)), 'Total Raised'];
                  if (n === 'totalTvl') return [fmt(Number(value)), 'Current TVL'];
                  if (n === 'capitalEfficiency') return [`${Number(value).toFixed(2)}x`, 'TVL/Raised'];
                  return [String(value), n];
                }} />
              <Bar yAxisId="left" dataKey="totalRaised" fill="#1a1a1a" fillOpacity={0.15} radius={[2, 2, 0, 0]} name="totalRaised" />
              <Bar yAxisId="left" dataKey="totalTvl" fill="#1a1a1a" fillOpacity={0.6} radius={[2, 2, 0, 0]} name="totalTvl" />
              <Line yAxisId="right" type="monotone" dataKey="capitalEfficiency" stroke="#8b3a3a" strokeWidth={2}
                dot={{ r: 3, fill: '#8b3a3a' }} name="capitalEfficiency" />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="lorenz-legend" style={{ marginTop: 4 }}>
            <span className="lorenz-legend-item"><span className="lorenz-swatch" style={{ background: 'rgba(26,26,26,0.15)' }} /> Total raised</span>
            <span className="lorenz-legend-item"><span className="lorenz-swatch" style={{ background: 'rgba(26,26,26,0.6)' }} /> Current TVL</span>
            <span className="lorenz-legend-item"><span className="lorenz-swatch" style={{ background: '#8b3a3a' }} /> Capital efficiency (TVL/Raised)</span>
          </div>

          {/* Vintage table */}
          <div className="analytics-table-wrapper" style={{ marginTop: 16 }}>
            <table className="category-summary-table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Vintage</th>
                  <th style={{ textAlign: 'right' }}>Protocols</th>
                  <th style={{ textAlign: 'right' }}>Raised</th>
                  <th style={{ textAlign: 'right' }}>TVL</th>
                  <th style={{ textAlign: 'right' }}>TVL/Raised</th>
                  <th style={{ textAlign: 'right' }}>Med. TVL Multiple</th>
                  <th style={{ textAlign: 'right' }}>Med. MCap Multiple</th>
                  <th style={{ textAlign: 'right' }}>Rev Yield</th>
                </tr>
              </thead>
              <tbody>
                {vintageData.map((v: Record<string, unknown>) => (
                  <tr key={v.year as number}>
                    <td className="cat-name-cell">{v.year as number}</td>
                    <td className="num-cell">{v.protocolCount as number}</td>
                    <td className="num-cell">{fmt(v.totalRaised as number)}</td>
                    <td className="num-cell">{fmt(v.totalTvl as number)}</td>
                    <td className="num-cell">{(v.capitalEfficiency as number).toFixed(2)}x</td>
                    <td className="num-cell">{(v.medianTvlRatio as number).toFixed(2)}x</td>
                    <td className="num-cell">{(v.medianMcapRatio as number).toFixed(2)}x</td>
                    <td className="num-cell">{v.revenueYield as number}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Capital Deployment Scatter ── */}
      {deploymentCurve.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 className="analytics-subtitle">Capital Deployment — Raised vs TVL</h3>
          <p className="chart-meta">
            Each dot is a funded protocol. Position shows capital raised vs current TVL.
            Protocols above the diagonal deployed capital effectively.
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 25, left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
              <XAxis type="number" dataKey="raised" name="Raised" tickFormatter={fmt}
                tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                label={{ value: 'Total Raised', position: 'insideBottom', offset: -5, fill: '#aaa', fontSize: 11 }} />
              <YAxis type="number" dataKey="tvl" name="TVL" tickFormatter={fmt}
                tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                label={{ value: 'Current TVL', angle: -90, position: 'insideLeft', fill: '#aaa', fontSize: 11 }} />
              <ZAxis type="number" dataKey="mcap" range={[30, 300]} name="MCap" />
              <Tooltip contentStyle={tooltipStyle}
                formatter={(value, name) => [fmt(Number(value)), String(name)]}
                labelFormatter={(_, payload) => {
                  if (payload?.[0]?.payload) {
                    const d = payload[0].payload as Record<string, unknown>;
                    return `${d.fullName || d.name} — ${(d.tvlMultiple as number).toFixed(1)}x TVL/Raised`;
                  }
                  return '';
                }} />
              <Scatter data={deploymentCurve} fill="#1a1a1a" fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Category Funding Efficiency ── */}
      {catEfficiency.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 className="analytics-subtitle">Category Funding Efficiency</h3>
          <p className="chart-meta">How efficiently each category converts raised capital into TVL and annual revenue.</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={catEfficiency.slice(0, 10)} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" vertical={false} />
              <XAxis dataKey="category" tick={{ fill: '#555', fontSize: 10 }} stroke="#ccc" interval={0} angle={-15} />
              <YAxis tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                label={{ value: 'Multiple (x)', angle: -90, position: 'insideLeft', fill: '#aaa', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle}
                formatter={(value, name) => [
                  `${Number(value).toFixed(2)}x`,
                  String(name) === 'tvlPerRaised' ? 'TVL/Raised' : 'MCap/Raised',
                ]}
                labelFormatter={(cat) => {
                  const d = catEfficiency.find((c: Record<string, unknown>) => c.category === String(cat));
                  return d ? `${d.category} (${d.protocolCount} protocols, ${fmt(d.totalRaised)} raised)` : String(cat);
                }} />
              <Bar dataKey="tvlPerRaised" fill="#1a1a1a" fillOpacity={0.3} radius={[2, 2, 0, 0]} name="tvlPerRaised" />
              <Bar dataKey="mcapPerRaised" fill="#1a1a1a" radius={[2, 2, 0, 0]} name="mcapPerRaised" />
            </BarChart>
          </ResponsiveContainer>
          <div className="lorenz-legend" style={{ marginTop: 4 }}>
            <span className="lorenz-legend-item"><span className="lorenz-swatch" style={{ background: 'rgba(26,26,26,0.3)' }} /> TVL / Raised</span>
            <span className="lorenz-legend-item"><span className="lorenz-swatch" style={{ background: '#1a1a1a' }} /> MCap / Raised</span>
          </div>
        </div>
      )}

      {/* ── Top Investors ── */}
      {sortedInvestors.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 className="analytics-subtitle">Top Lead Investors</h3>
          <p className="chart-meta">
            Most active lead investors by deal count, with portfolio-level efficiency metrics. Showing investors with 3+ deals.
          </p>
          <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
            {(['deals', 'tvl', 'mcap'] as const).map(key => (
              <button key={key}
                className={`scatter-tab-btn ${investorSort === key ? 'active' : ''}`}
                onClick={() => setInvestorSort(key)}>
                {key === 'deals' ? 'Most Active' : key === 'tvl' ? 'Best TVL/Invested' : 'Best MCap/Invested'}
              </button>
            ))}
          </div>
          <div className="analytics-table-wrapper">
            <table className="category-summary-table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Investor</th>
                  <th style={{ textAlign: 'right' }}>Deals</th>
                  <th style={{ textAlign: 'right' }}>Portfolio TVL</th>
                  <th style={{ textAlign: 'right' }}>Portfolio MCap</th>
                  <th style={{ textAlign: 'right' }}>TVL/$</th>
                  <th style={{ textAlign: 'right' }}>MCap/$</th>
                  <th>Top Protocols</th>
                </tr>
              </thead>
              <tbody>
                {sortedInvestors.map((inv: Record<string, unknown>, i: number) => (
                  <tr key={inv.name as string}>
                    <td style={{ color: '#888' }}>{i + 1}</td>
                    <td className="cat-name-cell" style={{ fontWeight: 500 }}>{inv.name as string}</td>
                    <td className="num-cell">{inv.deals as number}</td>
                    <td className="num-cell">{fmt(inv.portfolioTvl as number)}</td>
                    <td className="num-cell">{fmt(inv.portfolioMcap as number)}</td>
                    <td className="num-cell">{(inv.tvlPerDollarInvested as number).toFixed(2)}x</td>
                    <td className="num-cell">{(inv.mcapPerDollarInvested as number).toFixed(2)}x</td>
                    <td style={{ fontSize: 11, color: '#888', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(inv.topProtocols as string[]).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Top Funded Protocols ── */}
      {Array.isArray(funding.topFundedProtocols) && funding.topFundedProtocols.length > 0 && (
        <div className="analytics-table-wrapper" style={{ marginTop: 32 }}>
          <h3 className="analytics-subtitle">Top Funded Protocols</h3>
          <table className="category-summary-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Protocol</th>
                <th style={{ textAlign: 'right' }}>Total Raised</th>
                <th style={{ textAlign: 'right' }}>TVL</th>
                <th style={{ textAlign: 'right' }}>MCap</th>
                <th style={{ textAlign: 'right' }}>Raised/TVL</th>
                <th style={{ textAlign: 'right' }}>Raised/MCap</th>
              </tr>
            </thead>
            <tbody>
              {funding.topFundedProtocols.map((p: Record<string, unknown>, i: number) => (
                <tr key={p.slug as string}>
                  <td style={{ color: '#888' }}>{i + 1}</td>
                  <td className="cat-name-cell">{p.name as string}</td>
                  <td className="num-cell">{fmt(p.totalRaised as number)}</td>
                  <td className="num-cell">{fmt(p.tvl as number)}</td>
                  <td className="num-cell">{p.mcap ? fmt(p.mcap as number) : '—'}</td>
                  <td className="num-cell">{p.raisedToTvl != null ? `${(p.raisedToTvl as number).toFixed(2)}x` : '—'}</td>
                  <td className="num-cell">{p.raisedToMcap != null ? `${(p.raisedToMcap as number).toFixed(2)}x` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
