const BASE = 'https://api.llama.fi';
const COINS = 'https://coins.llama.fi';
const FEES_BASE = 'https://api.llama.fi';

// Pro API base — use when API key is available
const PRO_BASE = 'https://pro-api.llama.fi';

// Set via environment variable or runtime config
let _apiKey: string | null = null;

export function setApiKey(key: string) {
  _apiKey = key;
}

export function hasApiKey(): boolean {
  return _apiKey !== null;
}

function proUrl(path: string): string {
  if (_apiKey) return `${PRO_BASE}/${_apiKey}${path}`;
  return `${BASE}${path}`;
}

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

// ── DEX Volumes (FREE) ──

export interface DexOverview {
  totalDataChart: [number, number][];
  protocols: DexProtocol[];
  total24h: number;
  total7d: number;
  total30d: number;
}

export interface DexProtocol {
  name: string;
  slug: string;
  total24h: number | null;
  total7d: number | null;
  total30d: number | null;
  totalAllTime: number | null;
  category: string;
  chains: string[];
}

export async function fetchDexOverview(): Promise<DexOverview> {
  return fetchJson<DexOverview>(`${BASE}/overview/dexs?excludeTotalDataChartBreakdown=true`);
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

// ═══════════════════════════════════════════════════════════
// PRO API ENDPOINTS (require API key)
// ═══════════════════════════════════════════════════════════

// ── Token Emissions & Unlocks ──

export interface EmissionEvent {
  date: string;
  label: string;
  token: string;
  unlocked: number;
  timestamp: number;
}

export interface ProtocolEmissions {
  name: string;
  events: EmissionEvent[];
  hallmarks: { date: number; text: string }[];
  tokenPrice: Record<string, number>;
  sources: string[];
  token: string;
  geckoId: string;
  futures: EmissionEvent[];
}

export async function fetchAllEmissions(): Promise<ProtocolEmissions[]> {
  return fetchJson<ProtocolEmissions[]>(proUrl('/api/emissions'));
}

export async function fetchProtocolEmissions(protocol: string): Promise<ProtocolEmissions> {
  return fetchJson<ProtocolEmissions>(proUrl(`/api/emission/${protocol}`));
}

// ── Treasury Data ──

export interface TreasuryProtocol {
  name: string;
  slug: string;
  category: string;
  gecko_id: string;
  tvl: number;
  ownTokens: number;
  stablecoins: number;
  majors: number;
  others: number;
  total: number;
}

export async function fetchTreasuries(): Promise<TreasuryProtocol[]> {
  return fetchJson<TreasuryProtocol[]>(proUrl('/api/treasuries'));
}

// ── Yield Pools ──

export interface YieldPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase: number | null;
  apyReward: number | null;
  rewardTokens: string[];
  pool: string;
  apyPct1D: number | null;
  apyPct7D: number | null;
  apyPct30D: number | null;
  stablecoin: boolean;
  ilRisk: string;
  exposure: string;
  predictions: { predictedClass: string; predictedProbability: number; binnedConfidence: number };
  poolMeta: string | null;
  mu: number;
  sigma: number;
  count: number;
  outlier: boolean;
  underlyingTokens: string[];
  il7d: number | null;
  apyBase7d: number | null;
  apyMean30d: number | null;
  volumeUsd1d: number | null;
  volumeUsd7d: number | null;
}

export async function fetchYieldPools(): Promise<{ data: YieldPool[] }> {
  return fetchJson<{ data: YieldPool[] }>(proUrl('/yields/pools'));
}

// ── Hacks & Exploits ──

export interface HackEvent {
  name: string;
  date: string;
  amount: number;
  classification: string;
  technique: string;
  chain: string[];
  bridgeHack: boolean;
  target: string;
  source: string;
  returnedFunds: number | null;
  defillamaId: string | null;
}

export async function fetchHacks(): Promise<HackEvent[]> {
  return fetchJson<HackEvent[]>(proUrl('/api/hacks'));
}

// ── Funding Rounds ──

export interface FundingRound {
  name: string;
  date: string;
  amount: number;
  round: string;
  sector: string;
  category: string;
  leadInvestors: string[];
  otherInvestors: string[];
  valuation: number | null;
  chains: string[];
  defillamaId: string | null;
  source: string[];
}

export async function fetchRaises(): Promise<FundingRound[]> {
  return fetchJson<FundingRound[]>(proUrl('/api/raises'));
}

// ── Historical Token Liquidity ──

export interface LiquidityDataPoint {
  date: number;
  liquidityUSD: number;
  volume24h: number;
  priceImpact2pct: number;
}

export async function fetchHistoricalLiquidity(token: string): Promise<LiquidityDataPoint[]> {
  return fetchJson<LiquidityDataPoint[]>(proUrl(`/api/historicalLiquidity/${token}`));
}

// ═══════════════════════════════════════════════════════════
// BATCH FETCH HELPERS
// ═══════════════════════════════════════════════════════════

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
  const concurrency = 4;

  const batches: string[][] = [];
  for (let i = 0; i < geckoIds.length; i += batchSize) {
    batches.push(geckoIds.slice(i, i + batchSize));
  }

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
