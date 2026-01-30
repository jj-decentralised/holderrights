import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ── Config ──
const API_KEY = process.env.DEFILLAMA_API_KEY || process.env.VITE_DEFILLAMA_API_KEY || '';
const BASE = 'https://api.llama.fi';
const COINS = 'https://coins.llama.fi';
const PRO_BASE = 'https://pro-api.llama.fi';
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

function proUrl(path) {
  if (API_KEY) return `${PRO_BASE}/${API_KEY}${path}`;
  return `${BASE}${path}`;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${res.status}: ${url}`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from ${url}: ${text.slice(0, 200)}`);
  }
}

// ── In-memory cache ──
let cache = {
  data: null,
  lastUpdated: null,
  updating: false,
};

// Normalize name for fuzzy matching
function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ── Data Fetching Pipeline ──
async function fetchAllData() {
  console.log('[cache] Starting data refresh...');
  const start = Date.now();

  // Phase 1: Parallel bulk fetches (free API)
  const [allProtocols, revenueData, feesData, tvlHistory, dexData, derivsData, optionsData] = await Promise.all([
    fetchJson(`${BASE}/protocols`).catch(() => []),
    fetchJson(`${BASE}/overview/fees?excludeTotalDataChartBreakdown=true&dataType=dailyRevenue`).catch(() => ({ protocols: [], total24h: 0, totalDataChart: [] })),
    fetchJson(`${BASE}/overview/fees?excludeTotalDataChartBreakdown=true`).catch(() => ({ protocols: [], total24h: 0, totalDataChart: [] })),
    fetchJson(`${BASE}/v2/historicalChainTvl`).catch(() => []),
    fetchJson(`${BASE}/overview/dexs?excludeTotalDataChartBreakdown=true`).catch(() => null),
    fetchJson(`${BASE}/overview/derivatives?excludeTotalDataChartBreakdown=true`).catch(() => null),
    fetchJson(`${BASE}/overview/options?excludeTotalDataChartBreakdown=true`).catch(() => null),
  ]);

  console.log(`[cache] Phase 1 done: ${Array.isArray(allProtocols) ? allProtocols.length : 0} protocols`);

  // Phase 2: Pro API (if key available)
  let treasuryData = [];
  let hackData = [];
  let raisesData = [];
  let yieldData = [];
  let emissionsData = [];

  if (API_KEY) {
    const [tres, hacks, raises, yields, emissions] = await Promise.all([
      fetchJson(proUrl('/api/treasuries')).catch(() => []),
      fetchJson(proUrl('/api/hacks')).catch(() => []),
      fetchJson(proUrl('/api/raises')).catch(() => []),
      fetchJson(proUrl('/yields/pools')).then(r => r?.data || []).catch(() => []),
      fetchJson(proUrl('/api/emissions')).catch(() => []),
    ]);
    treasuryData = Array.isArray(tres) ? tres : Array.isArray(tres?.protocols) ? tres.protocols : [];
    hackData = Array.isArray(hacks) ? hacks : Array.isArray(hacks?.hacks) ? hacks.hacks : [];
    raisesData = Array.isArray(raises) ? raises : Array.isArray(raises?.raises) ? raises.raises : [];
    yieldData = Array.isArray(yields) ? yields : [];
    emissionsData = Array.isArray(emissions) ? emissions : [];
    console.log(`[cache] Phase 2 raw shapes: tres=${typeof tres}(${Array.isArray(tres)}), hacks=${typeof hacks}(${Array.isArray(hacks)}), raises=${typeof raises}(${Array.isArray(raises)}), yields=${typeof yields}(${Array.isArray(yields)}), emissions=${typeof emissions}(${Array.isArray(emissions)})`);
    console.log(`[cache] Phase 2 done: ${treasuryData.length} treasuries, ${hackData.length} hacks, ${raisesData.length} raises, ${yieldData.length} yields, ${emissionsData.length} emissions`);
  }

  // ── Index by slug / name ──
  const revenueBySlug = {};
  const revProtos = revenueData?.protocols;
  if (Array.isArray(revProtos)) revProtos.forEach(p => { revenueBySlug[p.slug] = p; });

  const feesBySlug = {};
  const feeProtos = feesData?.protocols;
  if (Array.isArray(feeProtos)) feeProtos.forEach(p => { feesBySlug[p.slug] = p; });

  const protocolsBySlug = {};
  if (Array.isArray(allProtocols)) allProtocols.forEach(p => { protocolsBySlug[p.slug] = p; });

  const dexBySlug = {};
  if (Array.isArray(dexData?.protocols)) dexData.protocols.forEach(p => { dexBySlug[p.slug] = p; });

  const derivsBySlug = {};
  if (Array.isArray(derivsData?.protocols)) derivsData.protocols.forEach(p => { derivsBySlug[p.slug] = p; });

  const optionsBySlug = {};
  if (Array.isArray(optionsData?.protocols)) optionsData.protocols.forEach(p => { optionsBySlug[p.slug] = p; });

  const treasuryByName = {};
  const treasuryBySlug = {};
  treasuryData.forEach(t => {
    if (t.name) treasuryByName[normalizeName(t.name)] = t;
    if (t.slug) treasuryBySlug[t.slug] = t;
  });

  const hacksByName = {};
  hackData.forEach(h => {
    if (!h.name) return;
    const key = normalizeName(h.name);
    if (!hacksByName[key]) hacksByName[key] = [];
    hacksByName[key].push(h);
  });

  const raisesByName = {};
  raisesData.forEach(r => {
    if (!r.name) return;
    const key = normalizeName(r.name);
    if (!raisesByName[key]) raisesByName[key] = [];
    raisesByName[key].push(r);
  });

  const yieldsByProject = {};
  yieldData.forEach(y => {
    if (!y.project) return;
    const key = y.project.toLowerCase();
    if (!yieldsByProject[key]) yieldsByProject[key] = [];
    yieldsByProject[key].push(y);
  });

  const emissionsByGecko = {};
  const emissionsByName = {};
  emissionsData.forEach(e => {
    if (e.geckoId) emissionsByGecko[e.geckoId] = e;
    if (e.name) emissionsByName[normalizeName(e.name)] = e;
  });

  // ── Determine which protocols to include ──
  const MIN_TVL = 1_000_000;
  const slugsToInclude = new Set();
  Object.keys(revenueBySlug).forEach(s => slugsToInclude.add(s));
  Object.keys(feesBySlug).forEach(s => slugsToInclude.add(s));
  Object.keys(dexBySlug).forEach(s => slugsToInclude.add(s));
  Object.keys(derivsBySlug).forEach(s => slugsToInclude.add(s));
  Object.keys(optionsBySlug).forEach(s => slugsToInclude.add(s));
  if (Array.isArray(allProtocols)) {
    allProtocols.forEach(p => {
      if (p.tvl >= MIN_TVL) slugsToInclude.add(p.slug);
    });
  }

  console.log(`[cache] ${slugsToInclude.size} protocols qualify for inclusion`);

  // ── Collect gecko IDs ──
  const allGeckoIds = new Set();
  for (const slug of slugsToInclude) {
    const proto = protocolsBySlug[slug];
    if (proto?.gecko_id) allGeckoIds.add(proto.gecko_id);
  }
  const geckoIdArray = Array.from(allGeckoIds).filter(Boolean);

  // ── Fetch price charts for top 200 by TVL ──
  const top200 = Array.from(slugsToInclude)
    .map(slug => {
      const proto = protocolsBySlug[slug];
      return { slug, geckoId: proto?.gecko_id || '', tvl: proto?.tvl || 0 };
    })
    .filter(x => x.geckoId)
    .sort((a, b) => b.tvl - a.tvl)
    .slice(0, 200)
    .map(x => x.geckoId);

  const priceCharts = {};
  const chartBatchSize = 5;
  for (let i = 0; i < top200.length; i += chartBatchSize) {
    const batch = top200.slice(i, i + chartBatchSize);
    const coins = batch.map(id => `coingecko:${id}`).join(',');
    try {
      const data = await fetchJson(`${COINS}/chart/${coins}?period=1w&span=52`);
      if (data?.coins && typeof data.coins === 'object') {
        for (const [key, value] of Object.entries(data.coins)) {
          const geckoId = key.replace('coingecko:', '');
          if (value && Array.isArray(value.prices)) {
            priceCharts[geckoId] = value.prices;
          }
        }
      }
    } catch (err) {
      console.warn(`[cache] Price chart batch ${i} failed:`, err.message);
    }
  }
  console.log(`[cache] Fetched price charts for ${Object.keys(priceCharts).length} tokens`);

  // ── Fetch price percentage changes for all tokens ──
  const priceChanges = {};
  const changeBatchSize = 25;
  for (let i = 0; i < geckoIdArray.length; i += changeBatchSize) {
    const batch = geckoIdArray.slice(i, i + changeBatchSize);
    const coins = batch.map(id => `coingecko:${id}`).join(',');
    try {
      const result = await fetchJson(`${COINS}/percentage/${coins}`);
      if (result && typeof result === 'object') Object.assign(priceChanges, result);
    } catch (err) {
      console.warn(`[cache] Price change batch ${i} failed:`, err.message);
    }
  }
  console.log(`[cache] Fetched price changes for ${Object.keys(priceChanges).length} tokens`);

  // ── Build enriched protocols ──
  const protocols = [];

  for (const slug of slugsToInclude) {
    const proto = protocolsBySlug[slug];
    const revenue = revenueBySlug[slug];
    const fees = feesBySlug[slug];
    const dex = dexBySlug[slug];
    const deriv = derivsBySlug[slug];
    const option = optionsBySlug[slug];

    const name = proto?.name || slug;
    const symbol = proto?.symbol || '';
    const category = proto?.category || '';
    const geckoId = proto?.gecko_id || '';
    const logo = proto?.logo || '';

    const tvl = proto?.tvl || 0;
    const mcap = proto?.mcap || null;
    const revenue30d = revenue?.total30d || null;

    const coinKey = `coingecko:${geckoId}`;
    const pctData = priceChanges[coinKey];

    const normalName = normalizeName(name);
    const treasury = treasuryBySlug[slug] || treasuryByName[normalName] || null;

    const hacks = hacksByName[normalName] || [];
    const totalHacked = hacks.reduce((s, h) => s + (h.amount || 0), 0);
    const lastHack = hacks.length > 0
      ? hacks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
      : null;

    const raises = raisesByName[normalName] || [];
    const totalRaised = raises.reduce((s, r) => s + (r.amount || 0), 0);
    const latestRaise = raises.length > 0
      ? raises.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      : null;

    const pools = yieldsByProject[slug] || yieldsByProject[normalName] || [];
    const poolApys = pools.filter(p => p.apy > 0 && p.apy < 10000).map(p => p.apy);
    const topApy = poolApys.length > 0 ? Math.max(...poolApys) : null;
    const avgApy = poolApys.length > 0 ? poolApys.reduce((s, v) => s + v, 0) / poolApys.length : null;

    const emission = emissionsByGecko[geckoId] || emissionsByName[normalName] || null;
    const futureUnlocks = emission?.futures?.filter(f => f.timestamp > Date.now() / 1000) || [];
    const nextUnlock = futureUnlocks.length > 0
      ? futureUnlocks.sort((a, b) => a.timestamp - b.timestamp)[0]
      : null;

    protocols.push({
      slug,
      name,
      symbol,
      category,
      geckoId,
      logo,
      tvl,
      mcap,
      revenue24h: revenue?.total24h || null,
      revenue7d: revenue?.total7d || null,
      revenue30d,
      revenueAllTime: revenue?.totalAllTime || null,
      fees24h: fees?.total24h || null,
      fees30d: fees?.total30d || null,
      priceHistory: priceCharts[geckoId] || [],
      mcapToRevenue: mcap && revenue30d ? mcap / (revenue30d * 12) : null,
      tvlToRevenue: tvl && revenue30d ? tvl / (revenue30d * 12) : null,
      dexVolume24h: dex?.total24h || null,
      dexVolume30d: dex?.total30d || null,
      treasuryTotal: treasury?.total || null,
      treasuryStablecoins: treasury?.stablecoins || null,
      treasuryMajors: treasury?.majors || null,
      treasuryOwnTokens: treasury?.ownTokens || null,
      treasuryOthers: treasury?.others || null,
      hackCount: hacks.length,
      totalHackedAmount: totalHacked,
      lastHackDate: lastHack,
      totalRaised: totalRaised > 0 ? totalRaised : null,
      latestRound: latestRaise?.round || null,
      latestRoundDate: latestRaise?.date || null,
      latestValuation: latestRaise?.valuation || null,
      leadInvestors: latestRaise?.leadInvestors || [],
      topPoolApy: topApy,
      avgPoolApy: avgApy,
      yieldPoolCount: pools.length,
      priceChange1d: pctData?.['1d'] ?? null,
      priceChange7d: pctData?.['7d'] ?? null,
      priceChange30d: pctData?.['30d'] ?? null,
      chains: proto?.chains || [],
      primaryChain: proto?.chain || '',
      chainCount: proto?.chains?.length || 0,
      tvlChange1d: proto?.change_1d ?? null,
      tvlChange7d: proto?.change_7d ?? null,
      tvlChange1m: proto?.change_1m ?? null,
      derivativesVolume24h: deriv?.total24h ?? null,
      optionsVolume24h: option?.total24h ?? null,
      hasEmissions: !!emission,
      upcomingUnlockCount: futureUnlocks.length,
      nextUnlockDate: nextUnlock?.date || null,
    });
  }

  protocols.sort((a, b) => b.tvl - a.tvl);

  // ── Build aggregate data ──
  const historicalTvl = Array.isArray(tvlHistory)
    ? (tvlHistory.length > 365 ? tvlHistory.slice(-365) : tvlHistory)
    : [];

  const aggregateRevenueChart = Array.isArray(revenueData?.totalDataChart)
    ? revenueData.totalDataChart.filter(d => d[1] > 0).map(d => ({ date: d[0], value: d[1] }))
    : [];

  const hasProData = API_KEY && (treasuryData.length > 0 || hackData.length > 0 || raisesData.length > 0);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[cache] Data refresh complete: ${protocols.length} protocols, ${elapsed}s`);

  return {
    protocols,
    historicalTvl,
    aggregateRevenueChart,
    totalRevenue24h: revenueData?.total24h || 0,
    totalFees24h: feesData?.total24h || 0,
    hasProData: !!hasProData,
    lastUpdated: new Date().toISOString(),
    protocolCount: protocols.length,
  };
}

// ── Cache management ──
async function refreshCache() {
  if (cache.updating) {
    console.log('[cache] Already updating, skipping');
    return;
  }
  cache.updating = true;
  try {
    cache.data = await fetchAllData();
    cache.lastUpdated = Date.now();
    console.log(`[cache] Refresh succeeded: ${cache.data?.protocolCount || 0} protocols cached`);
    if (initialLoadResolve) {
      initialLoadResolve();
      initialLoadResolve = null;
    }
  } catch (err) {
    console.error('[cache] Refresh failed:', err.message);
    console.error('[cache] Stack:', err.stack);
    // Resolve initial load even on failure so requests don't hang forever
    if (initialLoadResolve) {
      initialLoadResolve();
      initialLoadResolve = null;
    }
  } finally {
    cache.updating = false;
  }
}

function getCacheAge() {
  if (!cache.lastUpdated) return Infinity;
  return Date.now() - cache.lastUpdated;
}

// Promise that resolves once the first data load completes
let initialLoadResolve;
const initialLoadPromise = new Promise((resolve) => { initialLoadResolve = resolve; });

// ── API Routes ──

// Main data endpoint — returns pre-processed protocol data
app.get('/api/protocols', async (_req, res) => {
  // Wait up to 5 minutes for initial load
  if (!cache.data) {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5 * 60 * 1000));
    try {
      await Promise.race([initialLoadPromise, timeout]);
    } catch {
      return res.status(503).json({ error: 'Data loading timed out. Try again shortly.' });
    }
  }

  if (!cache.data) {
    return res.status(503).json({ error: 'Data not available.' });
  }

  res.setHeader('Cache-Control', 'public, max-age=300'); // browser cache 5 min
  res.json(cache.data);
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    cacheAge: cache.lastUpdated ? `${((Date.now() - cache.lastUpdated) / 1000 / 60).toFixed(0)} minutes` : 'never',
    protocolCount: cache.data?.protocolCount || 0,
    hasProData: cache.data?.hasProData || false,
    lastUpdated: cache.data?.lastUpdated || null,
  });
});

// On-demand revenue detail for a specific protocol
app.get('/api/protocol/:slug/revenue', async (req, res) => {
  try {
    const data = await fetchJson(`${BASE}/summary/fees/${req.params.slug}?dataType=dailyRevenue`);
    const chart = Array.isArray(data?.totalDataChart)
      ? data.totalDataChart.filter(d => d[1] > 0).map(d => ({ date: d[0], value: d[1] }))
      : [];
    res.json({ revenueHistory: chart });
  } catch {
    res.json({ revenueHistory: [] });
  }
});

// ── Serve static Vite build ──
app.use(express.static(join(__dirname, 'dist')));

// SPA fallback — serve index.html for all non-API routes
app.get('{*path}', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// ── Start ──
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API key: ${API_KEY ? 'configured' : 'not set'}`);

  // Initial data fetch
  refreshCache();

  // Refresh every 4 hours
  setInterval(() => {
    if (getCacheAge() >= CACHE_TTL) {
      refreshCache();
    }
  }, 60 * 1000); // check every minute
});
