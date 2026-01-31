import { useState, useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ZAxis, BarChart, Bar, Cell, ComposedChart,
  Line,
} from 'recharts';
import type { EnrichedProtocol } from '../types';

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
  protocols: EnrichedProtocol[];
}

type ChartView = 'raisedVsTvl' | 'raisedVsMcap' | 'raisedVsRevenue' | 'valuationVsMcap' | 'efficiencyMatrix';

const CHART_VIEWS: { key: ChartView; label: string }[] = [
  { key: 'raisedVsTvl', label: 'Raised vs TVL' },
  { key: 'raisedVsMcap', label: 'Raised vs MCap' },
  { key: 'raisedVsRevenue', label: 'Raised vs Revenue' },
  { key: 'valuationVsMcap', label: 'Valuation vs MCap' },
  { key: 'efficiencyMatrix', label: 'Capital Efficiency' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FundingTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.name}</div>
      {d.totalRaised != null && <div>Total Raised: {fmt(d.totalRaised)}</div>}
      {d.tvl != null && <div>TVL: {fmt(d.tvl)}</div>}
      {d.mcap > 0 && <div>MCap: {fmt(d.mcap)}</div>}
      {d.revenue30d > 0 && <div>Revenue 30d: {fmt(d.revenue30d)}</div>}
      {d.tvlRaisedRatio != null && <div>TVL/Raised: {d.tvlRaisedRatio.toFixed(2)}x</div>}
      {d.mcapRaisedRatio != null && d.mcapRaisedRatio > 0 && <div>MCap/Raised: {d.mcapRaisedRatio.toFixed(2)}x</div>}
      {d.capitalEfficiency != null && <div>Capital Efficiency: {d.capitalEfficiency.toFixed(1)}</div>}
      {d.latestRound && <div>Latest: {d.latestRound}</div>}
      {d.quadrant && <div style={{ color: '#888', marginTop: 2 }}>{d.quadrant}</div>}
    </div>
  );
}

