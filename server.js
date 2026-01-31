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

  // ── 10. Valuation Discovery Engine ──
  const valuationDiscovery = computeValuationDiscovery(protocols);

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
    valuationDiscovery,
  };
}

// ══════════════════════════════════════════════════════════════
// VALUATION DISCOVERY ENGINE
// 9-dimension composite scoring for undervalued protocol discovery
// ══════════════════════════════════════════════════════════════

function percentileRank(value, sortedArr) {
  if (sortedArr.length === 0) return 50;
  let count = 0;
  for (const v of sortedArr) {
    if (v < value) count++;
    else if (v === value) count += 0.5;
  }
  return (count / sortedArr.length) * 100;
}

const DEX_CATEGORIES = new Set(['Dexes', 'DEX', 'DEXes', 'Dex Aggregator', 'Derivatives', 'Options']);

function computeValuationDiscovery(protocols) {
  // ── Step 1: Compute raw metrics per protocol ──
  const scored = [];

  for (const p of protocols) {
    const metrics = { slug: p.slug, name: p.name, category: p.category, logo: p.logo || '' };
    let applicableCount = 0;
    let availableCount = 0;

    // 1. EV/Revenue
    metrics.evToRevenue = null;
    if (p.mcap > 0 && p.revenue30d > 0) {
      const liquidTreasury = (p.treasuryStablecoins || 0) + (p.treasuryMajors || 0);
      const ev = Math.max(p.mcap * 0.01, p.mcap - liquidTreasury);
      metrics.evToRevenue = ev / (p.revenue30d * 12);
      availableCount++;
    }
    applicableCount++;

    // 2. Funding Discount
    metrics.fundingRatio = null;
    metrics._fundingStale = false;
    if (p.mcap > 0 && p.latestValuation > 0) {
      metrics.fundingRatio = p.mcap / p.latestValuation;
      // Check staleness (>2 years)
      if (p.latestRoundDate) {
        const roundAge = (Date.now() - new Date(p.latestRoundDate).getTime()) / (365.25 * 86400000);
        if (roundAge > 2) metrics._fundingStale = true;
      }
      availableCount++;
    }
    applicableCount++;

    // 3. Revenue Momentum
    metrics.revenueMomentum = null;
    if (p.revenue30d > 0) {
      let recentRunRate = null;
      if (p.revenue24h > 0) recentRunRate = p.revenue24h * 30;
      else if (p.revenue7d > 0) recentRunRate = (p.revenue7d / 7) * 30;
      if (recentRunRate !== null) {
        metrics.revenueMomentum = Math.max(-0.9, Math.min(5.0, (recentRunRate - p.revenue30d) / p.revenue30d));
        availableCount++;
      }
    }
    applicableCount++;

    // 4. Volume Utilization (DEX-specific)
    metrics.volumeUtilization = null;
    const isDex = DEX_CATEGORIES.has(p.category);
    if (isDex) {
      applicableCount++;
      if (p.dexVolume30d > 0 && p.tvl > 0) {
        metrics.volumeUtilization = p.dexVolume30d / p.tvl;
        availableCount++;
      }
    }

    // 5. Security Score
    if (p.hackCount === 0) {
      metrics.securityScore = 1.0;
    } else {
      const hackLossRatio = p.tvl > 0 ? p.totalHackedAmount / p.tvl : 1;
      metrics.securityScore = Math.max(0, Math.min(1, 1.0 - hackLossRatio - (p.hackCount * 0.05)));
    }
    applicableCount++;
    availableCount++;

    // 6. Dilution Risk
    if (!p.hasEmissions || p.upcomingUnlockCount === 0) {
      metrics.dilutionRisk = 0;
    } else {
      let proximityFactor = 0.5; // default if date unknown
      if (p.nextUnlockDate) {
        const daysTo = (new Date(p.nextUnlockDate).getTime() - Date.now()) / 86400000;
        if (daysTo <= 30) proximityFactor = 1.0;
        else if (daysTo <= 90) proximityFactor = 0.6;
        else if (daysTo <= 180) proximityFactor = 0.3;
        else proximityFactor = 0.1;
      }
      metrics.dilutionRisk = Math.min(1.0, (p.upcomingUnlockCount / 10) * proximityFactor);
    }
    applicableCount++;
    availableCount++;

    // 7. Real Yield
    const emissionsDiscount = p.hasEmissions ? 0.5 : 1.0;
    const adjustedPoolYield = (p.avgPoolApy || 0) * emissionsDiscount / 100;
    const revenueYield = (p.mcap > 0 && p.revenue30d > 0) ? (p.revenue30d * 12) / p.mcap : 0;
    metrics.realYieldScore = (revenueYield * 0.6) + (adjustedPoolYield * 0.4);
    applicableCount++;
    availableCount++;

    // 8. Governance Factor (computed from holderRightsScore if available via classification lookup)
    // Note: holderRightsScore is applied client-side; server stores 0 for unclassified.
    // We include a placeholder; frontend enriches with actual score.
    metrics.governanceFactor = 1.0; // neutral default — frontend will override

    // 9. TVL-Price Divergence
    metrics.divergenceSignal = 0;
    if (p.tvlChange1m !== null && p.tvlChange1m !== undefined &&
        p.priceChange30d !== null && p.priceChange30d !== undefined) {
      if (p.tvlChange1m > 0 && p.priceChange30d < 0) {
        metrics.divergenceSignal = Math.min(1.0, (p.tvlChange1m - p.priceChange30d) / 100);
      } else if (p.tvlChange1m > 0 && p.priceChange30d >= 0 && p.tvlChange1m > p.priceChange30d) {
        metrics.divergenceSignal = Math.min(0.5, (p.tvlChange1m - p.priceChange30d) / 100);
      }
      availableCount++;
    }
    applicableCount++;

    metrics.dataCompleteness = applicableCount > 0 ? availableCount / applicableCount : 0;
    metrics.tvl = p.tvl;
    metrics.mcap = p.mcap || null;
    metrics.revenue30d = p.revenue30d || null;
    metrics.holderRightsScore = 0; // placeholder — frontend enriches

    // ── Extended computed metrics ──

    // A. Revenue Volatility (coefficient of variation from 24h vs 7d vs 30d run rates)
    const runRates = [];
    if (p.revenue24h > 0) runRates.push(p.revenue24h * 30);
    if (p.revenue7d > 0) runRates.push((p.revenue7d / 7) * 30);
    if (p.revenue30d > 0) runRates.push(p.revenue30d);
    if (runRates.length >= 2) {
      const rrMean = runRates.reduce((s, v) => s + v, 0) / runRates.length;
      const rrVar = runRates.reduce((s, v) => s + (v - rrMean) ** 2, 0) / runRates.length;
      metrics.revenueVolatility = rrMean > 0 ? Math.sqrt(rrVar) / rrMean : 0;
    } else {
      metrics.revenueVolatility = null;
    }

    // B. Chain Diversification (HHI — lower = more diversified)
    if (p.chains && p.chains.length > 1 && p.tvl > 0) {
      // Approximate: equal weight per chain (true per-chain TVL would require extra API call)
      const n = p.chainCount || p.chains.length;
      metrics.chainHHI = 1 / n; // best-case HHI assuming equal distribution
      metrics.chainCount = n;
    } else {
      metrics.chainHHI = 1.0; // single chain = max concentration
      metrics.chainCount = p.chainCount || 1;
    }

    // C. Fee Capture Efficiency (revenue / fees — how much of fees protocol captures)
    if (p.revenue30d > 0 && p.fees30d > 0) {
      metrics.feeCaptureRatio = p.revenue30d / p.fees30d;
    } else {
      metrics.feeCaptureRatio = null;
    }

    // D. Treasury Runway (months of operation treasury can sustain)
    const liquidTreasuryExt = (p.treasuryStablecoins || 0) + (p.treasuryMajors || 0);
    if (liquidTreasuryExt > 0 && p.revenue30d !== null) {
      // Assume monthly burn ~ 30% above revenue (standard for growth protocols)
      const monthlyBurn = Math.max(1, (p.revenue30d || 0) * 0.3);
      metrics.treasuryRunwayMonths = liquidTreasuryExt / monthlyBurn;
    } else {
      metrics.treasuryRunwayMonths = null;
    }

    // E. Momentum Regime Classification
    const tvl1m = p.tvlChange1m ?? 0;
    const price30d = p.priceChange30d ?? 0;
    const rev24h = p.revenue24h ?? 0;
    const rev30dDaily = p.revenue30d ? p.revenue30d / 30 : 0;
    const revAccel = rev30dDaily > 0 ? (rev24h - rev30dDaily) / rev30dDaily : 0;
    if (tvl1m > 5 && revAccel > 0.1) {
      metrics.momentumRegime = 'breakout';
    } else if (tvl1m > 5 && price30d > 5) {
      metrics.momentumRegime = 'expansion';
    } else if (tvl1m < -5 && price30d < -5) {
      metrics.momentumRegime = 'contraction';
    } else if (tvl1m > 5 && price30d < -5) {
      metrics.momentumRegime = 'divergence';
    } else if (Math.abs(tvl1m) < 5 && Math.abs(price30d) < 5) {
      metrics.momentumRegime = 'consolidation';
    } else {
      metrics.momentumRegime = 'mixed';
    }

    // F. TVL and price changes for scatter data
    metrics.tvlChange1m = p.tvlChange1m ?? null;
    metrics.priceChange30d = p.priceChange30d ?? null;
    metrics.fees30d = p.fees30d || null;

    scored.push(metrics);
  }

  // ── Step 2: Compute percentile ranks ──
  // Category-adjusted for EV/Revenue, Volume Utilization, Real Yield
  const CATEGORY_ADJUSTED = new Set(['evToRevenue', 'volumeUtilization', 'realYieldScore']);

  // Group by category
  const byCat = {};
  scored.forEach(m => {
    if (!byCat[m.category]) byCat[m.category] = [];
    byCat[m.category].push(m);
  });

  // For each metric, build sorted arrays (global + per-category)
  const metricKeys = [
    { key: 'evToRevenue', higher: false },
    { key: 'fundingRatio', higher: false },
    { key: 'revenueMomentum', higher: true },
    { key: 'volumeUtilization', higher: true },
    { key: 'securityScore', higher: true },
    { key: 'dilutionRisk', higher: false },
    { key: 'realYieldScore', higher: true },
    { key: 'divergenceSignal', higher: true },
  ];

  const weights = {
    evToRevenue: 0.22,
    fundingRatio: 0.08,
    revenueMomentum: 0.18,
    volumeUtilization: 0.07,
    securityScore: 0.10,
    dilutionRisk: 0.05,
    realYieldScore: 0.15,
    divergenceSignal: 0.10,
    governanceFactor: 0.05,
  };

  // Build sorted value arrays per metric (global)
  const globalSorted = {};
  for (const { key } of metricKeys) {
    globalSorted[key] = scored.map(m => m[key]).filter(v => v !== null && v !== undefined).sort((a, b) => a - b);
  }

  // Build sorted value arrays per category
  const catSorted = {};
  for (const cat in byCat) {
    catSorted[cat] = {};
    for (const { key } of metricKeys) {
      catSorted[cat][key] = byCat[cat].map(m => m[key]).filter(v => v !== null && v !== undefined).sort((a, b) => a - b);
    }
  }

  // Compute percentiles and composite score
  for (const m of scored) {
    let compositeScore = 0;
    let totalWeight = 0;

    for (const { key, higher } of metricKeys) {
      const pctlKey = key.replace(/([A-Z])/g, '_$1').toLowerCase() + '_pctl';
      const shortKey = {
        evToRevenue: 'evRevPctl',
        fundingRatio: 'fundingPctl',
        revenueMomentum: 'momentumPctl',
        volumeUtilization: 'volumeUtilPctl',
        securityScore: 'securityPctl',
        dilutionRisk: 'dilutionPctl',
        realYieldScore: 'realYieldPctl',
        divergenceSignal: 'divergencePctl',
      }[key];

      const val = m[key];
      let pctl;

      if (val === null || val === undefined) {
        pctl = 50; // neutral
      } else {
        const gArr = globalSorted[key];
        const globalPctl = percentileRank(val, gArr);

        if (CATEGORY_ADJUSTED.has(key) && catSorted[m.category]?.[key]?.length >= 5) {
          const catPctl = percentileRank(val, catSorted[m.category][key]);
          pctl = catPctl * 0.7 + globalPctl * 0.3;
        } else {
          pctl = globalPctl;
        }

        if (!higher) pctl = 100 - pctl; // invert for "lower is better"
      }

      m[shortKey] = Math.round(pctl * 10) / 10;

      // Funding: reduce weight if stale
      let w = weights[key] || 0;
      if (key === 'fundingRatio' && m._fundingStale) w *= 0.5;

      compositeScore += pctl * w;
      totalWeight += w;
    }

    // Governance factor (5% weight, applied as-is — frontend enriches)
    m.governancePctl = 50; // neutral default; frontend adjusts
    compositeScore += 50 * weights.governanceFactor;
    totalWeight += weights.governanceFactor;

    m.compositeScore = totalWeight > 0 ? Math.round((compositeScore / totalWeight) * 10) / 10 : 50;

    // Clean up internal fields
    delete m._fundingStale;
  }

  // Sort by composite score descending, take top 100
  scored.sort((a, b) => b.compositeScore - a.compositeScore);
  const rankings = scored.slice(0, 100);

  // Category benchmarks (median of each percentile)
  const categoryBenchmarks = {};
  for (const cat in byCat) {
    const catProtos = byCat[cat];
    const bench = {};
    for (const { key } of metricKeys) {
      const shortKey = {
        evToRevenue: 'evRevPctl', fundingRatio: 'fundingPctl',
        revenueMomentum: 'momentumPctl', volumeUtilization: 'volumeUtilPctl',
        securityScore: 'securityPctl', dilutionRisk: 'dilutionPctl',
        realYieldScore: 'realYieldPctl', divergenceSignal: 'divergencePctl',
      }[key];
      const vals = catProtos.map(m => m[shortKey]).filter(v => v !== undefined);
      bench[shortKey] = vals.length > 0 ? median(vals) : 50;
    }
    bench.governancePctl = 50;
    categoryBenchmarks[cat] = bench;
  }

  // Score distribution stats
  const allScores = scored.map(m => m.compositeScore).sort((a, b) => a - b);
  const mean = allScores.length > 0 ? allScores.reduce((s, v) => s + v, 0) / allScores.length : 0;
  const variance = allScores.length > 0 ? allScores.reduce((s, v) => s + (v - mean) ** 2, 0) / allScores.length : 0;

  // ── Cross-protocol analytics ──

  // 1. Efficiency Frontier: protocols with best revenue-per-unit-risk
  const efficiencyFrontier = scored
    .filter(m => m.realYieldScore > 0 && m.securityScore > 0)
    .map(m => ({
      slug: m.slug, name: m.name, category: m.category, logo: m.logo,
      risk: Math.round((1 - m.securityScore + m.dilutionRisk) * 50 * 10) / 10, // 0-100 risk
      yield: Math.round(m.realYieldScore * 10000) / 100, // yield %
      score: m.compositeScore,
      tvl: m.tvl,
      mcap: m.mcap,
    }))
    .sort((a, b) => (b.yield / Math.max(a.risk, 1)) - (a.yield / Math.max(b.risk, 1)))
    .slice(0, 60);

  // 2. Momentum Regime Distribution
  const regimeCounts = {};
  const regimeProtocols = {};
  for (const m of scored) {
    const r = m.momentumRegime || 'mixed';
    regimeCounts[r] = (regimeCounts[r] || 0) + 1;
    if (!regimeProtocols[r]) regimeProtocols[r] = [];
    if (regimeProtocols[r].length < 5) {
      regimeProtocols[r].push({ slug: m.slug, name: m.name, score: m.compositeScore, tvl: m.tvl });
    }
  }
  const momentumRegimes = Object.entries(regimeCounts).map(([regime, count]) => ({
    regime, count, protocols: regimeProtocols[regime] || [],
  })).sort((a, b) => b.count - a.count);

  // 3. Category Relative Value (within-category z-scores for key metrics)
  const categoryRelativeValue = [];
  for (const cat in byCat) {
    const group = byCat[cat];
    if (group.length < 3) continue;
    const catScores = group.map(m => m.compositeScore);
    const catMean = catScores.reduce((s, v) => s + v, 0) / catScores.length;
    const catVar = catScores.reduce((s, v) => s + (v - catMean) ** 2, 0) / catScores.length;
    const catStd = Math.sqrt(catVar) || 1;
    const catRevenues = group.map(m => m.revenue30d).filter(v => v > 0);
    const catTvls = group.map(m => m.tvl).filter(v => v > 0);
    const medRev = catRevenues.length > 0 ? median(catRevenues) : 0;
    const medTvl = catTvls.length > 0 ? median(catTvls) : 0;
    // Top 3 most undervalued within category
    const topInCat = [...group].sort((a, b) => b.compositeScore - a.compositeScore).slice(0, 3);
    categoryRelativeValue.push({
      category: cat,
      protocolCount: group.length,
      avgScore: Math.round(catMean * 10) / 10,
      stddev: Math.round(catStd * 10) / 10,
      medianRevenue: medRev,
      medianTvl: medTvl,
      top3: topInCat.map(m => ({
        slug: m.slug, name: m.name, score: m.compositeScore,
        zScore: Math.round(((m.compositeScore - catMean) / catStd) * 100) / 100,
        tvl: m.tvl, revenue30d: m.revenue30d,
      })),
    });
  }
  categoryRelativeValue.sort((a, b) => b.avgScore - a.avgScore);

  // 4. Multi-factor scatter data (pre-computed for frontend)
  const scatterAnalytics = scored
    .filter(m => m.tvl > 0)
    .slice(0, 80)
    .map(m => ({
      slug: m.slug, name: m.name, category: m.category,
      score: m.compositeScore,
      tvl: m.tvl,
      mcap: m.mcap,
      revenue30d: m.revenue30d,
      evToRevenue: m.evToRevenue,
      realYield: Math.round(m.realYieldScore * 10000) / 100,
      momentum: m.revenueMomentum !== null ? Math.round(m.revenueMomentum * 100) : null,
      security: Math.round(m.securityScore * 100),
      feeCaptureRatio: m.feeCaptureRatio !== null ? Math.round(m.feeCaptureRatio * 1000) / 10 : null,
      revenueVolatility: m.revenueVolatility !== null ? Math.round(m.revenueVolatility * 100) : null,
      chainHHI: Math.round(m.chainHHI * 100),
      tvlChange1m: m.tvlChange1m,
      priceChange30d: m.priceChange30d,
      momentumRegime: m.momentumRegime,
      divergenceSignal: Math.round(m.divergenceSignal * 100),
      treasuryRunwayMonths: m.treasuryRunwayMonths !== null ? Math.round(m.treasuryRunwayMonths) : null,
    }));

  // 5. Dimension correlation matrix (which dimensions co-occur in top protocols)
  const top30 = rankings.slice(0, 30);
  const dimKeys = ['evRevPctl', 'momentumPctl', 'realYieldPctl', 'securityPctl', 'divergencePctl', 'fundingPctl'];
  const dimCorrelations = [];
  for (let i = 0; i < dimKeys.length; i++) {
    for (let j = i + 1; j < dimKeys.length; j++) {
      const xVals = top30.map(m => m[dimKeys[i]]);
      const yVals = top30.map(m => m[dimKeys[j]]);
      const xMean = xVals.reduce((s, v) => s + v, 0) / xVals.length;
      const yMean = yVals.reduce((s, v) => s + v, 0) / yVals.length;
      let cov = 0, xVar = 0, yVar = 0;
      for (let k = 0; k < top30.length; k++) {
        const dx = xVals[k] - xMean;
        const dy = yVals[k] - yMean;
        cov += dx * dy;
        xVar += dx * dx;
        yVar += dy * dy;
      }
      const denom = Math.sqrt(xVar * yVar);
      dimCorrelations.push({
        dim1: dimKeys[i], dim2: dimKeys[j],
        correlation: denom > 0 ? Math.round((cov / denom) * 100) / 100 : 0,
      });
    }
  }

  // 6. Score snapshot tracking (append to in-memory history)
  const now = Date.now();
  if (!global._scoreSnapshots) global._scoreSnapshots = [];
  // Keep max 72 snapshots (72 * 4hr = 12 days of hourly-ish data)
  if (global._scoreSnapshots.length > 72) global._scoreSnapshots = global._scoreSnapshots.slice(-72);
  global._scoreSnapshots.push({
    timestamp: now,
    mean: Math.round(mean * 10) / 10,
    median: allScores.length > 0 ? Math.round(median(allScores) * 10) / 10 : 50,
    p25: allScores.length > 0 ? Math.round(allScores[Math.floor(allScores.length * 0.25)] * 10) / 10 : 50,
    p75: allScores.length > 0 ? Math.round(allScores[Math.floor(allScores.length * 0.75)] * 10) / 10 : 50,
    totalScored: scored.length,
    regimeBreakout: regimeCounts['breakout'] || 0,
    regimeDivergence: regimeCounts['divergence'] || 0,
    regimeContraction: regimeCounts['contraction'] || 0,
  });

  return {
    rankings,
    categoryBenchmarks,
    scoreDistribution: {
      mean: Math.round(mean * 10) / 10,
      median: allScores.length > 0 ? Math.round(median(allScores) * 10) / 10 : 50,
      stddev: Math.round(Math.sqrt(variance) * 10) / 10,
      p25: allScores.length > 0 ? allScores[Math.floor(allScores.length * 0.25)] : 50,
      p75: allScores.length > 0 ? allScores[Math.floor(allScores.length * 0.75)] : 50,
    },
    totalScored: scored.length,
    // Extended analytics
    efficiencyFrontier,
    momentumRegimes,
    categoryRelativeValue,
    scatterAnalytics,
    dimCorrelations,
    scoreHistory: global._scoreSnapshots || [],
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

  // Recompute valuation discovery scores now that price data is available
  if (cache.data?.analytics) {
    console.log('[enrich] Recomputing valuation discovery with price data...');
    cache.data.analytics.valuationDiscovery = computeValuationDiscovery(protocols);
    console.log('[enrich] Valuation discovery recomputed.');
  }
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

// On-demand: protocol detail with price chart + revenue/fee history + TVL history + peers
const protocolDetailCache = {};
const DETAIL_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const DETAIL_CACHE_MAX = 50;

app.get('/api/protocol/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    // Check detail cache
    const now = Date.now();
    const cached = protocolDetailCache[slug];
    if (cached && (now - cached.ts) < DETAIL_CACHE_TTL) {
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.json(cached.data);
    }

    const protocolEntry = cache.data?.protocols?.find(p => p.slug === slug);
    const geckoId = protocolEntry?.geckoId;
    const category = protocolEntry?.category;

    const [revenueRes, feeRes, priceRes, protocolDetailRes, holdersRevRes, dexVolRes] = await Promise.all([
      fetchJson(`${BASE}/summary/fees/${slug}?dataType=dailyRevenue`).catch(() => null),
      fetchJson(`${BASE}/summary/fees/${slug}`).catch(() => null),
      geckoId
        ? fetchJson(`${COINS}/chart/coingecko:${geckoId}?period=1w&span=52`).catch(() => null)
        : Promise.resolve(null),
      fetchJson(`${BASE}/protocol/${slug}`).catch(() => null),
      fetchJson(`${BASE}/summary/fees/${slug}?dataType=dailyHoldersRevenue`).catch(() => null),
      fetchJson(`${BASE}/summary/dexs/${slug}`).catch(() => null),
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

    // TVL history from /protocol/{slug} — trim to last 2 years
    let tvlHistory = [];
    let chainTvls = {};
    if (protocolDetailRes) {
      const twoYearsAgo = (now / 1000) - (2 * 365 * 86400);

      // Aggregate TVL history
      if (Array.isArray(protocolDetailRes.tvl)) {
        tvlHistory = protocolDetailRes.tvl
          .filter(d => d.date >= twoYearsAgo)
          .map(d => ({ date: d.date, tvl: d.totalLiquidityUSD ?? 0 }));
      }

      // Per-chain TVL history — top 6 chains by final TVL, rest as "Other"
      if (protocolDetailRes.chainTvls && typeof protocolDetailRes.chainTvls === 'object') {
        const chainEntries = Object.entries(protocolDetailRes.chainTvls)
          .filter(([, data]) => Array.isArray(data.tvl) && data.tvl.length > 0)
          .map(([chain, data]) => {
            const tvlArr = data.tvl.filter(d => d.date >= twoYearsAgo);
            const finalTvl = tvlArr.length > 0 ? (tvlArr[tvlArr.length - 1].totalLiquidityUSD ?? 0) : 0;
            return { chain, tvlArr, finalTvl };
          })
          .sort((a, b) => b.finalTvl - a.finalTvl);

        const topChains = chainEntries.slice(0, 6);
        const otherChains = chainEntries.slice(6);

        for (const { chain, tvlArr } of topChains) {
          chainTvls[chain] = tvlArr.map(d => ({ date: d.date, tvl: d.totalLiquidityUSD ?? 0 }));
        }

        // Merge "Other" chains
        if (otherChains.length > 0) {
          const otherMap = {};
          for (const { tvlArr } of otherChains) {
            for (const d of tvlArr) {
              otherMap[d.date] = (otherMap[d.date] || 0) + (d.totalLiquidityUSD ?? 0);
            }
          }
          const otherArr = Object.entries(otherMap)
            .map(([date, tvl]) => ({ date: Number(date), tvl }))
            .sort((a, b) => a.date - b.date);
          if (otherArr.length > 0) {
            chainTvls['Other'] = otherArr;
          }
        }
      }
    }

    // Holders revenue history
    const holdersRevenueHistory = Array.isArray(holdersRevRes?.totalDataChart)
      ? holdersRevRes.totalDataChart.filter(d => Array.isArray(d) && d[1] > 0).map(d => ({ date: d[0], value: d[1] }))
      : [];

    // DEX volume history
    const dexVolumeHistory = Array.isArray(dexVolRes?.totalDataChart)
      ? dexVolRes.totalDataChart.filter(d => Array.isArray(d) && d[1] > 0).map(d => ({ date: d[0], value: d[1] }))
      : [];

    // Category peers — top 10 in same category by TVL
    let categoryPeers = [];
    if (category && cache.data?.protocols) {
      categoryPeers = cache.data.protocols
        .filter(p => p.category === category && p.slug !== slug)
        .sort((a, b) => (b.tvl || 0) - (a.tvl || 0))
        .slice(0, 10)
        .map(p => ({
          name: p.name,
          slug: p.slug,
          tvl: p.tvl || 0,
          revenue30d: p.revenue30d ?? null,
          mcap: p.mcap ?? null,
          fees30d: p.fees30d ?? null,
        }));
    }

    const result = {
      revenueHistory,
      feeHistory,
      priceHistory,
      tvlHistory,
      chainTvls,
      holdersRevenueHistory,
      dexVolumeHistory,
      categoryPeers,
    };

    // Cache the result (evict oldest if at limit)
    const keys = Object.keys(protocolDetailCache);
    if (keys.length >= DETAIL_CACHE_MAX) {
      let oldest = keys[0];
      for (const k of keys) {
        if (protocolDetailCache[k].ts < protocolDetailCache[oldest].ts) oldest = k;
      }
      delete protocolDetailCache[oldest];
    }
    protocolDetailCache[slug] = { ts: now, data: result };

    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(result);
  } catch (err) {
    console.error(`[api] Protocol detail error for ${slug}:`, err.message);
    res.json({
      revenueHistory: [], feeHistory: [], priceHistory: [],
      tvlHistory: [], chainTvls: {}, holdersRevenueHistory: [],
      dexVolumeHistory: [], categoryPeers: [],
    });
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
          // Keep sorted daily data
          const filtered = raw
            .map(d => ({ date: Number(d.date), tvl: Number(d.totalLiquidityUSD ?? d.tvl ?? 0) }))
            .filter(d => d.date >= sixYearsAgo && d.tvl > 0)
            .sort((a, b) => a.date - b.date);
          rawByChain[chain] = filtered;
          chainHistoryCache[chain] = { ts: now, data: filtered };
        }
      } catch (e) {
        console.warn(`Chain history fetch failed for ${chain}:`, e.message);
        rawByChain[chain] = [];
      }
    });

    await Promise.all(fetches);

    // Build a fixed weekly grid from 6 years ago to today
    const WEEK = 7 * 86400;
    const sixYearsAgo = Math.floor((now / 1000) - (6 * 365 * 86400));
    const gridStart = Math.floor(sixYearsAgo / WEEK) * WEEK;
    const gridEnd = Math.floor(now / 1000);
    const weekDates = [];
    for (let d = gridStart; d <= gridEnd; d += WEEK) {
      weekDates.push(d);
    }

    // Carry-forward: for each grid date, use last known TVL at or before that date
    function carryForward(dailyData, gridDates) {
      const result = new Float64Array(gridDates.length);
      if (!dailyData || dailyData.length === 0) return result;
      let di = 0;
      for (let gi = 0; gi < gridDates.length; gi++) {
        const gd = gridDates[gi];
        // Advance to last daily entry at or before this grid date
        while (di < dailyData.length - 1 && dailyData[di + 1].date <= gd) {
          di++;
        }
        if (dailyData[di].date <= gd) {
          result[gi] = dailyData[di].tvl;
        }
        // else remains 0 (chain didn't exist yet)
      }
      return result;
    }

    // Interpolate each chain onto the weekly grid
    const chainGridTvl = {};
    for (const chain of chains) {
      chainGridTvl[chain] = carryForward(rawByChain[chain], weekDates);
    }

    // Compute % share at each week and build response
    const shareData = [];
    for (let i = 0; i < weekDates.length; i++) {
      let total = 0;
      for (const chain of chains) {
        total += chainGridTvl[chain][i];
      }
      if (total <= 0) continue; // skip dates before any chain had data

      const row = { date: weekDates[i] };
      for (const chain of chains) {
        row[chain] = parseFloat(((chainGridTvl[chain][i] / total) * 100).toFixed(2));
      }
      shareData.push(row);
    }

    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json({ chains, shareData });
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
