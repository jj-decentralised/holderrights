import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis,
} from 'recharts';
import type { EnrichedProtocol, ValuationRanking } from '../types';
import type { ServerAnalytics } from '../hooks/useDefiData';

interface Props {
  analytics: ServerAnalytics;
  protocols: EnrichedProtocol[];
  onSelectProtocol: (slug: string) => void;
}

function fmt(n: number | null): string {
  if (n === null || n === undefined) return '—';
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

type SortKey = 'compositeScore' | 'evRevPctl' | 'momentumPctl' | 'realYieldPctl' | 'securityPctl' | 'divergencePctl' | 'dataCompleteness';

function govTier(score: number): number {
  if (score >= 26) return 1.15;
  if (score >= 16) return 1.08;
  if (score >= 6) return 1.02;
  return 1.0;
}

function govPctl(score: number): number {
  if (score >= 26) return 95;
  if (score >= 16) return 75;
  if (score >= 6) return 55;
  return 40;
}

const tooltipStyle = {
  background: 'rgba(255,255,255,0.96)',
  border: '1px solid #e0e0dd',
  borderRadius: '6px',
  fontSize: 13,
  color: '#333',
} as const;

export function DiscoveryDashboard({ analytics, protocols, onSelectProtocol }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('compositeScore');
  const [sortAsc, setSortAsc] = useState(false);

  const discovery = analytics?.valuationDiscovery;
  if (!discovery || !discovery.rankings || discovery.rankings.length === 0) {
    return (
      <div className="analytics-section">
        <h2 className="section-title">Undervaluation Discovery</h2>
        <p className="section-desc">Valuation data is being computed...</p>
      </div>
    );
  }

  const { rankings, scoreDistribution, categoryBenchmarks, totalScored } = discovery;

  // Enrich rankings with governance factor from frontend protocol data
  const scoreMap = useMemo(() => {
    const m: Record<string, number> = {};
    protocols.forEach((p) => {
      if (p.isClassified) m[p.slug] = p.holderRightsScore;
    });
    return m;
  }, [protocols]);

  const enrichedRankings: (ValuationRanking & { finalScore: number })[] = useMemo(() => {
    return rankings.map((r: ValuationRanking) => {
      const hrs = scoreMap[r.slug] ?? 0;
      const gPctl = govPctl(hrs);
      // Recalculate composite: replace governance neutral (50) with actual
      // Server used 50*0.05 = 2.5 for governance. Adjust by difference.
      const govDelta = (gPctl - 50) * 0.05;
      const finalScore = Math.round((r.compositeScore + govDelta) * 10) / 10;
      return { ...r, holderRightsScore: hrs, governancePctl: gPctl, governanceFactor: govTier(hrs), finalScore };
    });
  }, [rankings, scoreMap]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...enrichedRankings];
    const key = sortKey === 'compositeScore' ? 'finalScore' : sortKey;
    arr.sort((a, b) => {
      const av = (a as Record<string, unknown>)[key] as number;
      const bv = (b as Record<string, unknown>)[key] as number;
      return sortAsc ? av - bv : bv - av;
    });
    return arr.slice(0, 30);
  }, [enrichedRankings, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  // Score distribution histogram
  const histogram = useMemo(() => {
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10}-${i * 10 + 10}`,
      count: 0,
    }));
    enrichedRankings.forEach((r) => {
      const idx = Math.min(9, Math.floor(r.finalScore / 10));
      buckets[idx].count++;
    });
    return buckets;
  }, [enrichedRankings]);

  // Top undervalued per category
  const categoryLeaders = useMemo(() => {
    const catMap: Record<string, typeof enrichedRankings> = {};
    enrichedRankings.forEach((r) => {
      if (!catMap[r.category]) catMap[r.category] = [];
      catMap[r.category].push(r);
    });
    return Object.entries(catMap)
      .map(([cat, protos]) => ({
        category: cat,
        top3: protos.sort((a, b) => b.finalScore - a.finalScore).slice(0, 3),
      }))
      .sort((a, b) => b.top3[0].finalScore - a.top3[0].finalScore)
      .slice(0, 8);
  }, [enrichedRankings]);

  // Scatter data
  const scatterData = useMemo(() =>
    enrichedRankings
      .filter((r) => r.realYieldScore > 0 && r.evToRevenue !== null)
      .slice(0, 50)
      .map((r) => ({
        name: r.name,
        score: r.finalScore,
        realYield: Math.round(r.realYieldScore * 10000) / 100,
        evRev: r.evToRevenue,
        tvl: r.tvl,
      })),
    [enrichedRankings],
  );

  const top1 = sorted[0];

  return (
    <div className="analytics-section">
      <h2 className="section-title">Undervaluation Discovery</h2>
      <p className="section-desc">
        Composite scoring engine combining 9 valuation dimensions — EV/Revenue, revenue momentum,
        real yield, security, funding discount, volume utilization, dilution risk, governance premium,
        and TVL-price divergence — to surface protocols trading below intrinsic value.
      </p>

      {/* Summary cards */}
      <div className="market-stats-grid" style={{ marginTop: 20 }}>
        <div className="detail-stat">
          <div className="stat-label">Most Undervalued</div>
          <div className="stat-value" style={{ fontSize: 16 }}>{top1?.name ?? '—'}</div>
          {top1 && <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Score: {top1.finalScore.toFixed(1)}</div>}
        </div>
        <div className="detail-stat">
          <div className="stat-label">Avg Score</div>
          <div className="stat-value">{scoreDistribution.mean}</div>
        </div>
        <div className="detail-stat">
          <div className="stat-label">Protocols Scored</div>
          <div className="stat-value">{totalScored}</div>
        </div>
        <div className="detail-stat">
          <div className="stat-label">Score Spread</div>
          <div className="stat-value">P25: {scoreDistribution.p25} / P75: {scoreDistribution.p75}</div>
        </div>
      </div>

      {/* Distribution histogram */}
      <div style={{ marginTop: 32 }}>
        <h3 className="analytics-subtitle">Score Distribution</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={histogram} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" vertical={false} />
            <XAxis dataKey="range" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
            <YAxis tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill="#1a1a1a" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top 30 Table */}
      <div style={{ marginTop: 32 }}>
        <h3 className="analytics-subtitle">Top 30 Undervalued Protocols</h3>
        <div className="analytics-table-wrapper" style={{ marginTop: 8 }}>
          <table className="protocol-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Protocol</th>
                <th>Category</th>
                <th className="num-cell" style={{ cursor: 'pointer' }} onClick={() => handleSort('compositeScore')}>
                  Score {sortKey === 'compositeScore' ? (sortAsc ? '\u25B2' : '\u25BC') : ''}
                </th>
                <th className="num-cell" style={{ cursor: 'pointer' }} onClick={() => handleSort('dataCompleteness')}>
                  Data% {sortKey === 'dataCompleteness' ? (sortAsc ? '\u25B2' : '\u25BC') : ''}
                </th>
                <th className="num-cell" style={{ cursor: 'pointer' }} onClick={() => handleSort('evRevPctl')}>
                  EV/Rev {sortKey === 'evRevPctl' ? (sortAsc ? '\u25B2' : '\u25BC') : ''}
                </th>
                <th className="num-cell" style={{ cursor: 'pointer' }} onClick={() => handleSort('momentumPctl')}>
                  Momentum {sortKey === 'momentumPctl' ? (sortAsc ? '\u25B2' : '\u25BC') : ''}
                </th>
                <th className="num-cell" style={{ cursor: 'pointer' }} onClick={() => handleSort('realYieldPctl')}>
                  Yield {sortKey === 'realYieldPctl' ? (sortAsc ? '\u25B2' : '\u25BC') : ''}
                </th>
                <th className="num-cell" style={{ cursor: 'pointer' }} onClick={() => handleSort('securityPctl')}>
                  Security {sortKey === 'securityPctl' ? (sortAsc ? '\u25B2' : '\u25BC') : ''}
                </th>
                <th className="num-cell" style={{ cursor: 'pointer' }} onClick={() => handleSort('divergencePctl')}>
                  Diverge {sortKey === 'divergencePctl' ? (sortAsc ? '\u25B2' : '\u25BC') : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr
                  key={r.slug}
                  className="protocol-row"
                  onClick={() => onSelectProtocol(r.slug)}
                >
                  <td style={{ color: '#888', fontSize: 12 }}>{i + 1}</td>
                  <td>
                    <div className="name-cell">
                      {r.logo && <img src={r.logo} alt="" className="protocol-logo" />}
                      {r.name}
                    </div>
                  </td>
                  <td><span className="category-badge">{r.category}</span></td>
                  <td className="num-cell" style={{ fontWeight: 700, fontSize: 16 }}>
                    {r.finalScore.toFixed(1)}
                  </td>
                  <td className="num-cell">
                    <div className="pctl-bar-container">
                      <div className="pctl-bar" style={{ width: `${Math.round(r.dataCompleteness * 100)}%` }} />
                      <span className="pctl-label">{Math.round(r.dataCompleteness * 100)}%</span>
                    </div>
                  </td>
                  <td className="num-cell">
                    <div className="pctl-bar-container">
                      <div className="pctl-bar" style={{ width: `${r.evRevPctl}%` }} />
                      <span className="pctl-label">{r.evRevPctl.toFixed(0)}</span>
                    </div>
                  </td>
                  <td className="num-cell">
                    <div className="pctl-bar-container">
                      <div className="pctl-bar" style={{ width: `${r.momentumPctl}%` }} />
                      <span className="pctl-label">{r.momentumPctl.toFixed(0)}</span>
                    </div>
                  </td>
                  <td className="num-cell">
                    <div className="pctl-bar-container">
                      <div className="pctl-bar" style={{ width: `${r.realYieldPctl}%` }} />
                      <span className="pctl-label">{r.realYieldPctl.toFixed(0)}</span>
                    </div>
                  </td>
                  <td className="num-cell">
                    <div className="pctl-bar-container">
                      <div className="pctl-bar" style={{ width: `${r.securityPctl}%` }} />
                      <span className="pctl-label">{r.securityPctl.toFixed(0)}</span>
                    </div>
                  </td>
                  <td className="num-cell">
                    <div className="pctl-bar-container">
                      <div className="pctl-bar" style={{ width: `${r.divergencePctl}%` }} />
                      <span className="pctl-label">{r.divergencePctl.toFixed(0)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scatter plots */}
      {scatterData.length > 5 && (
        <div className="chart-grid" style={{ marginTop: 32 }}>
          <div className="chart-container">
            <div className="chart-title">Composite Score vs Real Yield</div>
            <div className="chart-meta">Higher yield + higher score = strongest undervaluation signal</div>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
                <XAxis type="number" dataKey="score" name="Score" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
                <YAxis type="number" dataKey="realYield" name="Real Yield %" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                  tickFormatter={(v) => `${v}%`} />
                <ZAxis type="number" dataKey="tvl" range={[20, 400]} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) => [
                    name === 'Real Yield %' ? `${(value as number).toFixed(2)}%` : (value as number).toFixed(1),
                    name,
                  ]}
                  labelFormatter={() => ''}
                />
                <Scatter data={scatterData} fill="#1a1a1a" fillOpacity={0.5} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <div className="chart-title">Composite Score vs EV/Revenue</div>
            <div className="chart-meta">Low EV/Rev + high score = deep value</div>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
                <XAxis type="number" dataKey="score" name="Score" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
                <YAxis type="number" dataKey="evRev" name="EV/Revenue" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                  tickFormatter={(v) => `${v.toFixed(0)}x`}
                  domain={[0, (dataMax: number) => Math.min(dataMax, 100)]}
                />
                <ZAxis type="number" dataKey="tvl" range={[20, 400]} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) => [
                    name === 'EV/Revenue' ? `${(value as number).toFixed(1)}x` : (value as number).toFixed(1),
                    name,
                  ]}
                  labelFormatter={() => ''}
                />
                <Scatter data={scatterData} fill="#1a1a1a" fillOpacity={0.5} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Category leaderboard */}
      <div style={{ marginTop: 32 }}>
        <h3 className="analytics-subtitle">Top Undervalued by Category</h3>
        <div className="analytics-table-wrapper" style={{ marginTop: 8 }}>
          <table className="protocol-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Protocol</th>
                <th className="num-cell">Score</th>
                <th className="num-cell">TVL</th>
                <th className="num-cell">Revenue 30d</th>
                <th className="num-cell">EV/Rev</th>
              </tr>
            </thead>
            <tbody>
              {categoryLeaders.map(({ category, top3 }) =>
                top3.map((r, idx) => (
                  <tr
                    key={r.slug}
                    className="protocol-row"
                    onClick={() => onSelectProtocol(r.slug)}
                    style={idx === 0 ? { borderTop: '2px solid var(--border)' } : undefined}
                  >
                    <td>{idx === 0 ? <span style={{ fontWeight: 600 }}>{category}</span> : ''}</td>
                    <td>
                      <div className="name-cell">
                        {r.logo && <img src={r.logo} alt="" className="protocol-logo" />}
                        {r.name}
                      </div>
                    </td>
                    <td className="num-cell" style={{ fontWeight: 600 }}>{r.finalScore.toFixed(1)}</td>
                    <td className="num-cell">{fmt(r.tvl)}</td>
                    <td className="num-cell">{fmt(r.revenue30d)}</td>
                    <td className="num-cell">{r.evToRevenue !== null ? `${r.evToRevenue.toFixed(1)}x` : '—'}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
