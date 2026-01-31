import { useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Label, ZAxis,
} from 'recharts';
import { HolderRight, HOLDER_RIGHT_DEFINITIONS } from '../types';

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
 * Outerlands Capital (2024) two-axis governance evaluation framework:
 *
 *   Y-axis: RELIABILITY — how enforceable are the rights?
 *     Proxied by: number of distinct right types (breadth of commitment)
 *     + bonus for veToken model (lock-up = stronger commitment)
 *     + bonus for treasury governance (formal fiduciary scope)
 *
 *   X-axis: CONTROL — how economically meaningful are the rights?
 *     Proxied by: weighted score emphasizing revenue share, fee accrual,
 *     buyback/burn (the rights that create direct cash-flow claims)
 *
 *   Academic grounding:
 *     - Lo Monaco, Momtaz & Vismara (2025): proposal passage → +4.7% returns,
 *       voter participation amplifies by +2.2% per σ
 *     - Outerlands Capital: tokens with strong control over economic parameters
 *       can be valued via DCF; those with weak control cannot
 *     - Lommers, Xu & Xu (2022): governance rights are one of three value pillars
 */

/* ── Scoring functions ── */

/** Economic control score (0–10): how much cash-flow power does the token grant? */
function controlScore(rights: string[]): number {
  const econWeights: Record<string, number> = {
    [HolderRight.REVENUE_SHARE]: 3.5,
    [HolderRight.FEE_ACCRUAL]: 2.5,
    [HolderRight.BUYBACK_BURN]: 2.0,
    [HolderRight.VETOKEN_MODEL]: 1.5,
    [HolderRight.STAKING_REWARDS]: 0.5,
  };
  let score = 0;
  for (const r of rights) {
    score += econWeights[r] ?? 0;
  }
  return Math.min(score, 10);
}

/** Reliability score (0–10): how enforceable / structurally committed are the rights? */
function reliabilityScore(rights: string[]): number {
  const count = rights.filter((r) => r !== HolderRight.NONE).length;
  let score = Math.min(count * 1.5, 6); // breadth: up to 6
  if (rights.includes(HolderRight.VETOKEN_MODEL)) score += 2;    // lock commitment
  if (rights.includes(HolderRight.TREASURY_GOVERNANCE)) score += 1; // formal scope
  if (rights.includes(HolderRight.GOVERNANCE_VOTING)) score += 1;   // participation channel
  return Math.min(score, 10);
}

/* ── Quadrant labels ── */
const QUADRANTS = [
  { x: 7.5, y: 8.5, label: 'STRONG ALIGNMENT', sub: 'High control + high reliability', color: '#2d6a2e' },
  { x: 2.5, y: 8.5, label: 'STRUCTURAL ONLY', sub: 'Reliable but limited economic power', color: '#666' },
  { x: 7.5, y: 1.5, label: 'ECONOMIC ONLY', sub: 'Cash-flow rights but weak enforcement', color: '#b07020' },
  { x: 2.5, y: 1.5, label: 'WEAK GOVERNANCE', sub: 'Minimal rights & commitment', color: '#a03030' },
] as const;

/* ── Types ── */
interface Props {
  protocols: {
    name: string;
    slug: string;
    category: string;
    tvl: number;
    mcap: number | null;
    revenue30d: number | null;
    holderRights: string[];
    holderRightsScore: number;
  }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function QuadrantTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.name}</div>
      <div>Category: {d.category}</div>
      <div>Control Score: {d.control.toFixed(1)}/10</div>
      <div>Reliability Score: {d.reliability.toFixed(1)}/10</div>
      <div>Composite Score: {d.holderRightsScore}</div>
      <div>TVL: {fmt(d.tvl)}</div>
      {d.mcap > 0 && <div>MCap: {fmt(d.mcap)}</div>}
      <div style={{ marginTop: 4, fontSize: 11, color: '#888' }}>
        Rights: {d.rightLabels}
      </div>
    </div>
  );
}

