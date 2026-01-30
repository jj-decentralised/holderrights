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

interface Insight {
  category: 'market' | 'revenue' | 'security' | 'funding' | 'yield' | 'chain';
  headline: string;
  detail: string;
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

export function ExecutiveSummary({ analytics, totalRevenue24h, totalFees24h, tvlHistory, revenueChart, feesChart, dexVolumeChart }: Props) {
  const ms = analytics.marketStructure;
  const hack = analytics.hackAnalysis;
  const funding = analytics.fundingAnalysis;
  const yld = analytics.yieldAnalysis;
  const chains = analytics.chainAnalysis;
  const revEff = analytics.revenueEfficiency;
  const capEff = analytics.capitalEfficiency;

  const insights: Insight[] = [];

  // TVL trend
  const tvl30d = computeTvlChange(tvlHistory, 30);
  const tvl7d = computeTvlChange(tvlHistory, 7);
  if (tvl30d !== null) {
    const direction = tvl30d > 0 ? 'grown' : 'declined';
    insights.push({
      category: 'market',
      headline: `DeFi TVL has ${direction} ${Math.abs(tvl30d).toFixed(1)}% over 30 days`,
      detail: tvl7d !== null
        ? `Currently ${fmt(tvlHistory[tvlHistory.length - 1]?.tvl || 0)}. 7-day change: ${tvl7d > 0 ? '+' : ''}${tvl7d.toFixed(1)}%.`
        : `Currently ${fmt(tvlHistory[tvlHistory.length - 1]?.tvl || 0)}.`,
    });
  }

  // Revenue trend
  const rev30d = computeTimeSeriesChange(revenueChart, 30);
  if (rev30d !== null) {
    const direction = rev30d > 0 ? 'up' : 'down';
    insights.push({
      category: 'revenue',
      headline: `Aggregate daily revenue is ${direction} ${Math.abs(rev30d).toFixed(0)}% vs prior 30 days`,
      detail: `Today: ${fmt(totalRevenue24h)}/day. Annualized revenue yield on TVL: ${ms?.totalTvl > 0 ? ((totalRevenue24h * 365 / ms.totalTvl) * 100).toFixed(2) : '?'}%.`,
    });
  }

  // Fee retention
  if (totalRevenue24h > 0 && totalFees24h > 0) {
    const retention = (totalRevenue24h / totalFees24h) * 100;
    insights.push({
      category: 'revenue',
      headline: `Protocols retain ${retention.toFixed(1)}% of fees as revenue`,
      detail: `${fmt(totalFees24h)}/day in fees, ${fmt(totalRevenue24h)}/day captured as protocol revenue. The remainder goes to liquidity providers, stakers, or is burned.`,
    });
  }

  // Concentration
  if (ms) {
    const label = ms.herfindahlTvl > 0.25 ? 'highly concentrated'
      : ms.herfindahlTvl > 0.15 ? 'moderately concentrated'
      : 'competitively structured';
    insights.push({
      category: 'market',
      headline: `DeFi market is ${label} — top 10 hold ${(ms.top10TvlShare * 100).toFixed(1)}% of TVL`,
      detail: `Revenue is ${ms.top10RevenueShare > ms.top10TvlShare ? 'even more' : 'less'} concentrated: top 10 earn ${(ms.top10RevenueShare * 100).toFixed(1)}% of all revenue. Herfindahl index: ${ms.herfindahlTvl.toFixed(4)}.`,
    });
  }

  // Top revenue earner
  if (Array.isArray(revEff) && revEff.length > 0) {
    const top = revEff[0];
    insights.push({
      category: 'revenue',
      headline: `${top.name} leads revenue efficiency at ${((top.revenuePerTvl as number) * 100).toFixed(2)}% rev/TVL`,
      detail: `Earning ${fmt(top.revenue30d as number)}/30d on ${fmt(top.tvl as number)} TVL — ${top.category}.`,
    });
  }

  // Capital efficiency / cheapest P/E
  if (Array.isArray(capEff) && capEff.length > 0) {
    const cheapest = [...capEff].filter((p: Record<string, unknown>) => (p.peRatio as number) > 0)
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => (a.peRatio as number) - (b.peRatio as number));
    if (cheapest.length > 0) {
      const p = cheapest[0];
      insights.push({
        category: 'revenue',
        headline: `${p.name} has the lowest P/E ratio at ${(p.peRatio as number).toFixed(1)}x`,
        detail: `Revenue yield of ${((p.revenueYield as number) * 100).toFixed(2)}% annualized. MCap: ${fmt(p.mcap as number)}, Revenue: ${fmt(p.revenue30d as number)}/30d.`,
      });
    }
  }

