import { useEffect, useState, useCallback } from 'react';
import {
  fetchProtocols,
  fetchRevenueOverview,
  fetchFeesOverview,
  fetchMultiplePriceCharts,
  fetchProtocolRevenue,
  fetchHistoricalTvl,
} from '../services/defiLlama';
import type { LlamaProtocol, ProtocolFees } from '../services/defiLlama';
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
}

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProtocol, setSelectedProtocol] = useState<EnrichedProtocol | null>(null);
  const [revenueHistory, setRevenueHistory] = useState<{ date: number; value: number }[]>([]);

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

        // Fetch all data in parallel — now includes historical TVL
        const [allProtocols, revenueData, feesData, tvlHistory] = await Promise.all([
          fetchProtocols(),
          fetchRevenueOverview(),
          fetchFeesOverview(),
          fetchHistoricalTvl().catch(() => [] as { date: number; tvl: number }[]),
        ]);

        setTotalRevenue24h(revenueData.total24h || 0);
        setTotalFees24h(feesData.total24h || 0);

        // Store historical TVL (last 365 days for cleaner chart)
        if (tvlHistory.length > 365) {
          setHistoricalTvl(tvlHistory.slice(-365));
        } else {
          setHistoricalTvl(tvlHistory);
        }

        // Store aggregate revenue time-series from overview
        if (revenueData.totalDataChart?.length) {
          const revChart = revenueData.totalDataChart
            .filter((d) => d[1] > 0)
            .map((d) => ({ date: d[0], value: d[1] }));
          setAggregateRevenueChart(revChart);
        }

        // Index revenue and fees data by slug
        const revenueBySlug: Record<string, ProtocolFees> = {};
        revenueData.protocols.forEach((p) => {
          revenueBySlug[p.slug] = p;
        });

        const feesBySlug: Record<string, ProtocolFees> = {};
        feesData.protocols.forEach((p) => {
          feesBySlug[p.slug] = p;
        });

        // Index protocol data by slug
        const protocolsBySlug: Record<string, LlamaProtocol> = {};
        allProtocols.forEach((p) => {
          protocolsBySlug[p.slug] = p;
        });

        // Match classified protocols with live data
        const geckoIds = PROTOCOL_CLASSIFICATIONS
          .map((c) => c.geckoId)
          .filter(Boolean);

        const priceCharts = await fetchMultiplePriceCharts(geckoIds);

        // Build enriched protocols
        const enriched: EnrichedProtocol[] = [];

        for (const classification of PROTOCOL_CLASSIFICATIONS) {
          const proto = protocolsBySlug[classification.slug];
          const revenue = revenueBySlug[classification.slug];
          const fees = feesBySlug[classification.slug];
          const priceHistory = priceCharts[classification.geckoId] || [];

          const tvl = proto?.tvl || 0;
          const mcap = proto?.mcap || null;
          const revenue30d = revenue?.total30d || null;

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
          });
        }

        enriched.sort((a, b) => b.tvl - a.tvl);
        setProtocols(enriched);

        // Build correlation points
        const points: CorrelationPoint[] = enriched
          .filter((p) => p.mcap && p.revenue30d)
          .map((p) => {
            let priceChange30d: number | null = null;
            if (p.priceHistory.length >= 2) {
              const recent = p.priceHistory[p.priceHistory.length - 1].price;
              const thirtyDaysAgo = Date.now() / 1000 - 30 * 86400;
              const older = p.priceHistory.find((pt) => pt.timestamp >= thirtyDaysAgo);
              if (older) {
                priceChange30d = ((recent - older.price) / older.price) * 100;
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
              priceChange30d,
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
          const fees = protos.map((p) => p.fees30d).filter((f): f is number => f !== null);
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
            totalFees30d: fees.reduce((s, f) => s + f, 0),
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
  };
}
