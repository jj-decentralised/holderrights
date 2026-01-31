import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell,
} from 'recharts';
import { HolderRight, HOLDER_RIGHT_DEFINITIONS } from '../types';
import type { RightTypeStats } from '../hooks/useDefiData';

/* ── helpers ── */
function fmt(v: number): string {
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

/*
 * Per-right economic impact analysis
 *
 * Shows which specific holder rights (revenue share, veToken, buyback, etc.)
 * correlate with the strongest financial outcomes. Uses median-based comparison
 * to avoid outlier distortion.
 *
 * Academic basis:
 *   - Outerlands Capital (2024): economic control rights (fee switches, revenue share,
 *     buybacks) are the primary driver of governance token value
 *   - JFE (2024): bundling cash flow + governance + utility rights creates the most
 *     efficient equilibrium for token-governed platforms
 *   - Gate.com/academic analyses: burn mechanisms command measurable valuation premiums
 */

interface Props {
  rightTypeStats: RightTypeStats[];
  protocols: {
    name: string;
    category: string;
    tvl: number;
    mcap: number | null;
    revenue30d: number | null;
    holderRights: string[];
    holderRightsScore: number;
  }[];
}

/** Median of an array */
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const RIGHT_FILLS: Record<string, string> = {
  [HolderRight.REVENUE_SHARE]: '#1a1a1a',
  [HolderRight.VETOKEN_MODEL]: '#333',
  [HolderRight.FEE_ACCRUAL]: '#555',
  [HolderRight.BUYBACK_BURN]: '#666',
  [HolderRight.STAKING_REWARDS]: '#888',
  [HolderRight.TREASURY_GOVERNANCE]: '#999',
  [HolderRight.GOVERNANCE_VOTING]: '#bbb',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ImpactTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.label}</div>
      <div>Weight: {d.weight}/10</div>
      <div>Adoption: {d.count} protocols</div>
      <div>Median TVL: {fmt(d.medianTvl)}</div>
      <div>Median MCap: {d.medianMcap > 0 ? fmt(d.medianMcap) : '—'}</div>
      <div>Median Revenue (30d): {d.medianRevenue > 0 ? fmt(d.medianRevenue) : '—'}</div>
    </div>
  );
}