  // DEX volume trend
  const dex30d = computeTimeSeriesChange(dexVolumeChart, 30);
  if (dex30d !== null) {
    insights.push({
      category: 'market',
      headline: `DEX trading volume ${dex30d > 0 ? 'up' : 'down'} ${Math.abs(dex30d).toFixed(0)}% over 30 days`,
      detail: `Latest daily volume: ${dexVolumeChart.length > 0 ? fmt(dexVolumeChart[dexVolumeChart.length - 1].value) : '—'}.`,
    });
  }

  // Chain dominance
  if (Array.isArray(chains) && chains.length >= 2) {
    const top = chains[0];
    const second = chains[1];
    const topShare = ms?.totalTvl > 0 ? ((top.totalTvl as number) / ms.totalTvl * 100).toFixed(1) : '?';
    insights.push({
      category: 'chain',
      headline: `${top.chain} dominates with ${topShare}% of TVL, followed by ${second.chain}`,
      detail: `${top.chain}: ${fmt(top.totalTvl as number)} TVL across ${top.protocolCount} protocols. ${second.chain}: ${fmt(second.totalTvl as number)} TVL.`,
    });
  }

  // Security
  if (hack && hack.totalHacks > 0) {
    const years = Object.entries(hack.hacksByYear as Record<string, { count: number; amount: number }>)
      .sort(([a], [b]) => b.localeCompare(a));
    const latestYear = years[0];
    insights.push({
      category: 'security',
      headline: `${fmt(hack.totalValueLost)} lost in ${hack.totalHacks} security incidents historically`,
      detail: latestYear
        ? `${latestYear[0]}: ${latestYear[1].count} incidents, ${fmt(latestYear[1].amount)} lost. Average loss per hack: ${fmt(hack.totalValueLost / hack.totalHacks)}.`
        : `Average loss per hack: ${fmt(hack.totalValueLost / hack.totalHacks)}.`,
    });
  }

  // Funding
  if (funding && funding.raiseCount > 0) {
    const years = Object.entries(funding.raisesByYear as Record<string, { count: number; amount: number }>)
      .sort(([a], [b]) => b.localeCompare(a));
    const latestYear = years[0];
    insights.push({
      category: 'funding',
      headline: `${fmt(funding.totalRaised)} raised across ${funding.raiseCount} funding rounds`,
      detail: latestYear
        ? `${latestYear[0]}: ${latestYear[1].count} rounds totaling ${fmt(latestYear[1].amount)}. Avg round: ${fmt(funding.totalRaised / funding.raiseCount)}.`
        : `Average round size: ${fmt(funding.totalRaised / funding.raiseCount)}.`,
    });
  }

  // Yield
  if (yld && yld.protocolsWithYield > 0) {
    const topApy = Array.isArray(yld.topByApy) && yld.topByApy.length > 0 ? yld.topByApy[0] : null;
    insights.push({
      category: 'yield',
      headline: `${yld.totalPools.toLocaleString()} yield pools across ${yld.protocolsWithYield} protocols`,
      detail: topApy
        ? `Highest APY: ${(topApy.topApy as number).toFixed(1)}% on ${topApy.name}. Pools span lending, DEX LPs, staking, and structured products.`
        : `Pools span lending, DEX LPs, staking, and structured products.`,
    });
  }

  // Fees trend
  const fees30d = computeTimeSeriesChange(feesChart, 30);
  if (fees30d !== null && Math.abs(fees30d) > 5) {
    insights.push({
      category: 'revenue',
      headline: `Protocol fees ${fees30d > 0 ? 'rising' : 'falling'}: ${Math.abs(fees30d).toFixed(0)}% change over 30 days`,
      detail: `Today: ${fmt(totalFees24h)}/day. This measures total fees paid by users across all DeFi protocols.`,
    });
  }

  const categoryIcons: Record<string, string> = {
    market: 'MKT',
    revenue: 'REV',
    security: 'SEC',
    funding: 'FND',
    yield: 'YLD',
    chain: 'CHN',
  };

  return (
    <div className="executive-summary">
      <h2 className="section-title">Key Findings</h2>
      <p className="section-desc">
        Auto-generated analytical insights derived from {ms?.totalProtocols?.toLocaleString() || '—'} protocols,
        aggregating TVL, revenue, fees, security incidents, funding rounds, and yield data.
      </p>
      <div className="insights-grid">
        {insights.map((insight, i) => (
          <div key={i} className="insight-card">
            <div className="insight-header">
              <span className={`insight-tag insight-tag-${insight.category}`}>
                {categoryIcons[insight.category]}
              </span>
              <h3 className="insight-headline">{insight.headline}</h3>
            </div>
            <p className="insight-detail">{insight.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
