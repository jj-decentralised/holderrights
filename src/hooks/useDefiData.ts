import { useEffect, useState, useCallback } from 'react';
import {
  fetchProtocols,
  fetchRevenueOverview,
  fetchFeesOverview,
  fetchMultiplePriceCharts,
  fetchProtocolRevenue,
  fetchHistoricalTvl,
  fetchDexOverview,
  fetchDerivativesOverview,
  fetchOptionsOverview,
  fetchPricePercentChange,
  fetchTreasuries,
  fetchHacks,
  fetchRaises,
  fetchYieldPools,
  setApiKey,
  hasApiKey,
} from '../services/defiLlama';
import type { LlamaProtocol, ProtocolFees, DexProtocol, DerivativesProtocol, TreasuryProtocol, HackEvent, FundingRound, YieldPool } from '../services/defiLlama';
import { PROTOCOL_CLASSIFICATIONS } from '../data/protocolClassifications';
import { HolderRight, HOLDER_RIGHT_DEFINITIONS } from '../types';
import type { EnrichedProtocol, CorrelationPoint, HolderRight as HolderRightType } from '../types';

// ── Per-category stats ──

export interface CategoryStats {
  category: string;
  protocolCount: number;
  totalRevenue30d: number;
  totalFees30d: number;
  totalTvl: number;
  totalMcap: number;
  avgScore: number;
  medianScore: number;
  minScore: number;
  maxScore: number;
  avgFeeToRevenue: number | null;
  avgTvlToMcap: number | null;
  protocols: EnrichedProtocol[];
}

// ── Per-right aggregations ──

export interface RightTypeStats {
  right: HolderRightType;
  label: string;
  weight: number;
  count: number;
  avgRevenue30d: number | null;
  avgMcap: number | null;
  avgTvl: number;
  protocolNames: string[];
}

