import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts';

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
 * Governance Premium Quantification
 *
 * Groups protocols by governance quality tier (based on holderRightsScore)
 * and compares median financial metrics across tiers.
 *
 * Academic basis:
 *   - Lommers, Xu & Xu (2022): governance rights are a distinct value pillar
 *     analogous to corporate control premiums
 *   - Lo Monaco et al. (2025): active governance creates measurable returns
 *   - Outerlands Capital: tokens with economic governance command a DCF-able premium
 *
 * Tiers:
 *   Tier 1 (score 0–5):   Minimal rights — governance-only or none
 *   Tier 2 (score 6–15):  Moderate rights — 1-2 economic mechanisms
 *   Tier 3 (score 16–25): Strong rights — multiple accrual pathways
 *   Tier 4 (score 26+):   Comprehensive — deep alignment (veToken + revenue + treasury)
 */

interface Props {
  protocols: {
    name: string;
    category: string;
    tvl: number;
    mcap: number | null;
    revenue30d: number | null;
    fees30d: number | null;
    holderRightsScore: number;
    holderRights: string[];
    priceChange30d: number | null;
  }[];
}

interface TierData {
  tier: string;
  range: string;
  count: number;
  medianTvl: number;
  medianMcap: number;
  medianRevenue: number;
  avgRevPerTvl: number;
  medianPriceChange: number | null;
  fill: string;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const TIER_COLORS = ['#bbb', '#888', '#444', '#1a1a1a'] as const;

const TIERS = [
  { name: 'Minimal', range: '0–5', min: 0, max: 5, fill: TIER_COLORS[0] },
  { name: 'Moderate', range: '6–15', min: 6, max: 15, fill: TIER_COLORS[1] },
  { name: 'Strong', range: '16–25', min: 16, max: 25, fill: TIER_COLORS[2] },
  { name: 'Comprehensive', range: '26+', min: 26, max: 999, fill: TIER_COLORS[3] },
] as const;

export function GovernancePremium({ protocols }: Props) {
  const tierData = useMemo<TierData[]>(() => {
    return TIERS.map((t) => {
      const group = protocols.filter(
        (p) => p.holderRightsScore >= t.min && p.holderRightsScore <= t.max,
      );
      const tvls = group.map((p) => p.tvl).filter((v) => v > 0);
      const mcaps = group.map((p) => p.mcap).filter((v): v is number => v != null && v > 0);
      const revs = group.map((p) => p.revenue30d).filter((v): v is number => v != null && v > 0);
      const prices = group.map((p) => p.priceChange30d).filter((v): v is number => v != null);
      const revPerTvl = group
        .filter((p) => (p.revenue30d ?? 0) > 0 && p.tvl > 0)
        .map((p) => (p.revenue30d! * 12) / p.tvl);

      return {
        tier: t.name,
        range: t.range,
        count: group.length,
        medianTvl: median(tvls),
        medianMcap: median(mcaps),
        medianRevenue: median(revs),
        avgRevPerTvl: revPerTvl.length ? revPerTvl.reduce((s, v) => s + v, 0) / revPerTvl.length : 0,
        medianPriceChange: prices.length ? median(prices) : null,
        fill: t.fill,
      };
    });
  }, [protocols]);

  const hasData = tierData.some((t) => t.count > 0);
  if (!hasData) return null;

  /* Premium calculation: tier 4 vs tier 1 */
  const top = tierData[3];
  const bottom = tierData[0];
  const tvlPremium = bottom.medianTvl > 0
    ? ((top.medianTvl / bottom.medianTvl - 1) * 100).toFixed(0)
    : null;
  const mcapPremium = bottom.medianMcap > 0
    ? ((top.medianMcap / bottom.medianMcap - 1) * 100).toFixed(0)
    : null;
  const revPremium = bottom.medianRevenue > 0
    ? ((top.medianRevenue / bottom.medianRevenue - 1) * 100).toFixed(0)
    : null;

  return (
    <div className="analytics-section">
      <h2 className="section-title">The Governance Premium</h2>
      <p className="section-desc">
        Quantifying the valuation difference between protocols with strong vs weak holder rights.
        Based on the <strong>Lommers, Xu &amp; Xu (2022)</strong> framework that identifies governance
        rights as a distinct value pillar, analogous to corporate control premiums.
        Protocols are grouped into four tiers by composite holder rights score.
      </p>

      {/* Premium headline cards */}
      <div className="market-stats-grid">
        <div className="stat-card">
          <div className="stat-label">TVL Premium</div>
          <div className="stat-value">{tvlPremium != null ? `+${tvlPremium}%` : '—'}</div>
          <div style={{ fontSize: 11, color: '#888' }}>Comprehensive vs Minimal tier</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">MCap Premium</div>
          <div className="stat-value">{mcapPremium != null ? `+${mcapPremium}%` : '—'}</div>
          <div style={{ fontSize: 11, color: '#888' }}>Median market cap difference</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Revenue Premium</div>
          <div className="stat-value">{revPremium != null ? `+${revPremium}%` : '—'}</div>
          <div style={{ fontSize: 11, color: '#888' }}>Median 30d revenue difference</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Classified</div>
          <div className="stat-value">{tierData.reduce((s, t) => s + t.count, 0)}</div>
          <div style={{ fontSize: 11, color: '#888' }}>Protocols across all tiers</div>
        </div>
      </div>

      {/* Grouped bar charts */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-card-title">Median TVL by Governance Tier</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tierData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" vertical={false} />
              <XAxis dataKey="tier" tick={{ fill: '#1a1a1a', fontSize: 12 }} stroke="#ccc" />
              <YAxis tickFormatter={(v) => fmt(v)} tick={{ fill: '#1a1a1a', fontSize: 11 }} stroke="#ccc" />
              <Tooltip
                formatter={(value) => [fmt(value as number), 'Median TVL']}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="medianTvl" radius={[3, 3, 0, 0]}>
                {tierData.map((t, i) => (
                  <Cell key={i} fill={t.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <h3 className="chart-card-title">Median Market Cap by Tier</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tierData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" vertical={false} />
              <XAxis dataKey="tier" tick={{ fill: '#1a1a1a', fontSize: 12 }} stroke="#ccc" />
              <YAxis tickFormatter={(v) => fmt(v)} tick={{ fill: '#1a1a1a', fontSize: 11 }} stroke="#ccc" />
              <Tooltip
                formatter={(value) => [fmt(value as number), 'Median MCap']}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="medianMcap" radius={[3, 3, 0, 0]}>
                {tierData.map((t, i) => (
                  <Cell key={i} fill={t.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-card-title">Median 30d Revenue by Tier</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tierData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" vertical={false} />
              <XAxis dataKey="tier" tick={{ fill: '#1a1a1a', fontSize: 12 }} stroke="#ccc" />
              <YAxis tickFormatter={(v) => fmt(v)} tick={{ fill: '#1a1a1a', fontSize: 11 }} stroke="#ccc" />
              <Tooltip
                formatter={(value) => [fmt(value as number), 'Median Revenue']}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="medianRevenue" radius={[3, 3, 0, 0]}>
                {tierData.map((t, i) => (
                  <Cell key={i} fill={t.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <h3 className="chart-card-title">Avg Annualized Revenue / TVL by Tier</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tierData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" vertical={false} />
              <XAxis dataKey="tier" tick={{ fill: '#1a1a1a', fontSize: 12 }} stroke="#ccc" />
              <YAxis
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                tick={{ fill: '#1a1a1a', fontSize: 11 }}
                stroke="#ccc"
              />
              <Tooltip
                formatter={(value) => [`${((value as number) * 100).toFixed(2)}%`, 'Rev/TVL']}
                contentStyle={tooltipStyle}
              />
              <Legend />
              <Bar dataKey="avgRevPerTvl" name="Revenue Yield (annualized)" radius={[3, 3, 0, 0]}>
                {tierData.map((t, i) => (
                  <Cell key={i} fill={t.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tier detail table */}
      <div className="chart-card-full" style={{ marginTop: 16 }}>
        <div className="analytics-table-wrapper">
          <table className="category-summary-table">
            <thead>
              <tr>
                <th className="cat-name-cell">Tier</th>
                <th className="num-cell">Score Range</th>
                <th className="num-cell">Protocols</th>
                <th className="num-cell">Median TVL</th>
                <th className="num-cell">Median MCap</th>
                <th className="num-cell">Median Revenue</th>
                <th className="num-cell">Rev/TVL</th>
                <th className="num-cell">Median 30d Price</th>
              </tr>
            </thead>
            <tbody>
              {tierData.map((t) => (
                <tr key={t.tier}>
                  <td className="cat-name-cell" style={{ fontWeight: 600 }}>{t.tier}</td>
                  <td className="num-cell">{t.range}</td>
                  <td className="num-cell">{t.count}</td>
                  <td className="num-cell">{t.medianTvl > 0 ? fmt(t.medianTvl) : '—'}</td>
                  <td className="num-cell">{t.medianMcap > 0 ? fmt(t.medianMcap) : '—'}</td>
                  <td className="num-cell">{t.medianRevenue > 0 ? fmt(t.medianRevenue) : '—'}</td>
                  <td className="num-cell">{t.avgRevPerTvl > 0 ? `${(t.avgRevPerTvl * 100).toFixed(2)}%` : '—'}</td>
                  <td className="num-cell" style={{ color: (t.medianPriceChange ?? 0) >= 0 ? '#2d6a2e' : '#a03030' }}>
                    {t.medianPriceChange != null ? `${t.medianPriceChange >= 0 ? '+' : ''}${t.medianPriceChange.toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Academic context */}
      <div
        className="chart-card-full"
        style={{ marginTop: 16, padding: '16px 20px', background: '#f9f9f7', borderRadius: 8, border: '1px solid #e8e8e5' }}
      >
        <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600 }}>Literature Context</h4>
        <ul style={{ fontSize: 12, color: '#555', lineHeight: 1.7, margin: 0, paddingLeft: 18 }}>
          <li><strong>Lommers, Xu &amp; Xu (2022)</strong> — DAO token value derives from three pillars: community, utility, and governance rights. The "Discounted Value of Benefits" model parallels corporate control premiums for blockholders with governance power.</li>
          <li><strong>Lo Monaco, Momtaz &amp; Vismara (2025)</strong> — Regression discontinuity on DAO votes shows proposal passage creates +4.7% marginal token returns; voter participation amplifies by +2.2% per standard deviation.</li>
          <li><strong>Bellavitis &amp; Momtaz (2024)</strong> — Deviations from decentralization systematically undermine DAO value.</li>
          <li><strong>Technology in Society (2023)</strong> — DeFi governance tends toward "timocracy" (plutocratic rule) when voting rights are freely tradeable without anti-concentration protections.</li>
        </ul>
      </div>
    </div>
  );
}
