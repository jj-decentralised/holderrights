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

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ══════════════════════════════════════════════════════════════
// Phase 1: FAST STARTUP — bulk summary endpoints only (< 15s)
// No per-token fetching. All 7-12 requests run in parallel.
// ══════════════════════════════════════════════════════════════
async function fetchAllData() {
  console.log('[cache] Starting data refresh...');
  const start = Date.now();

  // Phase 1: Parallel bulk fetches (free API)
  const [allProtocols, revenueData, feesData, tvlHistory, dexData, derivsData, optionsData] = await Promise.all([
    fetchJson(`${BASE}/protocols`).catch(e => { console.error('[fetch] protocols:', e.message); return []; }),
    fetchJson(`${BASE}/overview/fees?excludeTotalDataChartBreakdown=true&dataType=dailyRevenue`).catch(e => { console.error('[fetch] revenue:', e.message); return { protocols: [], total24h: 0, totalDataChart: [] }; }),
    fetchJson(`${BASE}/overview/fees?excludeTotalDataChartBreakdown=true`).catch(e => { console.error('[fetch] fees:', e.message); return { protocols: [], total24h: 0, totalDataChart: [] }; }),
    fetchJson(`${BASE}/v2/historicalChainTvl`).catch(e => { console.error('[fetch] tvl:', e.message); return []; }),
    fetchJson(`${BASE}/overview/dexs?excludeTotalDataChartBreakdown=true`).catch(e => { console.error('[fetch] dex:', e.message); return null; }),
    fetchJson(`${BASE}/overview/derivatives?excludeTotalDataChartBreakdown=true`).catch(e => { console.error('[fetch] derivs:', e.message); return null; }),
    fetchJson(`${BASE}/overview/options?excludeTotalDataChartBreakdown=true`).catch(e => { console.error('[fetch] options:', e.message); return null; }),
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
      fetchJson(proUrl('/api/treasuries')).catch(e => { console.error('[fetch] treasuries:', e.message); return []; }),
      fetchJson(proUrl('/api/hacks')).catch(e => { console.error('[fetch] hacks:', e.message); return []; }),
      fetchJson(proUrl('/api/raises')).catch(e => { console.error('[fetch] raises:', e.message); return []; }),
      fetchJson(proUrl('/yields/pools')).then(r => r?.data || []).catch(e => { console.error('[fetch] yields:', e.message); return []; }),
      fetchJson(proUrl('/api/emissions')).catch(e => { console.error('[fetch] emissions:', e.message); return []; }),
    ]);
    treasuryData = Array.isArray(tres) ? tres : Array.isArray(tres?.protocols) ? tres.protocols : [];
    hackData = Array.isArray(hacks) ? hacks : Array.isArray(hacks?.hacks) ? hacks.hacks : [];
    raisesData = Array.isArray(raises) ? raises : Array.isArray(raises?.raises) ? raises.raises : [];
    yieldData = Array.isArray(yields) ? yields : [];
    emissionsData = Array.isArray(emissions) ? emissions : [];
    console.log(`[cache] Phase 2 done: ${treasuryData.length} treasuries, ${hackData.length} hacks, ${raisesData.length} raises, ${yieldData.length} yields, ${emissionsData.length} emissions`);
  }

  // ── Index by slug / name ──
  const revenueBySlug = {};
  if (Array.isArray(revenueData?.protocols)) revenueData.protocols.forEach(p => { if (p.slug) revenueBySlug[p.slug] = p; });

  const feesBySlug = {};
  if (Array.isArray(feesData?.protocols)) feesData.protocols.forEach(p => { if (p.slug) feesBySlug[p.slug] = p; });

  const protocolsBySlug = {};
  if (Array.isArray(allProtocols)) allProtocols.forEach(p => { if (p.slug) protocolsBySlug[p.slug] = p; });

  const dexBySlug = {};
  if (Array.isArray(dexData?.protocols)) dexData.protocols.forEach(p => { if (p.slug) dexBySlug[p.slug] = p; });

  const derivsBySlug = {};
  if (Array.isArray(derivsData?.protocols)) derivsData.protocols.forEach(p => { if (p.slug) derivsBySlug[p.slug] = p; });

  const optionsBySlug = {};
  if (Array.isArray(optionsData?.protocols)) optionsData.protocols.forEach(p => { if (p.slug) optionsBySlug[p.slug] = p; });

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

  // ── Build enriched protocols (NO per-token API calls) ──
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
      priceHistory: [], // fetched on-demand per protocol
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
      // Price changes start with TVL changes as proxy, enriched later
      priceChange1d: null,
      priceChange7d: null,
      priceChange30d: null,
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

  // ── Build aggregate time-series ──
  const historicalTvl = Array.isArray(tvlHistory)
    ? (tvlHistory.length > 365 ? tvlHistory.slice(-365) : tvlHistory)
    : [];

  const revenueChart = Array.isArray(revenueData?.totalDataChart)
    ? revenueData.totalDataChart.filter(d => Array.isArray(d) && d[1] > 0).map(d => ({ date: d[0], value: d[1] }))
    : [];

  const feesChart = Array.isArray(feesData?.totalDataChart)
    ? feesData.totalDataChart.filter(d => Array.isArray(d) && d[1] > 0).map(d => ({ date: d[0], value: d[1] }))
    : [];

  const dexVolumeChart = Array.isArray(dexData?.totalDataChart)
    ? dexData.totalDataChart.filter(d => Array.isArray(d) && d[1] > 0).map(d => ({ date: d[0], value: d[1] }))
    : [];

  const hasProData = API_KEY && (treasuryData.length > 0 || hackData.length > 0 || raisesData.length > 0);

  // ── Compute analytics server-side ──
  const analytics = computeAnalytics(protocols, hackData, raisesData);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[cache] Data refresh complete: ${protocols.length} protocols in ${elapsed}s`);

  return {
    protocols,
    historicalTvl,
    aggregateRevenueChart: revenueChart,
    aggregateFeesChart: feesChart,
    aggregateDexVolumeChart: dexVolumeChart,
    totalRevenue24h: revenueData?.total24h || 0,
    totalFees24h: feesData?.total24h || 0,
    hasProData: !!hasProData,
    lastUpdated: new Date().toISOString(),
    protocolCount: protocols.length,
    analytics,
  };
}

// ══════════════════════════════════════════════════════════════
// ANALYTICS ENGINE — computed server-side from bulk data
// ══════════════════════════════════════════════════════════════

function median(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function computeAnalytics(protocols, hackData, raisesData) {
  // ── 1. Category breakdown with financial depth ──
  const categoryMap = {};
  protocols.forEach(p => {
    if (!p.category) return;
    if (!categoryMap[p.category]) categoryMap[p.category] = [];
    categoryMap[p.category].push(p);
  });

  const categoryAnalysis = Object.entries(categoryMap).map(([category, protos]) => {
    const withRevenue = protos.filter(p => p.revenue30d > 0);
    const withFees = protos.filter(p => p.fees30d > 0);
    const withMcap = protos.filter(p => p.mcap > 0);
    const withTreasury = protos.filter(p => p.treasuryTotal > 0);

    const revenues = withRevenue.map(p => p.revenue30d);
    const mcaps = withMcap.map(p => p.mcap);
    const tvls = protos.map(p => p.tvl).filter(v => v > 0);
    const feeToRevRatios = protos
      .filter(p => p.fees30d > 0 && p.revenue30d > 0)
      .map(p => p.revenue30d / p.fees30d);

    return {
      category,
      protocolCount: protos.length,
      totalTvl: protos.reduce((s, p) => s + p.tvl, 0),
      totalRevenue30d: revenues.reduce((s, r) => s + r, 0),
      totalFees30d: withFees.reduce((s, p) => s + p.fees30d, 0),
      totalMcap: withMcap.reduce((s, p) => s + p.mcap, 0),
      medianTvl: median(tvls),
      medianRevenue30d: median(revenues),
      medianMcap: median(mcaps),
      avgRevenueRetention: feeToRevRatios.length > 0
        ? feeToRevRatios.reduce((s, v) => s + v, 0) / feeToRevRatios.length
        : null,
      treasuryCount: withTreasury.length,
      totalTreasuryValue: withTreasury.reduce((s, p) => s + p.treasuryTotal, 0),
      hackExposure: protos.filter(p => p.hackCount > 0).length,
      totalHackedValue: protos.reduce((s, p) => s + p.totalHackedAmount, 0),
      avgTvlChange7d: protos.filter(p => p.tvlChange7d !== null).length > 0
        ? protos.filter(p => p.tvlChange7d !== null).reduce((s, p) => s + p.tvlChange7d, 0) / protos.filter(p => p.tvlChange7d !== null).length
        : null,
      topProtocols: protos.sort((a, b) => b.tvl - a.tvl).slice(0, 5).map(p => ({
        name: p.name, slug: p.slug, tvl: p.tvl, revenue30d: p.revenue30d, mcap: p.mcap,
      })),
    };
  }).sort((a, b) => b.totalTvl - a.totalTvl);

  // ── 2. Revenue efficiency rankings ──
  const revenueEfficiency = protocols
    .filter(p => p.revenue30d > 0 && p.tvl > 0)
    .map(p => ({
      name: p.name,
      slug: p.slug,
      category: p.category,
      tvl: p.tvl,
      revenue30d: p.revenue30d,
      fees30d: p.fees30d,
      mcap: p.mcap,
      revenuePerTvl: p.revenue30d / p.tvl,
      revenueRetention: p.fees30d > 0 ? p.revenue30d / p.fees30d : null,
      mcapToRevenue: p.mcapToRevenue,
    }))
    .sort((a, b) => b.revenuePerTvl - a.revenuePerTvl)
    .slice(0, 50);

  // ── 3. Capital efficiency: TVL vs revenue vs market cap ──
  const capitalEfficiency = protocols
    .filter(p => p.mcap > 0 && p.tvl > 0 && p.revenue30d > 0)
    .map(p => ({
      name: p.name,
      slug: p.slug,
      category: p.category,
      tvl: p.tvl,
      mcap: p.mcap,
      revenue30d: p.revenue30d,
      tvlToMcap: p.tvl / p.mcap,
      revenueYield: (p.revenue30d * 12) / p.mcap,
      peRatio: p.mcapToRevenue,
    }))
    .sort((a, b) => b.revenueYield - a.revenueYield)
    .slice(0, 50);

  // ── 4. Security risk analysis ──
  const hackAnalysis = {
    totalHacks: hackData.length,
    totalValueLost: hackData.reduce((s, h) => s + (h.amount || 0), 0),
    hacksByYear: {},
    hacksByChain: {},
    hacksByTechnique: {},
    mostHackedProtocols: [],
  };

  hackData.forEach(h => {
    if (h.date) {
      const year = new Date(h.date).getFullYear();
      if (!hackAnalysis.hacksByYear[year]) hackAnalysis.hacksByYear[year] = { count: 0, amount: 0 };
      hackAnalysis.hacksByYear[year].count++;
      hackAnalysis.hacksByYear[year].amount += h.amount || 0;
    }
    if (h.chain) {
      if (!hackAnalysis.hacksByChain[h.chain]) hackAnalysis.hacksByChain[h.chain] = { count: 0, amount: 0 };
      hackAnalysis.hacksByChain[h.chain].count++;
      hackAnalysis.hacksByChain[h.chain].amount += h.amount || 0;
    }
    if (h.technique) {
      if (!hackAnalysis.hacksByTechnique[h.technique]) hackAnalysis.hacksByTechnique[h.technique] = { count: 0, amount: 0 };
      hackAnalysis.hacksByTechnique[h.technique].count++;
      hackAnalysis.hacksByTechnique[h.technique].amount += h.amount || 0;
    }
  });

  hackAnalysis.mostHackedProtocols = protocols
    .filter(p => p.hackCount > 0)
    .sort((a, b) => b.totalHackedAmount - a.totalHackedAmount)
    .slice(0, 20)
    .map(p => ({ name: p.name, slug: p.slug, hackCount: p.hackCount, totalLost: p.totalHackedAmount, tvl: p.tvl }));

  // ── 5. Funding landscape ──
  const fundingAnalysis = {
    totalRaised: raisesData.reduce((s, r) => s + (r.amount || 0), 0),
    raiseCount: raisesData.length,
    raisesByYear: {},
    topFundedProtocols: protocols
      .filter(p => p.totalRaised > 0)
      .sort((a, b) => b.totalRaised - a.totalRaised)
      .slice(0, 20)
      .map(p => ({
        name: p.name, slug: p.slug, totalRaised: p.totalRaised,
        tvl: p.tvl, mcap: p.mcap,
        raisedToTvl: p.tvl > 0 ? p.totalRaised / p.tvl : null,
        raisedToMcap: p.mcap > 0 ? p.totalRaised / p.mcap : null,
      })),
  };

  raisesData.forEach(r => {
    if (r.date) {
      const year = new Date(r.date).getFullYear();
      if (!fundingAnalysis.raisesByYear[year]) fundingAnalysis.raisesByYear[year] = { count: 0, amount: 0 };
      fundingAnalysis.raisesByYear[year].count++;
      fundingAnalysis.raisesByYear[year].amount += r.amount || 0;
    }
  });

  // ── 6. Chain dominance analysis ──
  const chainStats = {};
  protocols.forEach(p => {
    if (!p.chains || p.chains.length === 0) return;
    p.chains.forEach(chain => {
      if (!chainStats[chain]) chainStats[chain] = { protocolCount: 0, totalTvl: 0, totalRevenue30d: 0, totalFees30d: 0 };
      chainStats[chain].protocolCount++;
    });
    const primary = p.primaryChain || p.chains[0];
    if (primary && chainStats[primary]) {
      chainStats[primary].totalTvl += p.tvl;
      chainStats[primary].totalRevenue30d += p.revenue30d || 0;
      chainStats[primary].totalFees30d += p.fees30d || 0;
    }
  });

  const chainAnalysis = Object.entries(chainStats)
    .map(([chain, stats]) => ({ chain, ...stats }))
    .sort((a, b) => b.totalTvl - a.totalTvl)
    .slice(0, 30);

  // ── 7. Yield landscape ──
  const yieldProtocols = protocols.filter(p => p.yieldPoolCount > 0);
  const yieldAnalysis = {
    totalPools: yieldProtocols.reduce((s, p) => s + p.yieldPoolCount, 0),
    protocolsWithYield: yieldProtocols.length,
    topByApy: yieldProtocols
      .filter(p => p.topPoolApy !== null)
      .sort((a, b) => b.topPoolApy - a.topPoolApy)
      .slice(0, 20)
      .map(p => ({ name: p.name, slug: p.slug, topApy: p.topPoolApy, avgApy: p.avgPoolApy, poolCount: p.yieldPoolCount, tvl: p.tvl })),
    avgApyByCategory: {},
  };

  const catApys = {};
  yieldProtocols.forEach(p => {
    if (p.avgPoolApy !== null && p.category) {
      if (!catApys[p.category]) catApys[p.category] = [];
      catApys[p.category].push(p.avgPoolApy);
    }
  });
  for (const [cat, apys] of Object.entries(catApys)) {
    yieldAnalysis.avgApyByCategory[cat] = {
      avg: apys.reduce((s, v) => s + v, 0) / apys.length,
      median: median(apys),
      count: apys.length,
    };
  }

  // ── 8. Market structure: concentration metrics ──
  const totalTvl = protocols.reduce((s, p) => s + p.tvl, 0);
  const totalRevenue = protocols.reduce((s, p) => s + (p.revenue30d || 0), 0);
  const totalMcap = protocols.reduce((s, p) => s + (p.mcap || 0), 0);

  const tvlShares = protocols.filter(p => p.tvl > 0).map(p => p.tvl / totalTvl);
  const herfindahlTvl = tvlShares.reduce((s, sh) => s + sh * sh, 0);

  const top10Tvl = protocols.slice(0, 10).reduce((s, p) => s + p.tvl, 0);
  const top10Revenue = protocols
    .filter(p => p.revenue30d > 0)
    .sort((a, b) => b.revenue30d - a.revenue30d)
    .slice(0, 10)
    .reduce((s, p) => s + p.revenue30d, 0);

  const marketStructure = {
    totalProtocols: protocols.length,
    totalTvl,
    totalRevenue30d: totalRevenue,
    totalMcap,
    herfindahlTvl: Math.round(herfindahlTvl * 10000) / 10000,
    top10TvlShare: totalTvl > 0 ? top10Tvl / totalTvl : 0,
    top10RevenueShare: totalRevenue > 0 ? top10Revenue / totalRevenue : 0,
    protocolsWithRevenue: protocols.filter(p => p.revenue30d > 0).length,
    protocolsWithFees: protocols.filter(p => p.fees30d > 0).length,
    protocolsWithMcap: protocols.filter(p => p.mcap > 0).length,
    protocolsWithTreasury: protocols.filter(p => p.treasuryTotal > 0).length,
    protocolsMultichain: protocols.filter(p => p.chainCount > 1).length,
    avgChainCount: protocols.filter(p => p.chainCount > 0).length > 0
      ? protocols.filter(p => p.chainCount > 0).reduce((s, p) => s + p.chainCount, 0) / protocols.filter(p => p.chainCount > 0).length
      : 0,
  };

  // ── 9. Emissions pressure analysis ──
  const emissionsProtocols = protocols.filter(p => p.hasEmissions);
  const emissionsAnalysis = {
    totalWithEmissions: emissionsProtocols.length,
    upcomingUnlocks: emissionsProtocols.reduce((s, p) => s + p.upcomingUnlockCount, 0),
    protocolsWithUpcoming: emissionsProtocols.filter(p => p.upcomingUnlockCount > 0)
      .sort((a, b) => b.upcomingUnlockCount - a.upcomingUnlockCount)
      .slice(0, 15)
      .map(p => ({
        name: p.name, slug: p.slug, unlockCount: p.upcomingUnlockCount,
        nextUnlock: p.nextUnlockDate, mcap: p.mcap, tvl: p.tvl,
      })),
  };

  return {
    categoryAnalysis,
    revenueEfficiency,
    capitalEfficiency,
    hackAnalysis,
    fundingAnalysis,
    chainAnalysis,
    yieldAnalysis,
    marketStructure,
    emissionsAnalysis,
  };
}

// ══════════════════════════════════════════════════════════════
// Phase 2: BACKGROUND ENRICHMENT — price data (non-blocking)
// Runs after initial cache is set, doesn't block page load.
// ══════════════════════════════════════════════════════════════

async function enrichWithPriceData() {
  if (!cache.data) return;
  console.log('[enrich] Starting background price enrichment...');
  const start = Date.now();

  const protocols = cache.data.protocols;
  const geckoIds = [...new Set(protocols.map(p => p.geckoId).filter(Boolean))];

  const priceChanges = {};
  const batchSize = 25;
  for (let i = 0; i < geckoIds.length; i += batchSize) {
    const batch = geckoIds.slice(i, i + batchSize);
    const coins = batch.map(id => `coingecko:${id}`).join(',');
    try {
      const result = await fetchJson(`${COINS}/percentage/${coins}`);
      if (result && typeof result === 'object') Object.assign(priceChanges, result);
    } catch (err) {
      console.warn(`[enrich] Price batch ${i} failed:`, err.message);
    }
  }

  let enriched = 0;
  protocols.forEach(p => {
    if (!p.geckoId) return;
    const key = `coingecko:${p.geckoId}`;
    const pct = priceChanges[key];
    if (pct) {
      p.priceChange1d = pct['1d'] ?? null;
      p.priceChange7d = pct['7d'] ?? null;
      p.priceChange30d = pct['30d'] ?? null;
      enriched++;
    }
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[enrich] Price enrichment done: ${enriched}/${geckoIds.length} tokens in ${elapsed}s`);
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
    // Background: enrich with price data (non-blocking)
    enrichWithPriceData().catch(err => console.error('[enrich] Failed:', err.message));
  } catch (err) {
    console.error('[cache] Refresh failed:', err.message);
    console.error('[cache] Stack:', err.stack);
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

let initialLoadResolve;
const initialLoadPromise = new Promise((resolve) => { initialLoadResolve = resolve; });

// ══════════════════════════════════════════════════════════════
// HOURLY PULSE ENGINE — lightweight snapshots every hour
// Stores 48h ring buffer, computes deltas between snapshots
// ══════════════════════════════════════════════════════════════

const PULSE_MAX_SNAPSHOTS = 48; // 48 hours of data
const PULSE_INTERVAL = 60 * 60 * 1000; // 1 hour
const pulseSnapshots = []; // { timestamp, tvl, revenue24h, fees24h, dexVolume24h, stablecoinMcap, topMovers, protocolTvls }

async function takePulseSnapshot() {
  console.log('[pulse] Taking hourly snapshot...');
  const start = Date.now();
  try {
    // Lightweight parallel fetches — only summary endpoints
    const [protocols, revenueData, feesData, dexData, stablecoins] = await Promise.all([
      fetchJson(`${BASE}/protocols`).catch(() => []),
      fetchJson(`${BASE}/overview/fees?excludeTotalDataChartBreakdown=true&dataType=dailyRevenue`).catch(() => null),
      fetchJson(`${BASE}/overview/fees?excludeTotalDataChartBreakdown=true`).catch(() => null),
      fetchJson(`${BASE}/overview/dexs?excludeTotalDataChartBreakdown=true`).catch(() => null),
      fetchJson('https://stablecoins.llama.fi/stablecoins?includePrices=false').catch(() => null),
    ]);

    const totalTvl = Array.isArray(protocols)
      ? protocols.reduce((s, p) => s + (p.tvl || 0), 0)
      : 0;

    // Build per-protocol TVL map for top 100
    const protocolTvls = {};
    if (Array.isArray(protocols)) {
      protocols.sort((a, b) => (b.tvl || 0) - (a.tvl || 0));
      protocols.slice(0, 100).forEach(p => {
        protocolTvls[p.slug] = {
          name: p.name,
          tvl: p.tvl || 0,
          change_1d: p.change_1d ?? null,
          change_7d: p.change_7d ?? null,
          mcap: p.mcap || null,
        };
      });
    }

    // Stablecoin total market cap
    let stablecoinMcap = 0;
    let stablecoinBreakdown = [];
    if (stablecoins?.peggedAssets && Array.isArray(stablecoins.peggedAssets)) {
      stablecoinBreakdown = stablecoins.peggedAssets
        .filter(s => s.circulating?.peggedUSD > 0)
        .map(s => ({
          name: s.name,
          symbol: s.symbol,
          mcap: s.circulating.peggedUSD,
        }))
        .sort((a, b) => b.mcap - a.mcap)
        .slice(0, 10);
      stablecoinMcap = stablecoins.peggedAssets.reduce((s, a) => s + (a.circulating?.peggedUSD || 0), 0);
    }

    const snapshot = {
      timestamp: Date.now(),
      tvl: totalTvl,
      revenue24h: revenueData?.total24h || 0,
      fees24h: feesData?.total24h || 0,
      dexVolume24h: dexData?.total24h || 0,
      stablecoinMcap,
      stablecoinBreakdown,
      protocolTvls,
    };

    pulseSnapshots.push(snapshot);
    if (pulseSnapshots.length > PULSE_MAX_SNAPSHOTS) {
      pulseSnapshots.shift(); // Remove oldest
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[pulse] Snapshot #${pulseSnapshots.length} taken in ${elapsed}s — TVL: ${(totalTvl / 1e9).toFixed(2)}B, Revenue: ${(snapshot.revenue24h / 1e6).toFixed(2)}M`);
  } catch (err) {
    console.error('[pulse] Snapshot failed:', err.message);
  }
}

function computePulseDeltas() {
  if (pulseSnapshots.length < 2) {
    return { snapshots: pulseSnapshots, deltas: null, alerts: [] };
  }

  const latest = pulseSnapshots[pulseSnapshots.length - 1];
  const prior1h = pulseSnapshots.length >= 2 ? pulseSnapshots[pulseSnapshots.length - 2] : null;
  const prior6h = pulseSnapshots.length >= 7 ? pulseSnapshots[pulseSnapshots.length - 7] : null;
  const prior24h = pulseSnapshots.length >= 25 ? pulseSnapshots[pulseSnapshots.length - 25] : null;

  function pctChange(curr, prev) {
    if (!prev || prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  }

  const deltas = {
    tvl: {
      current: latest.tvl,
      change1h: pctChange(latest.tvl, prior1h?.tvl),
      change6h: pctChange(latest.tvl, prior6h?.tvl),
      change24h: pctChange(latest.tvl, prior24h?.tvl),
    },
    revenue24h: {
      current: latest.revenue24h,
      change1h: pctChange(latest.revenue24h, prior1h?.revenue24h),
      change6h: pctChange(latest.revenue24h, prior6h?.revenue24h),
      change24h: pctChange(latest.revenue24h, prior24h?.revenue24h),
    },
    fees24h: {
      current: latest.fees24h,
      change1h: pctChange(latest.fees24h, prior1h?.fees24h),
      change6h: pctChange(latest.fees24h, prior6h?.fees24h),
      change24h: pctChange(latest.fees24h, prior24h?.fees24h),
    },
    dexVolume24h: {
      current: latest.dexVolume24h,
      change1h: pctChange(latest.dexVolume24h, prior1h?.dexVolume24h),
      change6h: pctChange(latest.dexVolume24h, prior6h?.dexVolume24h),
      change24h: pctChange(latest.dexVolume24h, prior24h?.dexVolume24h),
    },
    stablecoinMcap: {
      current: latest.stablecoinMcap,
      change1h: pctChange(latest.stablecoinMcap, prior1h?.stablecoinMcap),
      change6h: pctChange(latest.stablecoinMcap, prior6h?.stablecoinMcap),
      change24h: pctChange(latest.stablecoinMcap, prior24h?.stablecoinMcap),
    },
  };

  // Detect significant movers in top protocol TVLs
  const topMovers = [];
  if (prior1h) {
    for (const [slug, curr] of Object.entries(latest.protocolTvls)) {
      const prev = prior1h.protocolTvls[slug];
      if (!prev || prev.tvl === 0) continue;
      const pct = ((curr.tvl - prev.tvl) / prev.tvl) * 100;
      if (Math.abs(pct) >= 2) { // 2%+ move in 1 hour is significant
        topMovers.push({ slug, name: curr.name, tvl: curr.tvl, change1h: pct, mcap: curr.mcap });
      }
    }
    topMovers.sort((a, b) => Math.abs(b.change1h) - Math.abs(a.change1h));
  }

  // Generate alerts for significant ecosystem-wide changes
  const alerts = [];
  const THRESHOLD = 3; // 3% change triggers alert

  if (deltas.tvl.change1h !== null && Math.abs(deltas.tvl.change1h) >= THRESHOLD) {
    alerts.push({
      severity: Math.abs(deltas.tvl.change1h) >= 5 ? 'high' : 'medium',
      metric: 'TVL',
      message: `Total DeFi TVL ${deltas.tvl.change1h > 0 ? 'surged' : 'dropped'} ${Math.abs(deltas.tvl.change1h).toFixed(1)}% in the last hour`,
      value: deltas.tvl.change1h,
    });
  }
  if (deltas.revenue24h.change1h !== null && Math.abs(deltas.revenue24h.change1h) >= THRESHOLD * 2) {
    alerts.push({
      severity: 'medium',
      metric: 'Revenue',
      message: `Daily revenue ${deltas.revenue24h.change1h > 0 ? 'up' : 'down'} ${Math.abs(deltas.revenue24h.change1h).toFixed(1)}% hour-over-hour`,
      value: deltas.revenue24h.change1h,
    });
  }
  if (deltas.dexVolume24h.change1h !== null && Math.abs(deltas.dexVolume24h.change1h) >= THRESHOLD * 2) {
    alerts.push({
      severity: 'medium',
      metric: 'DEX Volume',
      message: `DEX trading volume ${deltas.dexVolume24h.change1h > 0 ? 'spiked' : 'fell'} ${Math.abs(deltas.dexVolume24h.change1h).toFixed(1)}% in the last hour`,
      value: deltas.dexVolume24h.change1h,
    });
  }
  if (topMovers.length > 0) {
    const biggest = topMovers[0];
    alerts.push({
      severity: Math.abs(biggest.change1h) >= 10 ? 'high' : 'medium',
      metric: 'Protocol TVL',
      message: `${biggest.name} TVL ${biggest.change1h > 0 ? 'up' : 'down'} ${Math.abs(biggest.change1h).toFixed(1)}% in 1 hour`,
      value: biggest.change1h,
    });
  }

  return {
    snapshotCount: pulseSnapshots.length,
    latestTimestamp: latest.timestamp,
    oldestTimestamp: pulseSnapshots[0].timestamp,
    deltas,
    topMovers: topMovers.slice(0, 10),
    alerts,
    stablecoinBreakdown: latest.stablecoinBreakdown,
    // Time series for sparklines (last 48 data points)
    timeSeries: pulseSnapshots.map(s => ({
      timestamp: s.timestamp,
      tvl: s.tvl,
      revenue24h: s.revenue24h,
      fees24h: s.fees24h,
      dexVolume24h: s.dexVolume24h,
      stablecoinMcap: s.stablecoinMcap,
    })),
  };
}

// ══════════════════════════════════════════════════════════════
// API Routes
// ══════════════════════════════════════════════════════════════

// Main data endpoint — protocols + server-side analytics
app.get('/api/protocols', async (_req, res) => {
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

  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json(cache.data);
});

// On-demand: protocol detail with price chart + revenue/fee history
app.get('/api/protocol/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const geckoId = cache.data?.protocols?.find(p => p.slug === slug)?.geckoId;
    const [revenueRes, feeRes, priceRes] = await Promise.all([
      fetchJson(`${BASE}/summary/fees/${slug}?dataType=dailyRevenue`).catch(() => null),
      fetchJson(`${BASE}/summary/fees/${slug}`).catch(() => null),
      geckoId
        ? fetchJson(`${COINS}/chart/coingecko:${geckoId}?period=1w&span=52`).catch(() => null)
        : Promise.resolve(null),
    ]);

    const revenueHistory = Array.isArray(revenueRes?.totalDataChart)
      ? revenueRes.totalDataChart.filter(d => Array.isArray(d) && d[1] > 0).map(d => ({ date: d[0], value: d[1] }))
      : [];

    const feeHistory = Array.isArray(feeRes?.totalDataChart)
      ? feeRes.totalDataChart.filter(d => Array.isArray(d) && d[1] > 0).map(d => ({ date: d[0], value: d[1] }))
      : [];

    let priceHistory = [];
    if (priceRes?.coins && typeof priceRes.coins === 'object') {
      const coinData = Object.values(priceRes.coins)[0];
      if (coinData && Array.isArray(coinData.prices)) {
        priceHistory = coinData.prices;
      }
    }

    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({ revenueHistory, feeHistory, priceHistory });
  } catch (err) {
    console.error(`[api] Protocol detail error for ${slug}:`, err.message);
    res.json({ revenueHistory: [], feeHistory: [], priceHistory: [] });
  }
});

// Hourly pulse — real-time deltas and alerts
app.get('/api/pulse', (_req, res) => {
  const pulse = computePulseDeltas();
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json(pulse);
});

// ── Per-chain historical TVL (on-demand, cached 4h) ──
const chainHistoryCache = {};
const CHAIN_HISTORY_TTL = 4 * 60 * 60 * 1000;
const TOP_CHAINS = ['Ethereum', 'Bitcoin', 'Solana', 'Tron', 'BSC', 'Arbitrum', 'Base', 'Polygon', 'Avalanche', 'Sui', 'Optimism', 'Hyperliquid L1'];

app.get('/api/chain-history', async (_req, res) => {
  try {
    const now = Date.now();
    const chains = TOP_CHAINS;
    const rawByChain = {};

    // Fetch raw daily data per chain (parallel, cached)
    const fetches = chains.map(async (chain) => {
      const cached = chainHistoryCache[chain];
      if (cached && (now - cached.ts) < CHAIN_HISTORY_TTL) {
        rawByChain[chain] = cached.data;
        return;
      }
      try {
        const raw = await fetchJson(`${BASE}/charts/${chain}`);
        if (Array.isArray(raw)) {
          const sixYearsAgo = (now / 1000) - (6 * 365 * 86400);
          const filtered = raw
            .filter(d => d.date >= sixYearsAgo)
            .map(d => ({ date: d.date, tvl: d.totalLiquidityUSD ?? d.tvl ?? 0 }));
          rawByChain[chain] = filtered;
          chainHistoryCache[chain] = { ts: now, data: filtered };
        }
      } catch (e) {
        console.warn(`Chain history fetch failed for ${chain}:`, e.message);
        rawByChain[chain] = [];
      }
    });

    await Promise.all(fetches);

    // Build common weekly date grid aligned to Monday epochs
    // Collect all dates, snap to nearest week (floor to Monday 00:00 UTC)
    const WEEK = 7 * 86400;
    const allDatesSet = new Set();
    for (const chain of chains) {
      for (const pt of (rawByChain[chain] || [])) {
        const weekDate = Math.floor(pt.date / WEEK) * WEEK;
        allDatesSet.add(weekDate);
      }
    }
    const weekDates = Array.from(allDatesSet).sort((a, b) => a - b);

    // For each chain, build a lookup (snap daily → weekly bucket, keep latest value per week)
    const aligned = {};
    for (const chain of chains) {
      const weekMap = new Map();
      for (const pt of (rawByChain[chain] || [])) {
        const weekDate = Math.floor(pt.date / WEEK) * WEEK;
        weekMap.set(weekDate, pt.tvl); // last write wins (latest in week)
      }
      aligned[chain] = weekDates.map(d => ({
        date: d,
        tvl: weekMap.get(d) || 0,
      }));
    }

    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json({ chains, dates: weekDates, data: aligned });
  } catch (e) {
    console.error('Chain history error:', e);
    res.status(500).json({ error: 'Failed to fetch chain history' });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: cache.data ? 'ok' : 'loading',
    cacheAge: cache.lastUpdated ? `${((Date.now() - cache.lastUpdated) / 1000 / 60).toFixed(0)} minutes` : 'never',
    protocolCount: cache.data?.protocolCount || 0,
    hasProData: cache.data?.hasProData || false,
    lastUpdated: cache.data?.lastUpdated || null,
    analyticsKeys: cache.data?.analytics ? Object.keys(cache.data.analytics) : [],
  });
});

// ── Serve static Vite build ──
app.use(express.static(join(__dirname, 'dist')));

// SPA fallback
app.get('{*path}', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// ── Start ──
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API key: ${API_KEY ? 'configured' : 'not set'}`);

  // Full data refresh (every 4 hours)
  refreshCache();

  setInterval(() => {
    if (getCacheAge() >= CACHE_TTL) refreshCache();
  }, 60 * 1000);

  // Hourly pulse snapshots — first one after initial load, then every hour
  initialLoadPromise.then(() => {
    takePulseSnapshot();
    setInterval(() => takePulseSnapshot(), PULSE_INTERVAL);
  });
});