export interface DashboardData {
  protocols: EnrichedProtocol[];
  correlationPoints: CorrelationPoint[];
  totalRevenue24h: number;
  totalFees24h: number;
  revenueByCategory: Record<string, number>;
  avgScoreByCategory: Record<string, number>;
  categoryStats: CategoryStats[];
  rightTypeStats: RightTypeStats[];
  historicalTvl: { date: number; tvl: number }[];
  aggregateRevenueChart: { date: number; value: number }[];
  loading: boolean;
  error: string | null;
  selectedProtocol: EnrichedProtocol | null;
  selectProtocol: (slug: string | null) => void;
  revenueHistory: { date: number; value: number }[];
  hasProData: boolean;
}

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Normalize name for fuzzy matching across APIs
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function useDefiData(): DashboardData {
  // Initialize Pro API key from environment if available
  const envKey = import.meta.env.VITE_DEFILLAMA_API_KEY;
  if (envKey) setApiKey(envKey);

  const [protocols, setProtocols] = useState<EnrichedProtocol[]>([]);
  const [correlationPoints, setCorrelationPoints] = useState<CorrelationPoint[]>([]);
  const [totalRevenue24h, setTotalRevenue24h] = useState(0);
  const [totalFees24h, setTotalFees24h] = useState(0);
  const [revenueByCategory, setRevenueByCategory] = useState<Record<string, number>>({});
  const [avgScoreByCategory, setAvgScoreByCategory] = useState<Record<string, number>>({});
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [rightTypeStats, setRightTypeStats] = useState<RightTypeStats[]>([]);
  const [historicalTvl, setHistoricalTvl] = useState<{ date: number; tvl: number }[]>([]);
  const [aggregateRevenueChart, setAggregateRevenueChart] = useState<{ date: number; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProtocol, setSelectedProtocol] = useState<EnrichedProtocol | null>(null);
  const [revenueHistory, setRevenueHistory] = useState<{ date: number; value: number }[]>([]);
  const [hasProData, setHasProData] = useState(false);

  const selectProtocol = useCallback((slug: string | null) => {
    if (!slug) {
      setSelectedProtocol(null);
      return;
    }
    const found = protocols.find((p) => p.slug === slug);
    if (found) {
      setSelectedProtocol(found);
      fetchProtocolRevenue(slug)
        .then((data) => {
          if (data.totalDataChart) {
            setRevenueHistory(
              data.totalDataChart
                .filter((d) => d[1] > 0)
                .map((d) => ({ date: d[0], value: d[1] }))
            );
          }
        })
        .catch(() => {});
    }
  }, [protocols]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        // ── Phase 1: Core data (always available) ──
        const [allProtocols, revenueData, feesData, tvlHistory, dexData, derivsData, optionsData] = await Promise.all([
          fetchProtocols(),
          fetchRevenueOverview(),
          fetchFeesOverview(),
          fetchHistoricalTvl().catch(() => [] as { date: number; tvl: number }[]),
          fetchDexOverview().catch(() => null),
          fetchDerivativesOverview().catch(() => null),
          fetchOptionsOverview().catch(() => null),
        ]);

        setTotalRevenue24h(revenueData.total24h || 0);
        setTotalFees24h(feesData.total24h || 0);

        // Store historical TVL (last 365 days for cleaner chart)
        if (Array.isArray(tvlHistory) && tvlHistory.length > 365) {
          setHistoricalTvl(tvlHistory.slice(-365));
        } else if (Array.isArray(tvlHistory)) {
          setHistoricalTvl(tvlHistory);
        }

        // Store aggregate revenue time-series from overview
        if (Array.isArray(revenueData?.totalDataChart) && revenueData.totalDataChart.length) {
          const revChart = revenueData.totalDataChart
            .filter((d) => d[1] > 0)
            .map((d) => ({ date: d[0], value: d[1] }));
          setAggregateRevenueChart(revChart);
        }

        // ── Phase 2: Pro API data (if key available) ──
        let treasuryData: TreasuryProtocol[] = [];
        let hackData: HackEvent[] = [];
        let raisesData: FundingRound[] = [];
        let yieldData: YieldPool[] = [];

        if (hasApiKey()) {
          const [tres, hacks, raises, yields] = await Promise.all([
            fetchTreasuries().catch(() => [] as TreasuryProtocol[]),
            fetchHacks().catch(() => [] as HackEvent[]),
            fetchRaises().catch(() => [] as FundingRound[]),
            fetchYieldPools().then(r => r?.data || []).catch(() => [] as YieldPool[]),
          ]);
          // Guard against non-array responses from pro API
          treasuryData = Array.isArray(tres) ? tres : [];
          hackData = Array.isArray(hacks) ? hacks : [];
          raisesData = Array.isArray(raises) ? raises : [];
          yieldData = Array.isArray(yields) ? yields : [];

          if (treasuryData.length > 0 || hackData.length > 0 || raisesData.length > 0) {
            setHasProData(true);
          }
        }

        // ── Index all data by slug / name ──

        const revenueBySlug: Record<string, ProtocolFees> = {};
        const revProtos = revenueData?.protocols;
        if (Array.isArray(revProtos)) {
          revProtos.forEach((p) => { revenueBySlug[p.slug] = p; });
        }

        const feesBySlug: Record<string, ProtocolFees> = {};
        const feeProtos = feesData?.protocols;
        if (Array.isArray(feeProtos)) {
          feeProtos.forEach((p) => { feesBySlug[p.slug] = p; });
        }

        const protocolsBySlug: Record<string, LlamaProtocol> = {};
        if (Array.isArray(allProtocols)) {
          allProtocols.forEach((p) => { protocolsBySlug[p.slug] = p; });
        }

        // DEX volumes by slug
        const dexBySlug: Record<string, DexProtocol> = {};
        const dexProtos = dexData?.protocols;
        if (Array.isArray(dexProtos)) {
          dexProtos.forEach((p) => { dexBySlug[p.slug] = p; });
        }

        // Derivatives volumes by slug
        const derivsBySlug: Record<string, DerivativesProtocol> = {};
        const derivsProtos = derivsData?.protocols;
        if (Array.isArray(derivsProtos)) {
          derivsProtos.forEach((p) => { derivsBySlug[p.slug] = p; });
        }

        // Options volumes by slug
        const optionsBySlug: Record<string, DerivativesProtocol> = {};
        const optionsProtos = optionsData?.protocols;
        if (Array.isArray(optionsProtos)) {
          optionsProtos.forEach((p) => { optionsBySlug[p.slug] = p; });
        }

        // Treasury by normalized name (treasury API uses names, not slugs)
        const treasuryByName: Record<string, TreasuryProtocol> = {};
        const treasuryBySlug: Record<string, TreasuryProtocol> = {};
        treasuryData.forEach((t) => {
          if (t.name) treasuryByName[normalizeName(t.name)] = t;
          if (t.slug) treasuryBySlug[t.slug] = t;
        });

        // Hacks by normalized name (hacks use protocol names)
        const hacksByName: Record<string, HackEvent[]> = {};
        hackData.forEach((h) => {
          if (!h.name) return;
          const key = normalizeName(h.name);
          if (!hacksByName[key]) hacksByName[key] = [];
          hacksByName[key].push(h);
        });

        // Raises by normalized name
        const raisesByName: Record<string, FundingRound[]> = {};
        raisesData.forEach((r) => {
          if (!r.name) return;
          const key = normalizeName(r.name);
          if (!raisesByName[key]) raisesByName[key] = [];
          raisesByName[key].push(r);
        });

        // Yields by project slug
        const yieldsByProject: Record<string, YieldPool[]> = {};
        yieldData.forEach((y) => {
          if (!y.project) return;
          const key = y.project.toLowerCase();
          if (!yieldsByProject[key]) yieldsByProject[key] = [];
          yieldsByProject[key].push(y);
        });

        // ── Fetch price charts ──
        const geckoIds = PROTOCOL_CLASSIFICATIONS
          .map((c) => c.geckoId)
          .filter(Boolean);

        const priceCharts = await fetchMultiplePriceCharts(geckoIds);

        // ── Fetch multi-period price percentage changes ──
        let priceChanges: Record<string, Record<string, number>> = {};
        try {
          const coins = geckoIds.map((id) => `coingecko:${id}`);
          // Fetch in batches of 25 to avoid URL length limits
          const changeBatchSize = 25;
          for (let i = 0; i < coins.length; i += changeBatchSize) {
            const batch = coins.slice(i, i + changeBatchSize);
            const result = await fetchPricePercentChange(batch);
            if (result && typeof result === 'object') {
              Object.assign(priceChanges, result);
            }
          }
        } catch {
          // Price changes are supplementary — continue without them
        }

        // ── Build enriched protocols ──
        const enriched: EnrichedProtocol[] = [];

        for (const classification of PROTOCOL_CLASSIFICATIONS) {
          const proto = protocolsBySlug[classification.slug];
          const revenue = revenueBySlug[classification.slug];
          const fees = feesBySlug[classification.slug];
          const priceHistory = priceCharts[classification.geckoId] || [];
          const dex = dexBySlug[classification.slug];

          const tvl = proto?.tvl || 0;
          const mcap = proto?.mcap || null;
          const revenue30d = revenue?.total30d || null;
          const deriv = derivsBySlug[classification.slug];
          const option = optionsBySlug[classification.slug];

          // Price change data
          const coinKey = `coingecko:${classification.geckoId}`;
          const pctData = priceChanges[coinKey];
          const priceChange1d = pctData?.['1d'] ?? null;
          const priceChange7d = pctData?.['7d'] ?? null;
          const priceChange30d = pctData?.['30d'] ?? null;

          // Match treasury data
          const normalName = normalizeName(classification.name);
          const treasury = treasuryBySlug[classification.slug] || treasuryByName[normalName] || null;

          // Match hack data
          const hacks = hacksByName[normalName] || [];
          const totalHacked = hacks.reduce((s, h) => s + (h.amount || 0), 0);
          const lastHack = hacks.length > 0
            ? hacks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
            : null;

          // Match raises data
          const raises = raisesByName[normalName] || [];
          const totalRaised = raises.reduce((s, r) => s + (r.amount || 0), 0);
          const latestRaise = raises.length > 0
            ? raises.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
            : null;

          // Match yield data
          const pools = yieldsByProject[classification.slug] || yieldsByProject[normalName] || [];
          const poolApys = pools.filter(p => p.apy > 0 && p.apy < 10000).map(p => p.apy);
          const topApy = poolApys.length > 0 ? Math.max(...poolApys) : null;
          const avgApy = poolApys.length > 0 ? poolApys.reduce((s, v) => s + v, 0) / poolApys.length : null;

          enriched.push({
            slug: classification.slug,
            name: classification.name,
            symbol: classification.symbol,
            category: classification.category,
            geckoId: classification.geckoId,
            logo: proto?.logo || '',
            tvl,
            mcap,
            revenue24h: revenue?.total24h || null,
            revenue7d: revenue?.total7d || null,
            revenue30d,
            revenueAllTime: revenue?.totalAllTime || null,
            fees24h: fees?.total24h || null,
            fees30d: fees?.total30d || null,
            holderRights: classification.holderRights,
            holderRightsScore: classification.holderRightsScore,
            holderRightsNotes: classification.holderRightsNotes,
            priceHistory,
            revenueHistory: [],
            mcapToRevenue: mcap && revenue30d ? mcap / (revenue30d * 12) : null,
            tvlToRevenue: tvl && revenue30d ? tvl / (revenue30d * 12) : null,
            // DEX volumes
            dexVolume24h: dex?.total24h || null,
            dexVolume30d: dex?.total30d || null,
            // Treasury
            treasuryTotal: treasury?.total || null,
            treasuryStablecoins: treasury?.stablecoins || null,
            treasuryMajors: treasury?.majors || null,
            treasuryOwnTokens: treasury?.ownTokens || null,
            treasuryOthers: treasury?.others || null,
            // Hacks
            hackCount: hacks.length,
            totalHackedAmount: totalHacked,
            lastHackDate: lastHack,
            // Raises
            totalRaised: totalRaised > 0 ? totalRaised : null,
            latestRound: latestRaise?.round || null,
            latestRoundDate: latestRaise?.date || null,
            latestValuation: latestRaise?.valuation || null,
            leadInvestors: latestRaise?.leadInvestors || [],
            // Yields
            topPoolApy: topApy,
            avgPoolApy: avgApy,
            yieldPoolCount: pools.length,
            // Price changes
            priceChange1d,
            priceChange7d,
            priceChange30d,
            // Chain data
            chains: proto?.chains || [],
            primaryChain: proto?.chain || '',
            chainCount: proto?.chains?.length || 0,
            // TVL momentum
            tvlChange1d: proto?.change_1d ?? null,
            tvlChange7d: proto?.change_7d ?? null,
            tvlChange1m: proto?.change_1m ?? null,
            // Derivatives & options
            derivativesVolume24h: deriv?.total24h ?? null,
            optionsVolume24h: option?.total24h ?? null,
          });
        }

        enriched.sort((a, b) => b.tvl - a.tvl);
        setProtocols(enriched);

        // Build correlation points
        const points: CorrelationPoint[] = enriched
          .filter((p) => p.mcap && p.revenue30d)
          .map((p) => {
            // Use API-sourced price change if available, fallback to chart computation
            let pc30d: number | null = p.priceChange30d;
            if (pc30d === null && p.priceHistory.length >= 2) {
              const recent = p.priceHistory[p.priceHistory.length - 1].price;
              const thirtyDaysAgo = Date.now() / 1000 - 30 * 86400;
              const older = p.priceHistory.find((pt) => pt.timestamp >= thirtyDaysAgo);
              if (older) {
                pc30d = ((recent - older.price) / older.price) * 100;
              }
            }
            return {
              name: p.name,
              symbol: p.symbol,
              holderRightsScore: p.holderRightsScore,
              holderRights: p.holderRights,
              mcap: p.mcap,
              revenue30d: p.revenue30d,
              tvl: p.tvl,
              priceChange30d: pc30d,
              mcapToRevenue: p.mcapToRevenue,
            };
          });
        setCorrelationPoints(points);

        // Revenue by category
        const catRevenue: Record<string, number> = {};
        const catScoreSum: Record<string, number> = {};
        const catCount: Record<string, number> = {};
        enriched.forEach((p) => {
          if (p.revenue30d) {
            catRevenue[p.category] = (catRevenue[p.category] || 0) + p.revenue30d;
          }
          catScoreSum[p.category] = (catScoreSum[p.category] || 0) + p.holderRightsScore;
          catCount[p.category] = (catCount[p.category] || 0) + 1;
        });
        setRevenueByCategory(catRevenue);

        const avgScores: Record<string, number> = {};
        Object.keys(catCount).forEach((cat) => {
          avgScores[cat] = Math.round((catScoreSum[cat] / catCount[cat]) * 10) / 10;
        });
        setAvgScoreByCategory(avgScores);

        // ── Build per-category stats ──
        const catMap: Record<string, EnrichedProtocol[]> = {};
        enriched.forEach((p) => {
          if (!catMap[p.category]) catMap[p.category] = [];
          catMap[p.category].push(p);
        });

        const catStats: CategoryStats[] = Object.entries(catMap).map(([category, protos]) => {
          const scores = protos.map((p) => p.holderRightsScore);
          const revenues = protos.map((p) => p.revenue30d).filter((r): r is number => r !== null);
          const feesArr = protos.map((p) => p.fees30d).filter((f): f is number => f !== null);
          const feeToRevRatios = protos
            .filter((p) => p.fees30d && p.revenue30d && p.fees30d > 0)
            .map((p) => p.revenue30d! / p.fees30d!);
          const tvlToMcapRatios = protos
            .filter((p) => p.tvl > 0 && p.mcap && p.mcap > 0)
            .map((p) => p.tvl / p.mcap!);

          return {
            category,
            protocolCount: protos.length,
            totalRevenue30d: revenues.reduce((s, r) => s + r, 0),
            totalFees30d: feesArr.reduce((s, f) => s + f, 0),
            totalTvl: protos.reduce((s, p) => s + p.tvl, 0),
            totalMcap: protos.reduce((s, p) => s + (p.mcap || 0), 0),
            avgScore: scores.reduce((s, v) => s + v, 0) / scores.length,
            medianScore: median(scores),
            minScore: Math.min(...scores),
            maxScore: Math.max(...scores),
            avgFeeToRevenue: feeToRevRatios.length
              ? feeToRevRatios.reduce((s, v) => s + v, 0) / feeToRevRatios.length
              : null,
            avgTvlToMcap: tvlToMcapRatios.length
              ? tvlToMcapRatios.reduce((s, v) => s + v, 0) / tvlToMcapRatios.length
              : null,
            protocols: protos,
          };
        }).sort((a, b) => b.totalRevenue30d - a.totalRevenue30d);

        setCategoryStats(catStats);

        // ── Build per-right-type stats ──
        const rightMap: Record<string, EnrichedProtocol[]> = {};
        enriched.forEach((p) => {
          p.holderRights.forEach((r) => {
            if (!rightMap[r]) rightMap[r] = [];
            rightMap[r].push(p);
          });
        });

        const rStats: RightTypeStats[] = Object.values(HolderRight)
          .filter((r) => r !== HolderRight.NONE)
          .map((right) => {
            const protos = rightMap[right] || [];
            const revenues = protos.map((p) => p.revenue30d).filter((r): r is number => r !== null);
            const mcaps = protos.map((p) => p.mcap).filter((m): m is number => m !== null);
            const def = HOLDER_RIGHT_DEFINITIONS[right];
            return {
              right,
              label: def.label,
              weight: def.weight,
              count: protos.length,
              avgRevenue30d: revenues.length ? revenues.reduce((s, v) => s + v, 0) / revenues.length : null,
              avgMcap: mcaps.length ? mcaps.reduce((s, v) => s + v, 0) / mcaps.length : null,
              avgTvl: protos.length ? protos.reduce((s, p) => s + p.tvl, 0) / protos.length : 0,
              protocolNames: protos.map((p) => p.name),
            };
          })
          .sort((a, b) => b.count - a.count);

        setRightTypeStats(rStats);

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
      }
    }
    load();
  }, []);

  return {
    protocols,
    correlationPoints,
    totalRevenue24h,
    totalFees24h,
    revenueByCategory,
    avgScoreByCategory,
    categoryStats,
    rightTypeStats,
    historicalTvl,
    aggregateRevenueChart,
    loading,
    error,
    selectedProtocol,
    selectProtocol,
    revenueHistory,
    hasProData,
  };
}