export function RightsEconomicImpact({ rightTypeStats, protocols }: Props) {
  /* Build per-right median-based analysis */
  const rightAnalysis = useMemo(() => {
    const rights = Object.values(HolderRight).filter((r) => r !== HolderRight.NONE);

    return rights.map((right) => {
      const def = HOLDER_RIGHT_DEFINITIONS[right];
      const withRight = protocols.filter((p) => p.holderRights.includes(right));
      const withoutRight = protocols.filter(
        (p) => !p.holderRights.includes(right) && !p.holderRights.includes(HolderRight.NONE),
      );

      const tvlsWith = withRight.map((p) => p.tvl).filter((v) => v > 0);
      const tvlsWithout = withoutRight.map((p) => p.tvl).filter((v) => v > 0);
      const mcapsWith = withRight.map((p) => p.mcap).filter((v): v is number => v != null && v > 0);
      const mcapsWithout = withoutRight.map((p) => p.mcap).filter((v): v is number => v != null && v > 0);
      const revsWith = withRight.map((p) => p.revenue30d).filter((v): v is number => v != null && v > 0);
      const revsWithout = withoutRight.map((p) => p.revenue30d).filter((v): v is number => v != null && v > 0);

      const medianTvlWith = median(tvlsWith);
      const medianTvlWithout = median(tvlsWithout);
      const medianMcapWith = median(mcapsWith);
      const medianMcapWithout = median(mcapsWithout);
      const medianRevWith = median(revsWith);
      const medianRevWithout = median(revsWithout);

      return {
        right,
        label: def.label,
        weight: def.weight,
        count: withRight.length,
        medianTvl: medianTvlWith,
        medianMcap: medianMcapWith,
        medianRevenue: medianRevWith,
        tvlPremium: medianTvlWithout > 0 ? ((medianTvlWith / medianTvlWithout - 1) * 100) : null,
        mcapPremium: medianMcapWithout > 0 ? ((medianMcapWith / medianMcapWithout - 1) * 100) : null,
        revenuePremium: medianRevWithout > 0 ? ((medianRevWith / medianRevWithout - 1) * 100) : null,
        fill: RIGHT_FILLS[right] ?? '#aaa',
      };
    }).sort((a, b) => (b.tvlPremium ?? -999) - (a.tvlPremium ?? -999));
  }, [protocols]);

  /* Bubble chart: weight × adoption × median TVL */
  const bubbleData = useMemo(() => {
    return rightAnalysis.map((r) => ({
      ...r,
      z: Math.max(r.count * 3, 20),
    }));
  }, [rightAnalysis]);

  /* Combination rights analysis — which pairs most common among top protocols */
  const comboPairs = useMemo(() => {
    const rights = Object.values(HolderRight).filter((r) => r !== HolderRight.NONE);
    const pairs: { pair: string; count: number; avgTvl: number; avgMcap: number }[] = [];

    for (let i = 0; i < rights.length; i++) {
      for (let j = i + 1; j < rights.length; j++) {
        const matched = protocols.filter(
          (p) => p.holderRights.includes(rights[i]) && p.holderRights.includes(rights[j]),
        );
        if (matched.length >= 3) {
          const tvls = matched.map((p) => p.tvl).filter((v) => v > 0);
          const mcaps = matched.map((p) => p.mcap).filter((v): v is number => v != null && v > 0);
          pairs.push({
            pair: `${HOLDER_RIGHT_DEFINITIONS[rights[i]].label} + ${HOLDER_RIGHT_DEFINITIONS[rights[j]].label}`,
            count: matched.length,
            avgTvl: tvls.length ? tvls.reduce((s, v) => s + v, 0) / tvls.length : 0,
            avgMcap: mcaps.length ? mcaps.reduce((s, v) => s + v, 0) / mcaps.length : 0,
          });
        }
      }
    }
    return pairs.sort((a, b) => b.avgTvl - a.avgTvl).slice(0, 10);
  }, [protocols]);

  if (rightAnalysis.length < 3) return null;

  const statsData = rightTypeStats.filter((r) => r.count > 0);

  return (
    <div className="analytics-section">
      <h2 className="section-title">Rights Economic Impact</h2>
      <p className="section-desc">
        Which specific holder rights correlate with the strongest financial outcomes?
        Compares median TVL, market cap, and revenue for protocols <em>with</em> vs <em>without</em> each right type.
        Based on the <strong>JFE (2024)</strong> finding that tokens bundling cash-flow claims with governance
        create more efficient equilibria, and <strong>Outerlands Capital&apos;s</strong> insight that economic control
        rights are the primary driver of governance token value.
      </p>

      {/* Bubble chart: weight vs adoption, sized by median TVL */}
      <div className="chart-card-full">
        <h3 className="chart-card-title">Right Type Landscape</h3>
        <p style={{ fontSize: 13, color: '#888', margin: '0 0 12px' }}>
          X = scoring weight, Y = number of protocols with this right, bubble size = median TVL
        </p>
        <ResponsiveContainer width="100%" height={380}>
          <ScatterChart margin={{ top: 10, right: 30, bottom: 30, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
            <XAxis
              type="number"
              dataKey="weight"
              domain={[0, 11]}
              tick={{ fill: '#1a1a1a', fontSize: 12 }}
              stroke="#ccc"
              label={{ value: 'Scoring Weight', position: 'bottom', offset: 10, style: { fill: '#666', fontSize: 13 } }}
            />
            <YAxis
              type="number"
              dataKey="count"
              tick={{ fill: '#1a1a1a', fontSize: 12 }}
              stroke="#ccc"
              label={{ value: 'Adoption (# protocols)', angle: -90, position: 'left', style: { fill: '#666', fontSize: 13 } }}
            />
            <ZAxis type="number" dataKey="z" range={[40, 400]} />
            <Tooltip content={<ImpactTooltip />} />
            <Scatter data={bubbleData}>
              {bubbleData.map((d, i) => (
                <Cell key={i} fill={d.fill} fillOpacity={0.7} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Premium comparison bars */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-card-title">TVL Premium by Right Type</h3>
          <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>
            % difference in median TVL: protocols WITH this right vs WITHOUT
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={rightAnalysis.filter((r) => r.tvlPremium != null)}
              layout="vertical"
              margin={{ top: 5, right: 20, bottom: 5, left: 110 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`}
                tick={{ fill: '#1a1a1a', fontSize: 11 }}
                stroke="#ccc"
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fill: '#1a1a1a', fontSize: 12 }}
                stroke="#ccc"
                width={105}
              />
              <Tooltip
                formatter={(value) => [`${(value as number) >= 0 ? '+' : ''}${(value as number).toFixed(1)}%`, 'TVL Premium']}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="tvlPremium" radius={[0, 3, 3, 0]}>
                {rightAnalysis.filter((r) => r.tvlPremium != null).map((r, i) => (
                  <Cell key={i} fill={(r.tvlPremium ?? 0) >= 0 ? '#1a1a1a' : '#a03030'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <h3 className="chart-card-title">Revenue Premium by Right Type</h3>
          <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>
            % difference in median 30d revenue: WITH vs WITHOUT
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={rightAnalysis.filter((r) => r.revenuePremium != null)}
              layout="vertical"
              margin={{ top: 5, right: 20, bottom: 5, left: 110 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`}
                tick={{ fill: '#1a1a1a', fontSize: 11 }}
                stroke="#ccc"
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fill: '#1a1a1a', fontSize: 12 }}
                stroke="#ccc"
                width={105}
              />
              <Tooltip
                formatter={(value) => [`${(value as number) >= 0 ? '+' : ''}${(value as number).toFixed(1)}%`, 'Revenue Premium']}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="revenuePremium" radius={[0, 3, 3, 0]}>
                {rightAnalysis.filter((r) => r.revenuePremium != null).map((r, i) => (
                  <Cell key={i} fill={(r.revenuePremium ?? 0) >= 0 ? '#1a1a1a' : '#a03030'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rights combination analysis */}
      {comboPairs.length > 0 && (
        <div className="chart-card-full" style={{ marginTop: 16 }}>
          <h3 className="chart-card-title">Most Valuable Rights Combinations</h3>
          <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>
            Which pairs of rights appear together in the highest-valued protocols?
            The JFE (2024) paper shows bundling multiple right types creates more efficient equilibria.
          </p>
          <div className="analytics-table-wrapper">
            <table className="category-summary-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="cat-name-cell">Rights Combination</th>
                  <th className="num-cell">Protocols</th>
                  <th className="num-cell">Avg TVL</th>
                  <th className="num-cell">Avg MCap</th>
                </tr>
              </thead>
              <tbody>
                {comboPairs.map((pair, i) => (
                  <tr key={pair.pair}>
                    <td style={{ color: '#888' }}>{i + 1}</td>
                    <td className="cat-name-cell">{pair.pair}</td>
                    <td className="num-cell">{pair.count}</td>
                    <td className="num-cell">{pair.avgTvl > 0 ? fmt(pair.avgTvl) : '—'}</td>
                    <td className="num-cell">{pair.avgMcap > 0 ? fmt(pair.avgMcap) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full per-right stats table */}
      <div className="chart-card-full" style={{ marginTop: 16 }}>
        <h3 className="chart-card-title">Per-Right Financial Summary</h3>
        <div className="analytics-table-wrapper">
          <table className="category-summary-table">
            <thead>
              <tr>
                <th className="cat-name-cell">Right Type</th>
                <th className="num-cell">Weight</th>
                <th className="num-cell">Adoption</th>
                <th className="num-cell">Avg TVL</th>
                <th className="num-cell">Avg MCap</th>
                <th className="num-cell">Avg Revenue</th>
                <th className="num-cell">TVL Premium</th>
                <th className="num-cell">MCap Premium</th>
              </tr>
            </thead>
            <tbody>
              {rightAnalysis.map((r) => {
                const stat = statsData.find((s) => s.right === r.right);
                return (
                  <tr key={r.right}>
                    <td className="cat-name-cell" style={{ fontWeight: 600 }}>{r.label}</td>
                    <td className="num-cell">{r.weight}/10</td>
                    <td className="num-cell">{r.count}</td>
                    <td className="num-cell">{stat?.avgTvl ? fmt(stat.avgTvl) : '—'}</td>
                    <td className="num-cell">{(stat?.avgMcap ?? 0) > 0 ? fmt(stat!.avgMcap!) : '—'}</td>
                    <td className="num-cell">{(stat?.avgRevenue30d ?? 0) > 0 ? fmt(stat!.avgRevenue30d!) : '—'}</td>
                    <td className="num-cell" style={{ color: (r.tvlPremium ?? 0) >= 0 ? '#2d6a2e' : '#a03030' }}>
                      {r.tvlPremium != null ? `${r.tvlPremium >= 0 ? '+' : ''}${r.tvlPremium.toFixed(0)}%` : '—'}
                    </td>
                    <td className="num-cell" style={{ color: (r.mcapPremium ?? 0) >= 0 ? '#2d6a2e' : '#a03030' }}>
                      {r.mcapPremium != null ? `${r.mcapPremium >= 0 ? '+' : ''}${r.mcapPremium.toFixed(0)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