export function GovernanceFramework({ protocols }: Props) {
  const data = useMemo(() => {
    return protocols
      .filter((p) => p.holderRights.length > 0 && !p.holderRights.includes(HolderRight.NONE))
      .map((p) => ({
        name: p.name,
        category: p.category,
        control: controlScore(p.holderRights),
        reliability: reliabilityScore(p.holderRights),
        tvl: p.tvl,
        mcap: p.mcap ?? 0,
        holderRightsScore: p.holderRightsScore,
        rightLabels: p.holderRights
          .map((r) => HOLDER_RIGHT_DEFINITIONS[r as HolderRight]?.label ?? r)
          .join(', '),
        z: Math.max(Math.log10(p.tvl + 1) * 15, 20),
      }));
  }, [protocols]);

  if (data.length < 10) return null;

  /* Quadrant stats */
  const strongAlign = data.filter((d) => d.control >= 5 && d.reliability >= 5);
  const weakGov = data.filter((d) => d.control < 5 && d.reliability < 5);
  const avgTvlStrong = strongAlign.length
    ? strongAlign.reduce((s, d) => s + d.tvl, 0) / strongAlign.length
    : 0;
  const avgTvlWeak = weakGov.length
    ? weakGov.reduce((s, d) => s + d.tvl, 0) / weakGov.length
    : 0;
  const tvlMultiple = avgTvlWeak > 0 ? (avgTvlStrong / avgTvlWeak).toFixed(1) : '—';

  const avgMcapStrong = strongAlign.filter((d) => d.mcap > 0);
  const avgMcapWeak = weakGov.filter((d) => d.mcap > 0);
  const mcapStrongVal = avgMcapStrong.length
    ? avgMcapStrong.reduce((s, d) => s + d.mcap, 0) / avgMcapStrong.length
    : 0;
  const mcapWeakVal = avgMcapWeak.length
    ? avgMcapWeak.reduce((s, d) => s + d.mcap, 0) / avgMcapWeak.length
    : 0;

  return (
    <div className="analytics-section">
      <h2 className="section-title">Governance Quality Framework</h2>
      <p className="section-desc">
        Adapted from the <strong>Outerlands Capital (2024)</strong> two-axis evaluation framework.
        Protocols are scored on <strong>Economic Control</strong> (do governance rights cover meaningful cash-flow
        parameters like revenue share, fee switches, buybacks?) and <strong>Reliability</strong> (are rights
        structurally enforced through lock-ups, breadth of mechanisms, and formal governance scope?).
        Research by <strong>Lo Monaco, Momtaz &amp; Vismara (2025)</strong> shows active governance
        participation amplifies token returns by +2.2% per standard deviation.
      </p>

      <div className="chart-card-full">
        <h3 className="chart-card-title">Control vs Reliability Quadrant Map</h3>
        <p style={{ fontSize: 13, color: '#888', margin: '0 0 12px' }}>
          Bubble size = TVL. Protocols in the top-right quadrant have both strong economic rights
          and reliable enforcement mechanisms.
        </p>
        <ResponsiveContainer width="100%" height={480}>
          <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" />
            <XAxis
              type="number"
              dataKey="control"
              domain={[0, 10]}
              tick={{ fill: '#1a1a1a', fontSize: 12 }}
              stroke="#ccc"
            >
              <Label
                value="Economic Control (cash-flow rights)"
                position="bottom"
                offset={10}
                style={{ fill: '#666', fontSize: 13 }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="reliability"
              domain={[0, 10]}
              tick={{ fill: '#1a1a1a', fontSize: 12 }}
              stroke="#ccc"
            >
              <Label
                value="Reliability (enforcement strength)"
                angle={-90}
                position="left"
                offset={0}
                style={{ fill: '#666', fontSize: 13 }}
              />
            </YAxis>
            <ZAxis type="number" dataKey="z" range={[30, 300]} />
            <ReferenceLine x={5} stroke="#ccc" strokeDasharray="6 4" />
            <ReferenceLine y={5} stroke="#ccc" strokeDasharray="6 4" />
            <Tooltip content={<QuadrantTooltip />} />
            <Scatter data={data} fill="#1a1a1a" fillOpacity={0.55} />
          </ScatterChart>
        </ResponsiveContainer>

        {/* Quadrant labels overlay */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
          {QUADRANTS.map((q) => (
            <div
              key={q.label}
              style={{
                padding: '10px 14px',
                background: '#f9f9f7',
                borderRadius: 6,
                borderLeft: `3px solid ${q.color}`,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13, color: q.color }}>{q.label}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{q.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparative stats box */}
      <div
        className="chart-card-full"
        style={{ marginTop: 16, padding: '16px 20px', background: '#f9f9f7', borderRadius: 8, border: '1px solid #e8e8e5' }}
      >
        <h4 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 600 }}>
          Governance Premium — Empirical Evidence
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, fontSize: 13 }}>
          <div>
            <div style={{ color: '#888', marginBottom: 2 }}>Strong Alignment Protocols</div>
            <div style={{ fontWeight: 600 }}>{strongAlign.length} protocols</div>
            <div>Avg TVL: {fmt(avgTvlStrong)}</div>
            {mcapStrongVal > 0 && <div>Avg MCap: {fmt(mcapStrongVal)}</div>}
          </div>
          <div>
            <div style={{ color: '#888', marginBottom: 2 }}>Weak Governance Protocols</div>
            <div style={{ fontWeight: 600 }}>{weakGov.length} protocols</div>
            <div>Avg TVL: {fmt(avgTvlWeak)}</div>
            {mcapWeakVal > 0 && <div>Avg MCap: {fmt(mcapWeakVal)}</div>}
          </div>
          <div>
            <div style={{ color: '#888', marginBottom: 2 }}>TVL Multiple</div>
            <div style={{ fontWeight: 600, fontSize: 20 }}>{tvlMultiple}x</div>
            <div style={{ fontSize: 11, color: '#888' }}>Strong vs Weak governance</div>
          </div>
        </div>
        <p style={{ fontSize: 12, color: '#888', marginTop: 12, marginBottom: 0, lineHeight: 1.5 }}>
          Academic evidence: Lo Monaco et al. (2025) found proposal passage creates +4.7% marginal token returns
          using regression discontinuity across 2020–2024 DAO votes.
          Rossello (2024) found majority blockholder overrides cause -12.77% weekly abnormal returns.
          Cong et al. (2025) show concentrated governance ownership negatively affects platform growth.
        </p>
      </div>

      {/* Protocol table by quadrant */}
      <div className="chart-card-full" style={{ marginTop: 16 }}>
        <div className="analytics-table-wrapper">
          <table className="category-summary-table">
            <thead>
              <tr>
                <th>#</th>
                <th className="cat-name-cell">Protocol</th>
                <th className="cat-name-cell">Category</th>
                <th className="num-cell">Control</th>
                <th className="num-cell">Reliability</th>
                <th className="num-cell">Composite</th>
                <th className="num-cell">TVL</th>
                <th className="num-cell">MCap</th>
                <th className="cat-name-cell">Quadrant</th>
              </tr>
            </thead>
            <tbody>
              {[...data]
                .sort((a, b) => (b.control + b.reliability) - (a.control + a.reliability))
                .slice(0, 25)
                .map((p, i) => {
                  const quad =
                    p.control >= 5 && p.reliability >= 5
                      ? 'Strong Alignment'
                      : p.control >= 5
                        ? 'Economic Only'
                        : p.reliability >= 5
                          ? 'Structural Only'
                          : 'Weak';
                  const quadColor =
                    quad === 'Strong Alignment'
                      ? '#2d6a2e'
                      : quad === 'Weak'
                        ? '#a03030'
                        : '#888';
                  return (
                    <tr key={p.name}>
                      <td style={{ color: '#888' }}>{i + 1}</td>
                      <td className="cat-name-cell">{p.name}</td>
                      <td className="cat-name-cell">{p.category}</td>
                      <td className="num-cell">{p.control.toFixed(1)}</td>
                      <td className="num-cell">{p.reliability.toFixed(1)}</td>
                      <td className="num-cell">{p.holderRightsScore}</td>
                      <td className="num-cell">{fmt(p.tvl)}</td>
                      <td className="num-cell">{p.mcap > 0 ? fmt(p.mcap) : '—'}</td>
                      <td className="cat-name-cell" style={{ color: quadColor, fontWeight: 600 }}>{quad}</td>
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