export function FundingPerformance({ protocols }: Props) {
  const [chartView, setChartView] = useState<ChartView>('raisedVsTvl');

  // ── Core qualifying dataset ──
  const qualifying = useMemo(() => {
    return protocols
      .filter((p): p is EnrichedProtocol & { totalRaised: number } =>
        (p.totalRaised ?? 0) > 0 && p.tvl > 0)
      .map((p) => {
        const mcap = p.mcap ?? 0;
        const rev = p.revenue30d ?? 0;
        const fees = p.fees30d ?? 0;
        const raised = p.totalRaised;

        // TVL/Raised — core capital deployment efficiency
        const tvlRaisedRatio = p.tvl / raised;

        // MCap/Raised — investor return proxy (>1 = money multiplied)
        const mcapRaisedRatio = mcap > 0 ? mcap / raised : 0;

        // Revenue/Raised — revenue generation per dollar invested (annualized)
        const revenuePerRaised = rev > 0 ? (rev * 12) / raised : 0;

        // Burn rate proxy: if TVL > raised, no burn issue
        // If TVL < raised, estimate months until TVL erodes capital
        const burnIndicator = p.tvl < raised && rev > 0
          ? (raised - p.tvl) / (rev * 12) // years of "gap"
          : 0;

        // Fee Capture per dollar raised
        const feeCapturePerRaised = fees > 0 ? (fees * 12) / raised : 0;

        // Valuation multiple (if latest valuation exists)
        const valuationMultiple = (p.latestValuation ?? 0) > 0 && mcap > 0
          ? mcap / (p.latestValuation as number)
          : null;

        // Funding vintage (years since latest round)
        const vintage = p.latestRoundDate
          ? (Date.now() - new Date(p.latestRoundDate).getTime()) / (365.25 * 24 * 3600 * 1000)
          : null;

        // Composite Capital Efficiency Score (0-100)
        // Weights: TVL deployment 40%, revenue generation 30%, market confidence 20%, fee capture 10%
        const tvlScore = Math.min(100, tvlRaisedRatio * 20); // 5x ratio = 100
        const revScore = Math.min(100, revenuePerRaised * 500); // 20% annual rev/raised = 100
        const mktScore = Math.min(100, mcapRaisedRatio * 10); // 10x = 100
        const feeScore = Math.min(100, feeCapturePerRaised * 200); // 50% annual fee/raised = 100
        const capitalEfficiency = tvlScore * 0.4 + revScore * 0.3 + mktScore * 0.2 + feeScore * 0.1;

        // Quadrant classification
        let quadrant: string;
        if (tvlRaisedRatio > 1 && mcapRaisedRatio > 1) {
          quadrant = 'Star (TVL & MCap > Raised)';
        } else if (tvlRaisedRatio > 1 && mcapRaisedRatio <= 1) {
          quadrant = 'Builder (High TVL, Low MCap)';
        } else if (tvlRaisedRatio <= 1 && mcapRaisedRatio > 1) {
          quadrant = 'Speculative (Low TVL, High MCap)';
        } else {
          quadrant = 'Underperformer (TVL & MCap < Raised)';
        }

        return {
          name: p.name,
          slug: p.slug,
          category: p.category,
          tvl: p.tvl,
          mcap,
          totalRaised: raised,
          revenue30d: rev,
          fees30d: fees,
          latestRound: p.latestRound ?? '',
          latestRoundDate: p.latestRoundDate ?? '',
          latestValuation: p.latestValuation ?? 0,
          leadInvestors: p.leadInvestors || [],
          tvlRaisedRatio,
          mcapRaisedRatio,
          revenuePerRaised,
          feeCapturePerRaised,
          burnIndicator,
          valuationMultiple,
          vintage,
          capitalEfficiency: Math.round(capitalEfficiency * 10) / 10,
          quadrant,
          tvlChange1m: p.tvlChange1m ?? 0,
          priceChange30d: p.priceChange30d ?? 0,
          holderRightsScore: p.holderRightsScore,
          treasuryTotal: p.treasuryTotal ?? 0,
        };
      });
  }, [protocols]);

  // ── Derived analytics ──

  // Quadrant distribution
  const quadrantData = useMemo(() => {
    const counts: Record<string, number> = {};
    qualifying.forEach(p => { counts[p.quadrant] = (counts[p.quadrant] || 0) + 1; });
    return Object.entries(counts).map(([quadrant, count]) => ({
      quadrant: quadrant.split(' (')[0], // short label
      fullLabel: quadrant,
      count,
    })).sort((a, b) => b.count - a.count);
  }, [qualifying]);

  // Category efficiency breakdown
  const categoryEfficiency = useMemo(() => {
    const cats: Record<string, { tvlRatios: number[]; mcapRatios: number[]; revRatios: number[]; effScores: number[]; count: number }> = {};
    qualifying.forEach(p => {
      if (!cats[p.category]) cats[p.category] = { tvlRatios: [], mcapRatios: [], revRatios: [], effScores: [], count: 0 };
      cats[p.category].tvlRatios.push(p.tvlRaisedRatio);
      if (p.mcapRaisedRatio > 0) cats[p.category].mcapRatios.push(p.mcapRaisedRatio);
      if (p.revenuePerRaised > 0) cats[p.category].revRatios.push(p.revenuePerRaised);
      cats[p.category].effScores.push(p.capitalEfficiency);
      cats[p.category].count++;
    });
    const median = (arr: number[]) => {
      const s = [...arr].sort((a, b) => a - b);
      return s.length > 0 ? s[Math.floor(s.length / 2)] : 0;
    };
    return Object.entries(cats)
      .filter(([, d]) => d.count >= 3)
      .map(([cat, d]) => ({
        category: cat.length > 14 ? cat.slice(0, 13) + '…' : cat,
        fullCategory: cat,
        count: d.count,
        medianTvlRatio: Math.round(median(d.tvlRatios) * 100) / 100,
        medianMcapRatio: Math.round(median(d.mcapRatios) * 100) / 100,
        medianEfficiency: Math.round(median(d.effScores) * 10) / 10,
      }))
      .sort((a, b) => b.medianEfficiency - a.medianEfficiency)
      .slice(0, 10);
  }, [qualifying]);

  // Vintage performance cohorts
  const vintageCohorts = useMemo(() => {
    const cohorts: Record<string, { protocols: typeof qualifying; label: string }> = {
      '<1y': { protocols: [], label: '< 1 year' },
      '1-2y': { protocols: [], label: '1–2 years' },
      '2-4y': { protocols: [], label: '2–4 years' },
      '4y+': { protocols: [], label: '4+ years' },
    };
    qualifying.forEach(p => {
      if (p.vintage === null) return;
      if (p.vintage < 1) cohorts['<1y'].protocols.push(p);
      else if (p.vintage < 2) cohorts['1-2y'].protocols.push(p);
      else if (p.vintage < 4) cohorts['2-4y'].protocols.push(p);
      else cohorts['4y+'].protocols.push(p);
    });
    const median = (arr: number[]) => {
      const s = [...arr].sort((a, b) => a - b);
      return s.length > 0 ? s[Math.floor(s.length / 2)] : 0;
    };
    return Object.entries(cohorts)
      .filter(([, d]) => d.protocols.length >= 2)
      .map(([, d]) => ({
        cohort: d.label,
        count: d.protocols.length,
        medianTvlRatio: Math.round(median(d.protocols.map(p => p.tvlRaisedRatio)) * 100) / 100,
        medianMcapRatio: Math.round(median(d.protocols.map(p => p.mcapRaisedRatio).filter(v => v > 0)) * 100) / 100,
        medianEfficiency: Math.round(median(d.protocols.map(p => p.capitalEfficiency)) * 10) / 10,
        avgRevPerRaised: d.protocols.filter(p => p.revenuePerRaised > 0).length > 0
          ? Math.round(d.protocols.filter(p => p.revenuePerRaised > 0).reduce((s, p) => s + p.revenuePerRaised, 0) / d.protocols.filter(p => p.revenuePerRaised > 0).length * 10000) / 100
          : 0,
      }));
  }, [qualifying]);

  // Summary stats
  const stats = useMemo(() => {
    if (qualifying.length === 0) return null;
    const sorted = [...qualifying].sort((a, b) => b.capitalEfficiency - a.capitalEfficiency);
    const totalRaised = qualifying.reduce((s, p) => s + p.totalRaised, 0);
    const totalTvl = qualifying.reduce((s, p) => s + p.tvl, 0);
    const stars = qualifying.filter(p => p.quadrant.startsWith('Star'));
    return {
      count: qualifying.length,
      totalRaised,
      totalTvl,
      aggregateRatio: totalTvl / totalRaised,
      top: sorted[0],
      medianEfficiency: sorted[Math.floor(sorted.length / 2)].capitalEfficiency,
      stars: stars.length,
      starPct: Math.round((stars.length / qualifying.length) * 100),
    };
  }, [qualifying]);

  // Reference line data
  const refLine = useMemo(() => {
    if (qualifying.length === 0) return [];
    const maxVal = Math.max(...qualifying.map(d => Math.max(d.tvl, d.totalRaised, d.mcap)));
    return [{ x: 1e4, y: 1e4 }, { x: maxVal, y: maxVal }];
  }, [qualifying]);

  // Top ranked
  const topByEfficiency = useMemo(() => {
    return [...qualifying].sort((a, b) => b.capitalEfficiency - a.capitalEfficiency).slice(0, 25);
  }, [qualifying]);

  if (qualifying.length < 5 || !stats) return null;

  return (
    <div className="analytics-section">
      <h2 className="section-title">Funding vs Performance</h2>
      <p className="section-desc">
        How effectively have funded protocols converted venture capital into protocol TVL, revenue, and market value?
        Custom-computed capital efficiency scores, quadrant analysis, vintage cohorts, and category breakdowns.
      </p>

      {/* ── Summary metrics ── */}
      <div className="market-stats-grid" style={{ marginTop: 20 }}>
        <div className="detail-stat">
          <div className="stat-label">Funded Protocols</div>
          <div className="stat-value">{stats.count}</div>
          <div style={{ fontSize: 12, color: '#888' }}>Total raised: {fmt(stats.totalRaised)}</div>
        </div>
        <div className="detail-stat">
          <div className="stat-label">Aggregate TVL/Raised</div>
          <div className="stat-value">{stats.aggregateRatio.toFixed(2)}x</div>
          <div style={{ fontSize: 12, color: '#888' }}>Combined TVL: {fmt(stats.totalTvl)}</div>
        </div>
        <div className="detail-stat">
          <div className="stat-label">Most Capital Efficient</div>
          <div className="stat-value" style={{ fontSize: 16 }}>{stats.top.name}</div>
          <div style={{ fontSize: 12, color: '#888' }}>Score: {stats.top.capitalEfficiency} · TVL/R: {stats.top.tvlRaisedRatio.toFixed(1)}x</div>
        </div>
        <div className="detail-stat">
          <div className="stat-label">Star Performers</div>
          <div className="stat-value">{stats.stars} ({stats.starPct}%)</div>
          <div style={{ fontSize: 12, color: '#888' }}>TVL & MCap exceed funding</div>
        </div>
      </div>

      {/* ── Multi-view scatter plots ── */}
      <div style={{ marginTop: 32 }}>
        <div className="scatter-tabs">
          {CHART_VIEWS.map(v => (
            <button key={v.key} className={`scatter-tab-btn ${chartView === v.key ? 'active' : ''}`}
              onClick={() => setChartView(v.key)}>
              {v.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 16 }}>
          {chartView === 'raisedVsTvl' && (
            <div>
              <p className="chart-meta">Protocols above the diagonal have generated more TVL than they raised. Bubble size = MCap.</p>
              <ResponsiveContainer width="100%" height={480}>
                <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
                  <XAxis type="number" dataKey="totalRaised" name="Total Raised"
                    tickFormatter={fmt} scale="log" domain={['auto', 'auto']}
                    tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                    label={{ value: 'Total Raised (log)', position: 'bottom', fill: '#888', fontSize: 12, offset: 10 }} />
                  <YAxis type="number" dataKey="tvl" name="TVL"
                    tickFormatter={fmt} scale="log" domain={['auto', 'auto']}
                    tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                    label={{ value: 'TVL (log)', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 12 }} />
                  <ZAxis type="number" dataKey="mcap" range={[30, 400]} name="MCap" />
                  <Tooltip content={<FundingTooltip />} />
                  <Scatter name="1:1" data={refLine.map(p => ({ totalRaised: p.x, tvl: p.y, name: '1:1' }))} fill="none" stroke="#ccc" strokeDasharray="5 5" line={{ strokeWidth: 1 }} legendType="none" />
                  <Scatter name="Protocols" data={qualifying} fill="#1a1a1a" fillOpacity={0.4} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}

          {chartView === 'raisedVsMcap' && (
            <div>
              <p className="chart-meta">Investor return proxy — protocols above the diagonal have MCap exceeding total funding raised. Bubble size = TVL.</p>
              <ResponsiveContainer width="100%" height={480}>
                <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
                  <XAxis type="number" dataKey="totalRaised" name="Total Raised"
                    tickFormatter={fmt} scale="log" domain={['auto', 'auto']}
                    tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                    label={{ value: 'Total Raised (log)', position: 'bottom', fill: '#888', fontSize: 12, offset: 10 }} />
                  <YAxis type="number" dataKey="mcap" name="MCap"
                    tickFormatter={fmt} scale="log" domain={['auto', 'auto']}
                    tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                    label={{ value: 'MCap (log)', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 12 }} />
                  <ZAxis type="number" dataKey="tvl" range={[30, 400]} name="TVL" />
                  <Tooltip content={<FundingTooltip />} />
                  <Scatter name="1:1" data={refLine.map(p => ({ totalRaised: p.x, mcap: p.y, name: '1:1' }))} fill="none" stroke="#ccc" strokeDasharray="5 5" line={{ strokeWidth: 1 }} legendType="none" />
                  <Scatter name="Protocols" data={qualifying.filter(p => p.mcap > 0)} fill="#1a1a1a" fillOpacity={0.4} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}

          {chartView === 'raisedVsRevenue' && (
            <div>
              <p className="chart-meta">Revenue generation per dollar raised — higher is better. Revenue annualized. Bubble size = TVL.</p>
              <ResponsiveContainer width="100%" height={480}>
                <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
                  <XAxis type="number" dataKey="totalRaised" name="Total Raised"
                    tickFormatter={fmt} scale="log" domain={['auto', 'auto']}
                    tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                    label={{ value: 'Total Raised (log)', position: 'bottom', fill: '#888', fontSize: 12, offset: 10 }} />
                  <YAxis type="number" dataKey="revenue30d" name="Revenue 30d"
                    tickFormatter={fmt} scale="log" domain={['auto', 'auto']}
                    tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                    label={{ value: 'Revenue 30d (log)', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 12 }} />
                  <ZAxis type="number" dataKey="tvl" range={[30, 400]} name="TVL" />
                  <Tooltip content={<FundingTooltip />} />
                  <Scatter name="Protocols" data={qualifying.filter(p => p.revenue30d > 0)} fill="#1a1a1a" fillOpacity={0.4} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}

          {chartView === 'valuationVsMcap' && (
            <div>
              <p className="chart-meta">Latest raise valuation vs current MCap — above the diagonal = value appreciation since last round. Bubble size = total raised.</p>
              <ResponsiveContainer width="100%" height={480}>
                <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
                  <XAxis type="number" dataKey="latestValuation" name="Last Valuation"
                    tickFormatter={fmt} scale="log" domain={['auto', 'auto']}
                    tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                    label={{ value: 'Last Round Valuation (log)', position: 'bottom', fill: '#888', fontSize: 12, offset: 10 }} />
                  <YAxis type="number" dataKey="mcap" name="Current MCap"
                    tickFormatter={fmt} scale="log" domain={['auto', 'auto']}
                    tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                    label={{ value: 'Current MCap (log)', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 12 }} />
                  <ZAxis type="number" dataKey="totalRaised" range={[30, 400]} name="Total Raised" />
                  <Tooltip content={<FundingTooltip />} />
                  <Scatter name="1:1" data={refLine.map(p => ({ latestValuation: p.x, mcap: p.y, name: '1:1' }))} fill="none" stroke="#ccc" strokeDasharray="5 5" line={{ strokeWidth: 1 }} legendType="none" />
                  <Scatter name="Protocols"
                    data={qualifying.filter(p => p.latestValuation > 0 && p.mcap > 0)}
                    fill="#1a1a1a" fillOpacity={0.4} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}

          {chartView === 'efficiencyMatrix' && (
            <div>
              <p className="chart-meta">Capital Efficiency Score (composite of TVL deployment, revenue generation, market confidence) vs TVL/Raised ratio. Bubble size = total raised. Higher scores = more productive capital.</p>
              <ResponsiveContainer width="100%" height={480}>
                <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
                  <XAxis type="number" dataKey="tvlRaisedRatio" name="TVL/Raised"
                    tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                    tickFormatter={(v: number) => `${v.toFixed(1)}x`}
                    domain={[0, 'auto']}
                    label={{ value: 'TVL/Raised Ratio →', position: 'bottom', fill: '#888', fontSize: 12, offset: 10 }} />
                  <YAxis type="number" dataKey="capitalEfficiency" name="Efficiency Score"
                    tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                    domain={[0, 100]}
                    label={{ value: 'Capital Efficiency Score →', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 12 }} />
                  <ZAxis type="number" dataKey="totalRaised" range={[30, 500]} name="Total Raised" />
                  <Tooltip content={<FundingTooltip />} />
                  <Scatter name="Protocols" data={qualifying} fill="#1a1a1a" fillOpacity={0.4} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Quadrant Analysis ── */}
      <div className="deep-dive-grid" style={{ marginTop: 32 }}>
        <div className="deep-dive-card">
          <h3 className="analytics-subtitle">Quadrant Distribution</h3>
          <p className="chart-meta">TVL vs MCap relative to total raised — Stars outperform on both axes</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={quadrantData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
              <YAxis type="category" dataKey="quadrant" tick={{ fill: '#555', fontSize: 12 }} stroke="#ccc" width={95} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                {quadrantData.map((_, idx) => (
                  <Cell key={idx} fill="#1a1a1a" fillOpacity={1 - idx * 0.2} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Vintage Cohorts */}
        <div className="deep-dive-card">
          <h3 className="analytics-subtitle">Vintage Cohort Performance</h3>
          <p className="chart-meta">How funding age correlates with capital efficiency</p>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={vintageCohorts} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" vertical={false} />
              <XAxis dataKey="cohort" tick={{ fill: '#555', fontSize: 11 }} stroke="#ccc" />
              <YAxis yAxisId="left" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                label={{ value: 'Median TVL/R', angle: -90, position: 'insideLeft', fill: '#aaa', fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                label={{ value: 'Efficiency', angle: 90, position: 'insideRight', fill: '#aaa', fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar yAxisId="left" dataKey="medianTvlRatio" fill="#1a1a1a" fillOpacity={0.2} radius={[2, 2, 0, 0]} name="Median TVL/Raised" />
              <Line yAxisId="right" type="monotone" dataKey="medianEfficiency" stroke="#1a1a1a" strokeWidth={2} dot name="Median Efficiency" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Category Capital Efficiency ── */}
      {categoryEfficiency.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 className="analytics-subtitle">Capital Efficiency by Category</h3>
          <p className="chart-meta">Which categories deploy venture capital most productively? Median TVL/Raised and MCap/Raised ratios.</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categoryEfficiency} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" vertical={false} />
              <XAxis dataKey="category" tick={{ fill: '#555', fontSize: 11 }} stroke="#ccc" />
              <YAxis tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc"
                tickFormatter={(v: number) => `${v}x`} />
              <Tooltip contentStyle={tooltipStyle}
                formatter={(value) => [`${(value as number).toFixed(2)}x`]}
                labelFormatter={(cat) => {
                  const d = categoryEfficiency.find(c => c.category === String(cat));
                  return d ? `${d.fullCategory} (${d.count} protocols)` : String(cat);
                }} />
              <Bar dataKey="medianTvlRatio" fill="#1a1a1a" fillOpacity={0.2} radius={[2, 2, 0, 0]} name="TVL/Raised" />
              <Bar dataKey="medianMcapRatio" fill="#1a1a1a" radius={[2, 2, 0, 0]} name="MCap/Raised" />
            </BarChart>
          </ResponsiveContainer>
          <div className="lorenz-legend" style={{ marginTop: 8 }}>
            <span className="lorenz-legend-item"><span className="lorenz-swatch" style={{ background: 'rgba(26,26,26,0.2)' }} /> Median TVL/Raised</span>
            <span className="lorenz-legend-item"><span className="lorenz-swatch" style={{ background: '#1a1a1a' }} /> Median MCap/Raised</span>
          </div>
        </div>
      )}

      {/* ── Top 25 by Capital Efficiency Score ── */}
      <div style={{ marginTop: 32 }}>
        <h3 className="analytics-subtitle">Top 25 by Capital Efficiency Score</h3>
        <p className="chart-meta">
          Composite score: TVL deployment (40%) + revenue generation (30%) + market confidence (20%) + fee capture (10%)
        </p>
        <div className="analytics-table-wrapper" style={{ marginTop: 8 }}>
          <table className="protocol-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th>Protocol</th>
                <th>Category</th>
                <th className="num-cell">Score</th>
                <th className="num-cell">Raised</th>
                <th className="num-cell">TVL</th>
                <th className="num-cell">TVL/R</th>
                <th className="num-cell">MCap/R</th>
                <th className="num-cell">Rev/R (ann)</th>
                <th>Quadrant</th>
              </tr>
            </thead>
            <tbody>
              {topByEfficiency.map((p, i) => (
                <tr key={p.slug} className="protocol-row">
                  <td style={{ color: '#888', fontSize: 12 }}>{i + 1}</td>
                  <td><span style={{ fontWeight: 500 }}>{p.name}</span></td>
                  <td><span className="category-badge">{p.category}</span></td>
                  <td className="num-cell" style={{ fontWeight: 700, fontSize: 16 }}>{p.capitalEfficiency}</td>
                  <td className="num-cell">{fmt(p.totalRaised)}</td>
                  <td className="num-cell">{fmt(p.tvl)}</td>
                  <td className="num-cell">{p.tvlRaisedRatio.toFixed(2)}x</td>
                  <td className="num-cell">{p.mcapRaisedRatio > 0 ? `${p.mcapRaisedRatio.toFixed(2)}x` : '—'}</td>
                  <td className="num-cell">{p.revenuePerRaised > 0 ? `${(p.revenuePerRaised * 100).toFixed(1)}%` : '—'}</td>
                  <td>
                    <span className="regime-badge-sm" style={{
                      background: p.quadrant.startsWith('Star') ? '#2d6a2e'
                        : p.quadrant.startsWith('Builder') ? '#4a7c4b'
                        : p.quadrant.startsWith('Speculative') ? '#c4883c'
                        : '#8b3a3a',
                    }}>
                      {p.quadrant.split(' (')[0].slice(0, 4).toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
