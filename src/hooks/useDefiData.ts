import { useEffect, useState, useCallback } from 'react';
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

// ── Server-side analytics (computed on the server) ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ServerAnalytics = Record<string, any>;

// ── Pulse data (hourly snapshots) ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PulseData = Record<string, any> | null;

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
  aggregateFeesChart: { date: number; value: number }[];
  aggregateDexVolumeChart: { date: number; value: number }[];
  loading: boolean;
  error: string | null;
  selectedProtocol: EnrichedProtocol | null;
  selectProtocol: (slug: string | null) => void;
  revenueHistory: { date: number; value: number }[];
  feeHistory: { date: number; value: number }[];
  hasProData: boolean;
  analytics: ServerAnalytics | null;
  pulse: PulseData;
}

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Server API base — uses relative URL in production, env override for dev
const API_BASE = import.meta.env.VITE_API_BASE || '';

export function useDefiData(): DashboardData {
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
  const [aggregateFeesChart, setAggregateFeesChart] = useState<{ date: number; value: number }[]>([]);
  const [aggregateDexVolumeChart, setAggregateDexVolumeChart] = useState<{ date: number; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProtocol, setSelectedProtocol] = useState<EnrichedProtocol | null>(null);
  const [revenueHistory, setRevenueHistory] = useState<{ date: number; value: number }[]>([]);
  const [feeHistory, setFeeHistory] = useState<{ date: number; value: number }[]>([]);
  const [hasProData, setHasProData] = useState(false);
  const [analytics, setAnalytics] = useState<ServerAnalytics | null>(null);
  const [pulse, setPulse] = useState<PulseData>(null);

  const selectProtocol = useCallback((slug: string | null) => {
    if (!slug) {
      setSelectedProtocol(null);
      setRevenueHistory([]);
      setFeeHistory([]);
      return;
    }
    const found = protocols.find((p) => p.slug === slug);
    if (found) {
      setSelectedProtocol(found);
      // Fetch on-demand: price chart + revenue history + fee history
      fetch(`${API_BASE}/api/protocol/${slug}`)
        .then((res) => res.json())
        .then((data: {
          revenueHistory: { date: number; value: number }[];
          feeHistory: { date: number; value: number }[];
          priceHistory: { timestamp: number; price: number }[];
        }) => {
          if (Array.isArray(data.revenueHistory)) setRevenueHistory(data.revenueHistory);
          if (Array.isArray(data.feeHistory)) setFeeHistory(data.feeHistory);
          // Update the selected protocol's price history in-place
          if (Array.isArray(data.priceHistory) && data.priceHistory.length > 0) {
            found.priceHistory = data.priceHistory;
            setSelectedProtocol({ ...found });
          }
        })
        .catch(() => {});
    }
  }, [protocols]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        // ── Single fetch from our server's pre-processed cache ──
        const res = await fetch(`${API_BASE}/api/protocols`);
        if (!res.ok) throw new Error(`Server error ${res.status}`);

        const serverData = await res.json() as {
          protocols: Array<Omit<EnrichedProtocol, 'holderRights' | 'holderRightsScore' | 'holderRightsNotes' | 'isClassified' | 'revenueHistory'>>;
          historicalTvl: { date: number; tvl: number }[];
          aggregateRevenueChart: { date: number; value: number }[];
          aggregateFeesChart: { date: number; value: number }[];
          aggregateDexVolumeChart: { date: number; value: number }[];
          totalRevenue24h: number;
          totalFees24h: number;
          hasProData: boolean;
          analytics: ServerAnalytics;
        };

        setTotalRevenue24h(serverData.totalRevenue24h);
        setTotalFees24h(serverData.totalFees24h);
        setHistoricalTvl(serverData.historicalTvl || []);
        setAggregateRevenueChart(serverData.aggregateRevenueChart || []);
        setAggregateFeesChart(serverData.aggregateFeesChart || []);
        setAggregateDexVolumeChart(serverData.aggregateDexVolumeChart || []);
        setHasProData(serverData.hasProData);
        setAnalytics(serverData.analytics || null);

        // ── Merge server data with client-side holder rights classifications ──
        const classifiedBySlug: Record<string, typeof PROTOCOL_CLASSIFICATIONS[0]> = {};
        for (const c of PROTOCOL_CLASSIFICATIONS) {
          classifiedBySlug[c.slug] = c;
        }

        const enriched: EnrichedProtocol[] = serverData.protocols.map((sp) => {
          const classification = classifiedBySlug[sp.slug];
          return {
            ...sp,
            holderRights: classification?.holderRights || [],
            holderRightsScore: classification?.holderRightsScore || 0,
            holderRightsNotes: classification?.holderRightsNotes || '',
            isClassified: !!classification,
            revenueHistory: [],
          };
        });

        setProtocols(enriched);

        // Build correlation points (classified protocols only for scatter analysis)
        const points: CorrelationPoint[] = enriched
          .filter((p) => p.isClassified && p.mcap && p.revenue30d)
          .map((p) => ({
            name: p.name,
            symbol: p.symbol,
            category: p.category,
            holderRightsScore: p.holderRightsScore,
            holderRights: p.holderRights,
            mcap: p.mcap,
            revenue30d: p.revenue30d,
            tvl: p.tvl,
            priceChange30d: p.priceChange30d,
            mcapToRevenue: p.mcapToRevenue,
          }));
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

        // Fetch pulse data (non-blocking)
        fetch(`${API_BASE}/api/pulse`)
          .then((r) => r.json())
          .then((data) => setPulse(data))
          .catch(() => {});
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
      }
    }
    load();

    // Poll pulse every 5 minutes
    const pulseInterval = setInterval(() => {
      fetch(`${API_BASE}/api/pulse`)
        .then((r) => r.json())
        .then((data) => setPulse(data))
        .catch(() => {});
    }, 5 * 60 * 1000);

    return () => clearInterval(pulseInterval);
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
    aggregateFeesChart,
    aggregateDexVolumeChart,
    loading,
    error,
    selectedProtocol,
    selectProtocol,
    revenueHistory,
    feeHistory,
    hasProData,
    analytics,
    pulse,
  };
}
