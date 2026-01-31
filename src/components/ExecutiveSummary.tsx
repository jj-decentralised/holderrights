import { useMemo } from 'react';
import {
  AreaChart, Area, ResponsiveContainer, YAxis,
} from 'recharts';
import type { ServerAnalytics } from '../hooks/useDefiData';

function fmt(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

interface Props {
  analytics: ServerAnalytics;
  totalRevenue24h: number;
  totalFees24h: number;
  tvlHistory: { date: number; tvl: number }[];
  revenueChart: { date: number; value: number }[];
  feesChart: { date: number; value: number }[];
  dexVolumeChart: { date: number; value: number }[];
}

type InsightCategory = 'market' | 'revenue' | 'security' | 'funding' | 'yield' | 'chain';

interface Insight {
  category: InsightCategory;
  headline: string;
  detail: string;
  delta: number | null;     // % change — drives arrow + color
  severity: number;          // 0-100 importance ranking (higher = more prominent)
  sparkData: number[];       // mini sparkline values (last ~20 data points)
}

function computeTimeSeriesChange(data: { date: number; value: number }[], days: number): number | null {
  if (data.length < days + 1) return null;
  const recent = data.slice(-days);
  const prior = data.slice(-(days * 2), -days);
  if (prior.length === 0) return null;
  const recentAvg = recent.reduce((s, d) => s + d.value, 0) / recent.length;
  const priorAvg = prior.reduce((s, d) => s + d.value, 0) / prior.length;
  if (priorAvg === 0) return null;
  return ((recentAvg - priorAvg) / priorAvg) * 100;
}

function computeTvlChange(data: { date: number; tvl: number }[], days: number): number | null {
  if (data.length < days + 1) return null;
  const current = data[data.length - 1].tvl;
  const prior = data[data.length - 1 - days]?.tvl;
  if (!prior) return null;
  return ((current - prior) / prior) * 100;
}

function miniSpark(data: { value: number }[], n = 20): number[] {
  const slice = data.slice(-n);
  return slice.map(d => d.value);
}

function miniSparkTvl(data: { tvl: number }[], n = 20): number[] {
  const slice = data.slice(-n);
  return slice.map(d => d.tvl);
}

function Sparkline({ data, positive }: { data: number[]; positive: boolean | null }) {
  if (data.length < 3) return null;
  const chartData = data.map((v, i) => ({ i, v }));
  const color = positive === null ? '#888' : positive ? '#2d6a2e' : '#8b3a3a';
  return (
    <div className="insight-sparkline">
      <ResponsiveContainer width="100%" height={32}>
        <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={`sg-${positive}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
            fill={`url(#sg-${positive})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function DeltaArrow({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const isUp = delta > 0;
  const color = isUp ? '#2d6a2e' : '#8b3a3a';
  const arrow = isUp ? '\u25B2' : '\u25BC';
  return (
    <span className="insight-delta" style={{ color }}>
      {arrow} {Math.abs(delta).toFixed(1)}%
    </span>
  );
}

const categoryIcons: Record<string, string> = {
  market: 'MKT',
  revenue: 'REV',
  security: 'SEC',
  funding: 'FND',
  yield: 'YLD',
  chain: 'CHN',
};

export function ExecutiveSummary({ analytics, totalRevenue24h, totalFees24h, tvlHistory, revenueChart, feesChart, dexVolumeChart }: Props) {
  const ms = analytics.marketStructure;
  const hack = analytics.hackAnalysis;
  const funding = analytics.fundingAnalysis;
  const yld = analytics.yieldAnalysis;
  const chains = analytics.chainAnalysis;
  const revEff = analytics.revenueEfficiency;
  const capEff = analytics.capitalEfficiency;
  const discovery = analytics.valuationDiscovery;

  const insights = useMemo(() => {
    const list: Insight[] = [];

    // 1. TVL trend with sparkline
    const tvl30d = computeTvlChange(tvlHistory, 30);
    const tvl7d = computeTvlChange(tvlHistory, 7);
    if (tvl30d !== null) {
      const direction = tvl30d > 0 ? 'grown' : 'declined';
      const currentTvl = tvlHistory[tvlHistory.length - 1]?.tvl || 0;
      list.push({
        category: 'market',
        headline: `DeFi TVL has ${direction} ${Math.abs(tvl30d).toFixed(1)}% over 30 days`,
        detail: `Currently ${fmt(currentTvl)}.${tvl7d !== null ? ` 7d: ${tvl7d > 0 ? '+' : ''}${tvl7d.toFixed(1)}%.` : ''} ${currentTvl > 0 && ms?.totalRevenue30d > 0 ? `Capital efficiency: ${((ms.totalRevenue30d / currentTvl) * 100).toFixed(3)}% rev/TVL.` : ''}`,
        delta: tvl30d,
        severity: Math.min(95, 60 + Math.abs(tvl30d)),
        sparkData: miniSparkTvl(tvlHistory),
      });
    }

    // 2. Revenue trend with sparkline + annualized yield
    const rev30d = computeTimeSeriesChange(revenueChart, 30);
    if (rev30d !== null) {
      const direction = rev30d > 0 ? 'up' : 'down';
      const annYield = ms?.totalTvl > 0 ? ((totalRevenue24h * 365 / ms.totalTvl) * 100).toFixed(2) : '?';
      list.push({
        category: 'revenue',
        headline: `Aggregate daily revenue is ${direction} ${Math.abs(rev30d).toFixed(0)}% vs prior 30 days`,
        detail: `Today: ${fmt(totalRevenue24h)}/day. Annualized yield on TVL: ${annYield}%. ${ms ? `Revenue per protocol: ${fmt(ms.totalRevenue30d / Math.max(1, ms.protocolsWithRevenue))}/30d avg.` : ''}`,
        delta: rev30d,
        severity: Math.min(90, 55 + Math.abs(rev30d) * 0.8),
        sparkData: miniSpark(revenueChart),
      });
    }

    // 3. Fee retention with efficiency context
    if (totalRevenue24h > 0 && totalFees24h > 0) {
      const retention = (totalRevenue24h / totalFees24h) * 100;
      const feeSpark = miniSpark(feesChart);
      list.push({
        category: 'revenue',
        headline: `Protocols retain ${retention.toFixed(1)}% of fees as revenue`,
        detail: `${fmt(totalFees24h)}/day in fees, ${fmt(totalRevenue24h)}/day captured. ${retention > 50 ? 'Strong value capture — majority of fees flow to protocol treasuries.' : 'Most fees go to liquidity providers, stakers, or are burned.'}`,
        delta: null,
        severity: 50 + Math.abs(retention - 50) * 0.5,
        sparkData: feeSpark,
      });
    }

    // 4. Market concentration
    if (ms) {
      const label = ms.herfindahlTvl > 0.25 ? 'highly concentrated'
        : ms.herfindahlTvl > 0.15 ? 'moderately concentrated'
        : 'competitively structured';
      const giniApprox = ms.top10TvlShare; // proxy
      list.push({
        category: 'market',
        headline: `DeFi market is ${label} — top 10 hold ${(ms.top10TvlShare * 100).toFixed(1)}% of TVL`,
        detail: `Revenue even more concentrated: top 10 earn ${(ms.top10RevenueShare * 100).toFixed(1)}%. Revenue-TVL gap: ${((ms.top10RevenueShare - ms.top10TvlShare) * 100).toFixed(1)}pp — ${ms.top10RevenueShare > ms.top10TvlShare ? 'large protocols capture disproportionate revenue.' : 'revenue is more evenly distributed.'}`,
        delta: null,
        severity: 45 + giniApprox * 30,
        sparkData: [],
      });
    }

    // 5. Top revenue efficiency leader
    if (Array.isArray(revEff) && revEff.length > 0) {
      const top = revEff[0];
      const second = revEff.length > 1 ? revEff[1] : null;
      list.push({
        category: 'revenue',
        headline: `${top.name} leads revenue efficiency at ${((top.revenuePerTvl as number) * 100).toFixed(2)}% rev/TVL`,
        detail: `Earning ${fmt(top.revenue30d as number)}/30d on ${fmt(top.tvl as number)} TVL — ${top.category}.${second ? ` Runner-up: ${second.name} at ${((second.revenuePerTvl as number) * 100).toFixed(2)}%.` : ''}`,
        delta: null,
        severity: 55,
        sparkData: [],
      });
    }

    // 6. Cheapest P/E
    if (Array.isArray(capEff) && capEff.length > 0) {
      const cheapest = [...capEff].filter((p: Record<string, unknown>) => (p.peRatio as number) > 0)
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) => (a.peRatio as number) - (b.peRatio as number));
      if (cheapest.length > 0) {
        const p = cheapest[0];
        const p2 = cheapest.length > 1 ? cheapest[1] : null;
        list.push({
          category: 'revenue',
          headline: `${p.name} has the lowest P/E ratio at ${(p.peRatio as number).toFixed(1)}x`,
          detail: `Revenue yield of ${((p.revenueYield as number) * 100).toFixed(2)}% annualized. MCap: ${fmt(p.mcap as number)}, Revenue: ${fmt(p.revenue30d as number)}/30d.${p2 ? ` #2: ${p2.name} at ${(p2.peRatio as number).toFixed(1)}x.` : ''}`,
          delta: null,
          severity: 52,
          sparkData: [],
        });
      }
    }

    // 7. DEX volume with sparkline
    const dex30d = computeTimeSeriesChange(dexVolumeChart, 30);
    if (dex30d !== null) {
      list.push({
        category: 'market',
        headline: `DEX trading volume ${dex30d > 0 ? 'up' : 'down'} ${Math.abs(dex30d).toFixed(0)}% over 30 days`,
        detail: `Latest daily volume: ${dexVolumeChart.length > 0 ? fmt(dexVolumeChart[dexVolumeChart.length - 1].value) : '—'}. ${dex30d > 20 ? 'Elevated on-chain activity signals increased interest.' : dex30d < -20 ? 'Declining volume may indicate reduced speculative activity.' : ''}`,
        delta: dex30d,
        severity: Math.min(80, 40 + Math.abs(dex30d) * 0.6),
        sparkData: miniSpark(dexVolumeChart),
      });
    }

    // 8. Chain dominance
    if (Array.isArray(chains) && chains.length >= 2) {
      const top = chains[0];
      const second = chains[1];
      const topShare = ms?.totalTvl > 0 ? ((top.totalTvl as number) / ms.totalTvl * 100).toFixed(1) : '?';
      const secondShare = ms?.totalTvl > 0 ? ((second.totalTvl as number) / ms.totalTvl * 100).toFixed(1) : '?';
      list.push({
        category: 'chain',
        headline: `${top.chain} dominates with ${topShare}% of TVL, followed by ${second.chain}`,
        detail: `${top.chain}: ${fmt(top.totalTvl as number)} TVL across ${top.protocolCount} protocols. ${second.chain}: ${fmt(second.totalTvl as number)} (${secondShare}%). ${chains.length > 5 ? `${chains.length} chains tracked total.` : ''}`,
        delta: null,
        severity: 48,
        sparkData: [],
      });
    }

    // 9. Security
    if (hack && hack.totalHacks > 0) {
      const years = Object.entries(hack.hacksByYear as Record<string, { count: number; amount: number }>)
        .sort(([a], [b]) => b.localeCompare(a));
      const latestYear = years[0];
      const avgLoss = hack.totalValueLost / hack.totalHacks;
      list.push({
        category: 'security',
        headline: `${fmt(hack.totalValueLost)} lost in ${hack.totalHacks} security incidents historically`,
        detail: `${latestYear ? `${latestYear[0]}: ${latestYear[1].count} incidents, ${fmt(latestYear[1].amount)} lost. ` : ''}Avg loss: ${fmt(avgLoss)}. ${avgLoss > 10e6 ? 'Large-scale exploits remain a significant risk.' : ''}`,
        delta: null,
        severity: 65,
        sparkData: [],
      });
    }

    // 10. Funding
    if (funding && funding.raiseCount > 0) {
      const years = Object.entries(funding.raisesByYear as Record<string, { count: number; amount: number }>)
        .sort(([a], [b]) => b.localeCompare(a));
      const latestYear = years[0];
      list.push({
        category: 'funding',
        headline: `${fmt(funding.totalRaised)} raised across ${funding.raiseCount} funding rounds`,
        detail: `${latestYear ? `${latestYear[0]}: ${latestYear[1].count} rounds totaling ${fmt(latestYear[1].amount)}. ` : ''}Avg round: ${fmt(funding.totalRaised / funding.raiseCount)}.`,
        delta: null,
        severity: 42,
        sparkData: [],
      });
    }

    // 11. Yield
    if (yld && yld.protocolsWithYield > 0) {
      const topApy = Array.isArray(yld.topByApy) && yld.topByApy.length > 0 ? yld.topByApy[0] : null;
      list.push({
        category: 'yield',
        headline: `${yld.totalPools.toLocaleString()} yield pools across ${yld.protocolsWithYield} protocols`,
        detail: `${topApy ? `Highest APY: ${(topApy.topApy as number).toFixed(1)}% on ${topApy.name}. ` : ''}Pools span lending, DEX LPs, staking, and structured products.`,
        delta: null,
        severity: 38,
        sparkData: [],
      });
    }

    // 12. Fees trend
    const fees30d = computeTimeSeriesChange(feesChart, 30);
    if (fees30d !== null && Math.abs(fees30d) > 5) {
      list.push({
        category: 'revenue',
        headline: `Protocol fees ${fees30d > 0 ? 'rising' : 'falling'}: ${Math.abs(fees30d).toFixed(0)}% change over 30 days`,
        detail: `Today: ${fmt(totalFees24h)}/day. ${fees30d > 15 ? 'Rapidly growing fee base indicates healthy protocol usage.' : fees30d < -15 ? 'Declining fees may signal reduced user activity.' : ''}`,
        delta: fees30d,
        severity: Math.min(75, 40 + Math.abs(fees30d) * 0.5),
        sparkData: miniSpark(feesChart),
      });
    }

    // 13. Undervaluation discovery signal (NEW)
    if (discovery?.rankings?.length > 0) {
      const topUndervalued = discovery.rankings[0];
      const breakoutCount = discovery.momentumRegimes?.find((r: { regime: string }) => r.regime === 'breakout')?.count || 0;
      const divergenceCount = discovery.momentumRegimes?.find((r: { regime: string }) => r.regime === 'divergence')?.count || 0;
      list.push({
        category: 'revenue',
        headline: `${topUndervalued.name} tops undervaluation ranking with score ${topUndervalued.compositeScore.toFixed(1)}`,
        detail: `${discovery.totalScored} protocols scored. ${breakoutCount > 0 ? `${breakoutCount} in breakout regime. ` : ''}${divergenceCount > 0 ? `${divergenceCount} showing TVL-price divergence.` : ''} Avg score: ${discovery.scoreDistribution?.mean || '—'}.`,
        delta: null,
        severity: 70,
        sparkData: [],
      });
    }

    // Sort by severity descending
    list.sort((a, b) => b.severity - a.severity);
    return list;
  }, [analytics, totalRevenue24h, totalFees24h, tvlHistory, revenueChart, feesChart, dexVolumeChart, ms, hack, funding, yld, chains, revEff, capEff, discovery]);

  return (
    <div className="executive-summary">
      <h2 className="section-title">Key Findings</h2>
      <p className="section-desc">
        Auto-generated analytical insights derived from {ms?.totalProtocols?.toLocaleString() || '—'} protocols,
        ranked by significance. Aggregating TVL, revenue, fees, security incidents, funding rounds, and yield data.
      </p>
      <div className="insights-grid">
        {insights.map((insight, i) => (
          <div key={i} className={`insight-card ${i < 2 ? 'insight-card-featured' : ''}`}>
            <div className="insight-header">
              <span className={`insight-tag insight-tag-${insight.category}`}>
                {categoryIcons[insight.category]}
              </span>
              <div className="insight-header-text">
                <h3 className="insight-headline">{insight.headline}</h3>
                {insight.delta !== null && <DeltaArrow delta={insight.delta} />}
              </div>
            </div>
            {insight.sparkData.length > 2 && (
              <Sparkline data={insight.sparkData} positive={insight.delta !== null ? insight.delta > 0 : null} />
            )}
            <p className="insight-detail">{insight.detail}</p>
            {i < 2 && (
              <div className="insight-severity-bar">
                <div className="insight-severity-fill" style={{ width: `${insight.severity}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
