import { useEffect, useState, useCallback } from 'react';
import {
  fetchProtocols,
  fetchRevenueOverview,
  fetchFeesOverview,
  fetchMultiplePriceCharts,
  fetchProtocolRevenue,
} from '../services/defiLlama';
import type { LlamaProtocol, ProtocolFees } from '../services/defiLlama';
import { PROTOCOL_CLASSIFICATIONS } from '../data/protocolClassifications';
import type { EnrichedProtocol, CorrelationPoint } from '../types';

export interface DashboardData {
  protocols: EnrichedProtocol[];
  correlationPoints: CorrelationPoint[];
  totalRevenue24h: number;
  totalFees24h: number;
  revenueByCategory: Record<string, number>;
  avgScoreByCategory: Record<string, number>;
  loading: boolean;
  error: string | null;
  selectedProtocol: EnrichedProtocol | null;
  selectProtocol: (slug: string | null) => void;
  revenueHistory: { date: number; value: number }[];
}

export function useDefiData(): DashboardData {
  const [protocols, setProtocols] = useState<EnrichedProtocol[]>([]);
  const [correlationPoints, setCorrelationPoints] = useState<CorrelationPoint[]>([]);
  const [totalRevenue24h, setTotalRevenue24h] = useState(0);
  const [totalFees24h, setTotalFees24h] = useState(0);
  const [revenueByCategory, setRevenueByCategory] = useState<Record<string, number>>({});
  const [avgScoreByCategory, setAvgScoreByCategory] = useState<Record<string, number>>({});
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
      // Fetch revenue history for this protocol
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

        // Fetch all data in parallel
        const [allProtocols, revenueData, feesData] = await Promise.all([
          fetchProtocols(),
          fetchRevenueOverview(),
          fetchFeesOverview(),
        ]);

        setTotalRevenue24h(revenueData.total24h || 0);
        setTotalFees24h(feesData.total24h || 0);

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

        // Fetch price charts for all classified protocols
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

        // Sort by TVL descending
        enriched.sort((a, b) => b.tvl - a.tvl);
        setProtocols(enriched);

        // Build correlation points
        const points: CorrelationPoint[] = enriched
          .filter((p) => p.mcap && p.revenue30d)
          .map((p) => {
            let priceChange30d: number | null = null;
            if (p.priceHistory.length >= 2) {
              const recent = p.priceHistory[p.priceHistory.length - 1].price;
              // Find price ~30 days ago
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
    loading,
    error,
    selectedProtocol,
    selectProtocol,
    revenueHistory,
  };
}
