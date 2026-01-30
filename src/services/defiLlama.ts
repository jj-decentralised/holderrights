const BASE = 'https://api.llama.fi';
const COINS = 'https://coins.llama.fi';
const FEES_BASE = 'https://api.llama.fi';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

// ── Protocols ──

export interface LlamaProtocol {
  id: string;
  name: string;
  symbol: string;
  slug: string;
  url: string;
  description: string;
  chain: string;
  chains: string[];
  category: string;
  tvl: number;
  mcap: number | null;
  change_1d: number | null;
  change_7d: number | null;
  change_1m: number | null;
  gecko_id: string;
  logo: string;
}

export async function fetchProtocols(): Promise<LlamaProtocol[]> {
  return fetchJson<LlamaProtocol[]>(`${BASE}/protocols`);
}

export interface ProtocolDetail {
  id: string;
  name: string;
  symbol: string;
  gecko_id: string;
  mcap: number | null;
  tvl: number;
  chainTvls: Record<string, { tvl: { date: number; totalLiquidityUSD: number }[] }>;
  currentChainTvls: Record<string, number>;
}

export async function fetchProtocolDetail(slug: string): Promise<ProtocolDetail> {
  return fetchJson<ProtocolDetail>(`${BASE}/protocol/${slug}`);
}

// ── Fees & Revenue ──

export interface FeesOverview {
  totalDataChart: [number, number][];
  protocols: ProtocolFees[];
  total24h: number;
  total7d: number;
  total30d: number;
}

export interface ProtocolFees {
  name: string;
  slug: string;
  module: string;
  total24h: number | null;
  total7d: number | null;
  total30d: number | null;
  totalAllTime: number | null;
  category: string;
  logo: string;
  chains: string[];
}

export async function fetchFeesOverview(): Promise<FeesOverview> {
  return fetchJson<FeesOverview>(`${FEES_BASE}/overview/fees?excludeTotalDataChartBreakdown=true`);
}

export async function fetchRevenueOverview(): Promise<FeesOverview> {
  return fetchJson<FeesOverview>(`${FEES_BASE}/overview/fees?excludeTotalDataChartBreakdown=true&dataType=dailyRevenue`);
}

export interface ProtocolFeeSummary {
  name: string;
  slug: string;
  totalDataChart: Array<[number, number]>;
  total24h: number | null;
  total7d: number | null;
  total30d: number | null;
  totalAllTime: number | null;
}

export async function fetchProtocolFees(slug: string): Promise<ProtocolFeeSummary> {
  return fetchJson<ProtocolFeeSummary>(`${FEES_BASE}/summary/fees/${slug}`);
}

export async function fetchProtocolRevenue(slug: string): Promise<ProtocolFeeSummary> {
  return fetchJson<ProtocolFeeSummary>(`${FEES_BASE}/summary/fees/${slug}?dataType=dailyRevenue`);
}

// ── Coin Prices ──

export interface CoinPriceResponse {
  coins: Record<string, {
    symbol: string;
    price: number;
    timestamp: number;
    confidence: number;
  }>;
}

export async function fetchCurrentPrices(coins: string[]): Promise<CoinPriceResponse> {
  const joined = coins.join(',');
  return fetchJson<CoinPriceResponse>(`${COINS}/prices/current/${joined}`);
}

export interface CoinChartResponse {
  coins: Record<string, {
    symbol: string;
    confidence: number;
    prices: { timestamp: number; price: number }[];
  }>;
}

export async function fetchPriceChart(coin: string, period?: string, span?: number): Promise<CoinChartResponse> {
  let url = `${COINS}/chart/${coin}`;
  const params: string[] = [];
  if (period) params.push(`period=${period}`);
  if (span) params.push(`span=${span}`);
  if (params.length) url += '?' + params.join('&');
  return fetchJson<CoinChartResponse>(url);
}

export async function fetchPricePercentChange(coins: string[], period?: string): Promise<Record<string, Record<string, number>>> {
  const joined = coins.join(',');
  let url = `${COINS}/percentage/${joined}`;
  if (period) url += `?period=${period}`;
  return fetchJson<Record<string, Record<string, number>>>(url);
}

// ── Historical Chain TVL ──

export async function fetchHistoricalTvl(): Promise<{ date: number; tvl: number }[]> {
  return fetchJson<{ date: number; tvl: number }[]>(`${BASE}/v2/historicalChainTvl`);
}

// ── Batch fetch helpers ──

async function fetchPriceChartBatch(
  geckoIds: string[],
): Promise<Record<string, { timestamp: number; price: number }[]>> {
  const coins = geckoIds.map((id) => `coingecko:${id}`).join(',');
  const results: Record<string, { timestamp: number; price: number }[]> = {};
  try {
    const data = await fetchPriceChart(coins, '1w', 52);
    for (const [key, value] of Object.entries(data.coins)) {
      const geckoId = key.replace('coingecko:', '');
      results[geckoId] = value.prices;
    }
  } catch {
    // Skip failed batches
  }
  return results;
}

export async function fetchMultiplePriceCharts(
  geckoIds: string[],
): Promise<Record<string, { timestamp: number; price: number }[]>> {
  const results: Record<string, { timestamp: number; price: number }[]> = {};
  const batchSize = 5;
  const concurrency = 4; // Run 4 batches in parallel at a time

  // Create all batches
  const batches: string[][] = [];
  for (let i = 0; i < geckoIds.length; i += batchSize) {
    batches.push(geckoIds.slice(i, i + batchSize));
  }

  // Process batches with limited concurrency
  for (let i = 0; i < batches.length; i += concurrency) {
    const concurrent = batches.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      concurrent.map((batch) => fetchPriceChartBatch(batch))
    );
    for (const batchResult of batchResults) {
      Object.assign(results, batchResult);
    }
  }

  return results;
}
