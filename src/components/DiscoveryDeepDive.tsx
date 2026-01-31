import { useState, useMemo } from 'react';
import {
  Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis,
  BarChart, Bar, Cell, ComposedChart, Line,
} from 'recharts';
import type { ServerAnalytics } from '../hooks/useDefiData';

interface Props {
  analytics: ServerAnalytics;
  onSelectProtocol: (slug: string) => void;
}

const tooltipStyle = {
  background: 'rgba(255,255,255,0.96)',
  border: '1px solid #e0e0dd',
  borderRadius: '6px',
  fontSize: 13,
  color: '#333',
} as const;

const REGIME_COLORS: Record<string, string> = {
  breakout: '#2d6a2e',
  expansion: '#4a7c4b',
  consolidation: '#888',
  mixed: '#aaa',
  divergence: '#c4883c',
  contraction: '#8b3a3a',
};

const REGIME_LABELS: Record<string, string> = {
  breakout: 'Breakout',
  expansion: 'Expansion',
  consolidation: 'Consolidation',
  mixed: 'Mixed',
  divergence: 'Divergence',
  contraction: 'Contraction',
};

function fmt(n: number | null): string {
  if (n === null || n === undefined) return '—';
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

type ScatterView = 'frontier' | 'momentum' | 'feeCapture' | 'divergence';

export function DiscoveryDeepDive({ analytics, onSelectProtocol }: Props) {
  const [scatterView, setScatterView] = useState<ScatterView>('frontier');

  const discovery = analytics?.valuationDiscovery;
  if (!discovery) return null;

  const {
    efficiencyFrontier,
    momentumRegimes,
    categoryRelativeValue,
    scatterAnalytics,
    dimCorrelations,
    scoreHistory,
  } = discovery;

  // ── Score history time series ──
  const scoreTimeSeries = useMemo(() => {
    if (!scoreHistory || scoreHistory.length === 0) return [];
    return scoreHistory.map((s: { timestamp: number; mean: number; median: number; p25: number; p75: number; regimeBreakout: number; regimeDivergence: number }) => ({
      time: new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mean: s.mean,
      median: s.median,
      p25: s.p25,
      p75: s.p75,
      breakouts: s.regimeBreakout,
      divergences: s.regimeDivergence,
    }));
  }, [scoreHistory]);

  // ── Regime chart data ──
  const regimeChartData = useMemo(() => {
    if (!momentumRegimes) return [];
    return momentumRegimes.map((r: { regime: string; count: number }) => ({
      regime: REGIME_LABELS[r.regime] || r.regime,
      count: r.count,
      color: REGIME_COLORS[r.regime] || '#aaa',
    }));
  }, [momentumRegimes]);

  // ── Correlation heatmap data ──
  const corrData = useMemo(() => {
    if (!dimCorrelations) return [];
    const labels: Record<string, string> = {
      evRevPctl: 'EV/Rev',
      momentumPctl: 'Momentum',
      realYieldPctl: 'Yield',
      securityPctl: 'Security',
      divergencePctl: 'Diverge',
      fundingPctl: 'Funding',
    };
    return dimCorrelations.map((d: { dim1: string; dim2: string; correlation: number }) => ({
      pair: `${labels[d.dim1] || d.dim1} × ${labels[d.dim2] || d.dim2}`,
      correlation: d.correlation,
      absCorr: Math.abs(d.correlation),
    })).sort((a: { absCorr: number }, b: { absCorr: number }) => b.absCorr - a.absCorr);
  }, [dimCorrelations]);

  // ── Category relative value data ──
  const catRelData = useMemo(() => {
    if (!categoryRelativeValue) return [];
    return categoryRelativeValue.slice(0, 10);
  }, [categoryRelativeValue]);

  // ── Scatter plot data ──
  const frontierData = useMemo(() => {
    if (!efficiencyFrontier) return [];
    return efficiencyFrontier;
  }, [efficiencyFrontier]);

  const momentumScatterData = useMemo(() => {
    if (!scatterAnalytics) return [];
    return scatterAnalytics
      .filter((d: { momentum: number | null; tvlChange1m: number | null }) => d.momentum !== null && d.tvlChange1m !== null)
      .map((d: { slug: string; name: string; momentum: number; tvlChange1m: number; score: number; tvl: number; momentumRegime: string }) => ({
        ...d,
        color: REGIME_COLORS[d.momentumRegime] || '#aaa',
      }));
  }, [scatterAnalytics]);

  const feeCaptureData = useMemo(() => {
    if (!scatterAnalytics) return [];
    return scatterAnalytics
      .filter((d: { feeCaptureRatio: number | null; revenue30d: number | null }) => d.feeCaptureRatio !== null && d.revenue30d !== null && d.revenue30d > 0);
  }, [scatterAnalytics]);

  const divergenceData = useMemo(() => {
    if (!scatterAnalytics) return [];
    return scatterAnalytics
      .filter((d: { tvlChange1m: number | null; priceChange30d: number | null }) => d.tvlChange1m !== null && d.priceChange30d !== null);
  }, [scatterAnalytics]);

  const SCATTER_TABS: { key: ScatterView; label: string }[] = [
    { key: 'frontier', label: 'Efficiency Frontier' },
    { key: 'momentum', label: 'Momentum Regime' },
    { key: 'feeCapture', label: 'Fee Capture' },
    { key: 'divergence', label: 'TVL vs Price' },
  ];

  return (
    <div className="analytics-section">
      <h2 className="section-title">Discovery Deep Dive</h2>
      <p className="section-desc">
        Advanced cross-protocol analytics — efficiency frontiers, momentum regime classification,
        fee capture analysis, dimension correlations, and category relative value scoring.
      </p>

      {/* ── Score History Time Series ── */}
      {scoreTimeSeries.length > 1 && (
        <div style={{ marginTop: 24 }}>
          <h3 className="analytics-subtitle">Score Distribution Over Time</h3>
          <p className="chart-meta">P25–P75 band with mean and median lines tracked across data refreshes</p>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={scoreTimeSeries} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
              <defs>
                <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1a1a1a" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#1a1a1a" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
              <YAxis domain={['auto', 'auto']} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="p75" stackId="band" fill="none" stroke="none" />
              <Area type="monotone" dataKey="p25" stackId="band" fill="url(#bandGrad)" stroke="none" />
              <Line type="monotone" dataKey="mean" stroke="#1a1a1a" strokeWidth={2} dot={false} name="Mean" />
              <Line type="monotone" dataKey="median" stroke="#888" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="Median" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Regime + Correlation Row ── */}
      <div className="deep-dive-grid" style={{ marginTop: 32 }}>
        {/* Momentum Regime Distribution */}
        <div className="deep-dive-card">
          <h3 className="analytics-subtitle">Momentum Regime Distribution</h3>
          <p className="chart-meta">Protocol classification by TVL/price/revenue momentum signals</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={regimeChartData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 90 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
              <YAxis type="category" dataKey="regime" tick={{ fill: '#555', fontSize: 12 }} stroke="#ccc" width={85} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                {regimeChartData.map((entry: { color: string }, idx: number) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Regime legend with top protocols */}
          {momentumRegimes && momentumRegimes.slice(0, 4).map((r: { regime: string; count: number; protocols: { slug: string; name: string; score: number }[] }) => (
            <div key={r.regime} className="regime-detail" style={{ marginTop: 8 }}>
              <span className="regime-dot" style={{ background: REGIME_COLORS[r.regime] }} />
              <span className="regime-name">{REGIME_LABELS[r.regime] || r.regime} ({r.count})</span>
              <span className="regime-protos">
                {r.protocols.slice(0, 3).map((p: { name: string }) => p.name).join(', ')}
              </span>
            </div>
          ))}
        </div>

        {/* Dimension Correlation Matrix */}
        <div className="deep-dive-card">
          <h3 className="analytics-subtitle">Dimension Correlations (Top 30)</h3>
          <p className="chart-meta">Which valuation dimensions co-occur in top-ranked protocols</p>
          <div className="corr-grid">
            {corrData.map((d: { pair: string; correlation: number; absCorr: number }, i: number) => (
              <div key={i} className="corr-item">
                <div className="corr-pair">{d.pair}</div>
                <div className="corr-bar-wrapper">
                  <div
                    className="corr-bar"
                    style={{
                      width: `${d.absCorr * 100}%`,
                      background: d.correlation > 0 ? '#2d6a2e' : '#8b3a3a',
                      opacity: 0.3 + d.absCorr * 0.7,
                    }}
                  />
                </div>
                <div className="corr-value" style={{ color: d.correlation > 0 ? '#2d6a2e' : '#8b3a3a' }}>
                  {d.correlation > 0 ? '+' : ''}{d.correlation.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Multi-view Scatter Plots ── */}
      <div style={{ marginTop: 32 }}>
        <h3 className="analytics-subtitle">Multi-Factor Scatter Analysis</h3>
        <div className="scatter-tabs">
          {SCATTER_TABS.map((t) => (
            <button
              key={t.key}
              className={`scatter-tab-btn ${scatterView === t.key ? 'active' : ''}`}
              onClick={() => setScatterView(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 16 }}>
          {scatterView === 'frontier' && (
            <div>
              <p className="chart-meta">Risk (security + dilution) vs Real Yield — bubble size = TVL. Top-right = high yield, high risk; bottom-left = low risk, low yield.</p>
              <ResponsiveContainer width="100%" height={380}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
                  <XAxis type="number" dataKey="risk" name="Risk Score" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                    label={{ value: 'Risk →', position: 'insideBottomRight', offset: -5, fill: '#aaa', fontSize: 11 }} />
                  <YAxis type="number" dataKey="yield" name="Yield %" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                    tickFormatter={(v: number) => `${v}%`}
                    label={{ value: 'Yield →', angle: -90, position: 'insideLeft', fill: '#aaa', fontSize: 11 }} />
                  <ZAxis type="number" dataKey="tvl" range={[30, 500]} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    content={({ payload }) => {
                      if (!payload || !payload[0]) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ ...tooltipStyle, padding: '8px 12px' }}>
                          <div style={{ fontWeight: 600 }}>{d.name}</div>
                          <div>Score: {d.score?.toFixed(1)} · Risk: {d.risk?.toFixed(1)} · Yield: {d.yield?.toFixed(2)}%</div>
                          <div style={{ color: '#888' }}>{d.category} · TVL: {fmt(d.tvl)}</div>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={frontierData} fill="#1a1a1a" fillOpacity={0.4} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}

          {scatterView === 'momentum' && (
            <div>
              <p className="chart-meta">Revenue Momentum (%) vs TVL Change 30d (%) — colored by regime classification. Divergence quadrant = TVL up, price down.</p>
              <ResponsiveContainer width="100%" height={380}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
                  <XAxis type="number" dataKey="tvlChange1m" name="TVL Change %" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                    tickFormatter={(v: number) => `${v}%`}
                    label={{ value: 'TVL Change 30d →', position: 'insideBottomRight', offset: -5, fill: '#aaa', fontSize: 11 }} />
                  <YAxis type="number" dataKey="momentum" name="Rev Momentum %" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                    tickFormatter={(v: number) => `${v}%`}
                    label={{ value: 'Rev Momentum →', angle: -90, position: 'insideLeft', fill: '#aaa', fontSize: 11 }} />
                  <ZAxis type="number" dataKey="score" range={[30, 400]} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    content={({ payload }) => {
                      if (!payload || !payload[0]) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ ...tooltipStyle, padding: '8px 12px' }}>
                          <div style={{ fontWeight: 600 }}>{d.name}</div>
                          <div>Regime: {REGIME_LABELS[d.momentumRegime] || d.momentumRegime}</div>
                          <div>TVL Δ: {d.tvlChange1m?.toFixed(1)}% · Rev Mom: {d.momentum}%</div>
                          <div style={{ color: '#888' }}>Score: {d.score?.toFixed(1)}</div>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={momentumScatterData}>
                    {momentumScatterData.map((entry: { color: string }, idx: number) => (
                      <Cell key={idx} fill={entry.color} fillOpacity={0.5} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}

          {scatterView === 'feeCapture' && (
            <div>
              <p className="chart-meta">Fee Capture Ratio (Revenue/Fees %) vs Composite Score — bubble size = revenue. Higher capture = more value retained by protocol.</p>
              <ResponsiveContainer width="100%" height={380}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
                  <XAxis type="number" dataKey="score" name="Score" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
                  <YAxis type="number" dataKey="feeCaptureRatio" name="Fee Capture %" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                    tickFormatter={(v: number) => `${v}%`}
                    domain={[0, (dm: number) => Math.min(dm, 100)]} />
                  <ZAxis type="number" dataKey="revenue30d" range={[30, 400]} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    content={({ payload }) => {
                      if (!payload || !payload[0]) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ ...tooltipStyle, padding: '8px 12px' }}>
                          <div style={{ fontWeight: 600 }}>{d.name}</div>
                          <div>Fee Capture: {d.feeCaptureRatio?.toFixed(1)}% · Score: {d.score?.toFixed(1)}</div>
                          <div style={{ color: '#888' }}>{d.category} · Rev: {fmt(d.revenue30d)}</div>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={feeCaptureData} fill="#1a1a1a" fillOpacity={0.4} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}

          {scatterView === 'divergence' && (
            <div>
              <p className="chart-meta">TVL Change 30d vs Price Change 30d — protocols in upper-left quadrant (TVL up, price down) represent strongest divergence opportunities.</p>
              <ResponsiveContainer width="100%" height={380}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
                  <XAxis type="number" dataKey="priceChange30d" name="Price Δ %" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                    tickFormatter={(v: number) => `${v}%`}
                    label={{ value: 'Price Change 30d →', position: 'insideBottomRight', offset: -5, fill: '#aaa', fontSize: 11 }} />
                  <YAxis type="number" dataKey="tvlChange1m" name="TVL Δ %" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                    tickFormatter={(v: number) => `${v}%`}
                    label={{ value: 'TVL Change 30d →', angle: -90, position: 'insideLeft', fill: '#aaa', fontSize: 11 }} />
                  <ZAxis type="number" dataKey="score" range={[30, 400]} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    content={({ payload }) => {
                      if (!payload || !payload[0]) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ ...tooltipStyle, padding: '8px 12px' }}>
                          <div style={{ fontWeight: 600 }}>{d.name}</div>
                          <div>Price: {d.priceChange30d?.toFixed(1)}% · TVL: {d.tvlChange1m?.toFixed(1)}%</div>
                          <div>Divergence: {d.divergenceSignal} · Score: {d.score?.toFixed(1)}</div>
                          <div style={{ color: '#888' }}>{d.category}</div>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={divergenceData} fill="#1a1a1a" fillOpacity={0.4} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Category Relative Value ── */}
      {catRelData.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 className="analytics-subtitle">Category Relative Value</h3>
          <p className="chart-meta">Within-category z-scores identifying protocols most undervalued relative to category peers</p>
          <div className="cat-rel-grid">
            {catRelData.map((cat: { category: string; protocolCount: number; avgScore: number; stddev: number; medianRevenue: number; medianTvl: number; top3: { slug: string; name: string; score: number; zScore: number; tvl: number; revenue30d: number | null }[] }) => (
              <div key={cat.category} className="cat-rel-card">
                <div className="cat-rel-header">
                  <span className="cat-rel-name">{cat.category}</span>
                  <span className="cat-rel-meta">{cat.protocolCount} protocols · Avg: {cat.avgScore}</span>
                </div>
                <div className="cat-rel-top3">
                  {cat.top3.map((p, i) => (
                    <div
                      key={p.slug}
                      className="cat-rel-proto"
                      onClick={() => onSelectProtocol(p.slug)}
                      style={{ cursor: 'pointer' }}
                    >
                      <span className="cat-rel-rank">#{i + 1}</span>
                      <span className="cat-rel-proto-name">{p.name}</span>
                      <span className="cat-rel-score">{p.score.toFixed(1)}</span>
                      <span className={`cat-rel-zscore ${p.zScore > 0 ? 'positive' : 'negative'}`}>
                        {p.zScore > 0 ? '+' : ''}{p.zScore.toFixed(2)}σ
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Breakout Signals Table ── */}
      {momentumRegimes && (() => {
        const breakouts = momentumRegimes.find((r: { regime: string }) => r.regime === 'breakout');
        const divergences = momentumRegimes.find((r: { regime: string }) => r.regime === 'divergence');
        const signalProtos = [
          ...(breakouts?.protocols || []).map((p: { slug: string; name: string; score: number; tvl: number }) => ({ ...p, signal: 'Breakout' })),
          ...(divergences?.protocols || []).map((p: { slug: string; name: string; score: number; tvl: number }) => ({ ...p, signal: 'Divergence' })),
        ].sort((a: { score: number }, b: { score: number }) => b.score - a.score);

        if (signalProtos.length === 0) return null;
        return (
          <div style={{ marginTop: 32 }}>
            <h3 className="analytics-subtitle">Active Signals</h3>
            <p className="chart-meta">Protocols currently in breakout or divergence momentum regimes — highest conviction undervaluation candidates</p>
            <div className="analytics-table-wrapper" style={{ marginTop: 8 }}>
              <table className="protocol-table">
                <thead>
                  <tr>
                    <th>Protocol</th>
                    <th>Signal</th>
                    <th className="num-cell">Score</th>
                    <th className="num-cell">TVL</th>
                  </tr>
                </thead>
                <tbody>
                  {signalProtos.map((p: { slug: string; name: string; signal: string; score: number; tvl: number }) => (
                    <tr key={p.slug} className="protocol-row" onClick={() => onSelectProtocol(p.slug)}>
                      <td>{p.name}</td>
                      <td>
                        <span className="regime-badge" style={{ background: REGIME_COLORS[p.signal.toLowerCase()] || '#888' }}>
                          {p.signal}
                        </span>
                      </td>
                      <td className="num-cell" style={{ fontWeight: 600 }}>{p.score.toFixed(1)}</td>
                      <td className="num-cell">{fmt(p.tvl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
