/**
 * Export comprehensive DeFi dataset to XLSX for Julius analysis.
 * Reads data from pre-downloaded JSON files (fetched via curl from DeFi Llama).
 */
import XLSX from 'xlsx';
import { readFileSync, existsSync } from 'fs';

function loadJson(path) {
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, 'utf-8')); }
  catch { return null; }
}

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function pctlRank(arr, val) {
  if (arr.length === 0) return 50;
  const below = arr.filter(v => v < val).length;
  return Math.round((below / arr.length) * 100);
}

console.log('Loading downloaded data...');

const allProtocols = loadJson('/tmp/protocols.json') || [];
const revenueData = loadJson('/tmp/revenue.json') || { protocols: [], totalDataChart: [] };
const feesData = loadJson('/tmp/fees.json') || { protocols: [], totalDataChart: [] };
const tvlHistory = loadJson('/tmp/tvlhistory.json') || [];
const dexData = loadJson('/tmp/dex.json') || { protocols: [], totalDataChart: [] };
const derivsData = loadJson('/tmp/derivs.json') || { protocols: [] };
const optionsData = loadJson('/tmp/options.json') || { protocols: [] };
const treasuryData = loadJson('/tmp/treasuries.json') || [];
const hacksRaw = loadJson('/tmp/hacks.json') || [];
const raisesRaw = loadJson('/tmp/raises.json') || {};
const raisesData = Array.isArray(raisesRaw) ? raisesRaw : Array.isArray(raisesRaw?.raises) ? raisesRaw.raises : [];

// Load price data
const topGeckoIds = allProtocols.filter(x => x.gecko_id).sort((a, b) => (b.tvl || 0) - (a.tvl || 0)).slice(0, 200);
const priceMap = {};
for (let i = 0; i < topGeckoIds.length; i++) {
  const pd = loadJson(`/tmp/p_${i}.json`);
  if (pd?.coins) {
    Object.entries(pd.coins).forEach(([key, val]) => {
      priceMap[key] = val;
    });
  }
}

console.log(`Loaded: ${allProtocols.length} protocols, ${raisesData.length} raises, ${hacksRaw.length} hacks, ${treasuryData.length} treasuries`);

// ── Index lookups ──
const revBySlug = {};
(revenueData?.protocols || []).forEach(p => {
  if (p.slug || p.module) revBySlug[p.slug || p.module] = p;
});
const feesBySlug = {};
(feesData?.protocols || []).forEach(p => {
  if (p.slug || p.module) feesBySlug[p.slug || p.module] = p;
});
const dexBySlug = {};
if (dexData?.protocols) dexData.protocols.forEach(p => {
  if (p.slug || p.module) dexBySlug[p.slug || p.module] = p;
});
const derivBySlug = {};
if (derivsData?.protocols) derivsData.protocols.forEach(p => {
  if (p.slug || p.module) derivBySlug[p.slug || p.module] = p;
});
const optBySlug = {};
if (optionsData?.protocols) optionsData.protocols.forEach(p => {
  if (p.slug || p.module) optBySlug[p.slug || p.module] = p;
});
const treasuryBySlug = {};
(Array.isArray(treasuryData) ? treasuryData : []).forEach(t => {
  if (t.slug) {
    treasuryBySlug[t.slug] = t;
    // Remove -(treasury) suffix for matching to protocol slugs
    const cleaned = t.slug.replace(/[-(]treasury[)]*$/, '').replace(/-$/, '');
    treasuryBySlug[cleaned] = t;
  }
  if (t.name) {
    const cleanName = t.name.replace(/\s*\(treasury\)\s*/i, '');
    treasuryBySlug[normalizeName(cleanName)] = t;
  }
});
const hacksByName = {};
hacksRaw.forEach(h => {
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

// ── Enrich protocols ──
const protocols = [];
for (const proto of (Array.isArray(allProtocols) ? allProtocols : [])) {
  if (!proto.slug || !proto.name) continue;
  const slug = proto.slug;
  const normalName = normalizeName(proto.name);
  const rev = revBySlug[slug];
  const fee = feesBySlug[slug];
  const dex = dexBySlug[slug];
  const deriv = derivBySlug[slug];
  const option = optBySlug[slug];
  const tSlug = slug.replace(/-treasury$/, '');
  const treasury = treasuryBySlug[tSlug] || treasuryBySlug[normalName];
  const hList = hacksByName[normalName] || [];
  const raises = raisesByName[normalName] || [];

  const totalRaised = raises.reduce((s, r) => s + ((r.amount || 0) * 1e6), 0);
  const sortedRaises = [...raises].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  const latestRaise = sortedRaises[0];
  const totalHacked = hList.reduce((s, h) => s + (h.amount || 0), 0);
  const lastHack = hList.length > 0 ? hList.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0]?.date : null;

  const rev30 = rev?.total30d ?? null;
  const fees30 = fee?.total30d ?? null;
  const mcap = proto.mcap || null;

  // Price change from our fetched data
  const priceKey = proto.gecko_id ? `coingecko:${proto.gecko_id}` : null;
  const priceChange = priceKey ? (priceMap[priceKey] ?? null) : null;

  protocols.push({
    slug, name: proto.name, symbol: proto.symbol || '', category: proto.category || '',
    geckoId: proto.gecko_id || '', logo: proto.logo || '',
    tvl: proto.tvl || 0, mcap,
    revenue24h: rev?.total24h ?? null,
    revenue7d: rev?.total7d ?? null,
    revenue30d: rev30,
    fees24h: fee?.total24h ?? null, fees30d: fees30,
    feeRetention: rev30 > 0 && fees30 > 0 ? rev30 / fees30 : null,
    mcapToAnnualRevenue: mcap && rev30 > 0 ? mcap / (rev30 * 12) : null,
    tvlToAnnualRevenue: proto.tvl > 0 && rev30 > 0 ? proto.tvl / (rev30 * 12) : null,
    annualizedRevenue: rev30 ? rev30 * 12 : null,
    annualizedFees: fees30 ? fees30 * 12 : null,
    dexVolume24h: dex?.total24h ?? null, dexVolume30d: dex?.total30d ?? null,
    treasuryTotal: treasury?.tvl ?? treasury?.tokenBreakdowns?.total ?? treasury?.total ?? null,
    treasuryStablecoins: treasury?.tokenBreakdowns?.stablecoins ?? treasury?.stablecoins ?? null,
    treasuryMajors: treasury?.tokenBreakdowns?.majors ?? treasury?.majors ?? null,
    treasuryOwnTokens: treasury?.tokenBreakdowns?.ownTokens ?? treasury?.ownTokens ?? null,
    treasuryOthers: treasury?.tokenBreakdowns?.others ?? treasury?.others ?? null,
    hackCount: hList.length, totalHackedAmount: totalHacked,
    lastHackDate: lastHack ? new Date(lastHack * 1000).toISOString().split('T')[0] : null,
    totalRaised: totalRaised > 0 ? totalRaised : null,
    raiseCount: raises.length,
    latestRound: latestRaise?.round || null,
    latestRoundDate: latestRaise?.date ? new Date(latestRaise.date * 1000).toISOString().split('T')[0] : (latestRaise?.date || null),
    latestValuation: latestRaise?.valuation || null,
    leadInvestors: (latestRaise?.leadInvestors || []).join('; '),
    allInvestors: raises.flatMap(r => r.leadInvestors || []).filter((v, i, a) => a.indexOf(v) === i).join('; '),
    chains: (proto.chains || []).join('; '),
    primaryChain: proto.chain || '', chainCount: proto.chains?.length || 0,
    tvlChange1d: proto.change_1d ?? null,
    tvlChange7d: proto.change_7d ?? null,
    priceChange: priceChange,
    derivativesVolume24h: deriv?.total24h ?? null,
    optionsVolume24h: option?.total24h ?? null,
  });
}

protocols.sort((a, b) => b.tvl - a.tvl);
console.log(`Enriched ${protocols.length} protocols`);

// ══════════════════════════════════════════════════════════════
//  COMPUTE ALL ANALYTICS SHEETS
// ══════════════════════════════════════════════════════════════

// ── Category Analysis ──
const catMap = {};
protocols.forEach(p => {
  const cat = p.category || 'Other';
  if (!catMap[cat]) catMap[cat] = { protocols: [], tvl: 0, rev: 0, fees: 0, mcap: 0, dex: 0, raised: 0 };
  catMap[cat].protocols.push(p);
  catMap[cat].tvl += p.tvl || 0;
  catMap[cat].rev += p.revenue30d || 0;
  catMap[cat].fees += p.fees30d || 0;
  catMap[cat].mcap += p.mcap || 0;
  catMap[cat].dex += p.dexVolume24h || 0;
  catMap[cat].raised += p.totalRaised || 0;
});
const categoryAnalysis = Object.entries(catMap)
  .filter(([, d]) => d.protocols.length >= 2)
  .map(([category, d]) => {
    const med = (arr) => { const s = [...arr].sort((a, b) => a - b); return s.length > 0 ? s[Math.floor(s.length / 2)] : 0; };
    return {
      category,
      protocolCount: d.protocols.length,
      totalTvl: d.tvl,
      totalRevenue30d: d.rev,
      totalFees30d: d.fees,
      totalMcap: d.mcap,
      totalDexVolume24h: d.dex,
      totalRaised: d.raised,
      avgTvl: d.tvl / d.protocols.length,
      medianTvl: med(d.protocols.map(p => p.tvl)),
      avgRevenue30d: d.rev / d.protocols.length,
      medianRevenue30d: med(d.protocols.filter(p => p.revenue30d > 0).map(p => p.revenue30d)),
      avgMcap: d.mcap / d.protocols.length,
      feeRetention: d.fees > 0 ? d.rev / d.fees : null,
      revenuePerTvl: d.tvl > 0 ? d.rev / d.tvl : null,
      tvlPerRaised: d.raised > 0 ? d.tvl / d.raised : null,
    };
  })
  .sort((a, b) => b.totalTvl - a.totalTvl);

// ── Revenue Efficiency ──
const revenueEfficiency = protocols
  .filter(p => p.tvl > 0 && p.revenue30d > 0)
  .map(p => ({
    name: p.name, slug: p.slug, category: p.category,
    tvl: p.tvl, revenue30d: p.revenue30d, fees30d: p.fees30d || 0, mcap: p.mcap || 0,
    annualizedRevenue: p.revenue30d * 12,
    revenuePerTvlBps: Math.round((p.revenue30d / p.tvl) * 10000),
    annualizedRevPerTvl: (p.revenue30d * 12) / p.tvl,
    feeRetention: p.fees30d > 0 ? p.revenue30d / p.fees30d : null,
    peRatio: p.mcap > 0 && p.revenue30d > 0 ? p.mcap / (p.revenue30d * 12) : null,
    priceToSales: p.mcap > 0 && p.fees30d > 0 ? p.mcap / (p.fees30d * 12) : null,
    dexVolume24h: p.dexVolume24h || 0,
  }))
  .sort((a, b) => b.annualizedRevPerTvl - a.annualizedRevPerTvl)
  .slice(0, 200);

// ── Capital Efficiency ──
const capitalEfficiency = protocols
  .filter(p => p.mcap > 0 && p.tvl > 0)
  .map(p => ({
    name: p.name, slug: p.slug, category: p.category,
    tvl: p.tvl, mcap: p.mcap, revenue30d: p.revenue30d || 0,
    tvlToMcap: p.tvl / p.mcap,
    revenueYield: p.revenue30d > 0 ? (p.revenue30d * 12) / p.mcap : 0,
    peRatio: p.revenue30d > 0 ? p.mcap / (p.revenue30d * 12) : null,
    fullyDilutedPE: null,
    totalRaised: p.totalRaised || 0,
    latestValuation: p.latestValuation || 0,
    mcapToValuation: p.latestValuation > 0 ? p.mcap / p.latestValuation : null,
  }))
  .sort((a, b) => b.revenueYield - a.revenueYield)
  .slice(0, 200);

// ── Hacks (raw) ──
const hackRows = hacksRaw.map(h => ({
  name: h.name || '',
  date: h.date ? new Date(h.date * 1000).toISOString().split('T')[0] : '',
  chain: Array.isArray(h.chain) ? h.chain.join('; ') : (h.chain || ''),
  classification: h.classification || '',
  technique: h.technique || '',
  amount: h.amount || 0,
  bridgeHack: h.bridgeHack || false,
  targetType: h.targetType || '',
}));

// ── Raises (raw) ──
const raiseRows = raisesData.map(r => ({
  name: r.name || '',
  date: r.date ? (typeof r.date === 'number' ? new Date(r.date * 1000).toISOString().split('T')[0] : r.date) : '',
  amountUSD: (r.amount || 0) * 1e6,
  amountMillions: r.amount || 0,
  round: r.round || '',
  valuation: r.valuation || null,
  leadInvestors: (r.leadInvestors || []).join('; '),
  otherInvestors: (r.otherInvestors || []).join('; '),
  chains: Array.isArray(r.chains) ? r.chains.join('; ') : '',
  sector: typeof r.sector === 'string' ? r.sector.slice(0, 200) : '',
  source: r.source || '',
}));

// ── Round-type breakdown ──
const roundTypes = {};
raisesData.forEach(r => {
  const round = (r.round || 'Unknown').trim();
  if (!roundTypes[round]) roundTypes[round] = { count: 0, totalAmount: 0 };
  roundTypes[round].count++;
  roundTypes[round].totalAmount += (r.amount || 0) * 1e6;
});
const totalRaisedAll = raisesData.reduce((s, r) => s + ((r.amount || 0) * 1e6), 0);
const roundTypeRows = Object.entries(roundTypes)
  .map(([round, d]) => ({
    round, count: d.count, totalAmount: d.totalAmount,
    avgAmount: d.count > 0 ? Math.round(d.totalAmount / d.count) : 0,
    sharePercent: totalRaisedAll > 0 ? Math.round((d.totalAmount / totalRaisedAll) * 10000) / 100 : 0,
  }))
  .sort((a, b) => b.totalAmount - a.totalAmount);

// ── Raises by year ──
const raisesByYear = {};
raisesData.forEach(r => {
  if (!r.date) return;
  const ts = typeof r.date === 'number' ? r.date * 1000 : new Date(r.date).getTime();
  const year = new Date(ts).getFullYear();
  if (year < 2010 || year > 2030) return;
  if (!raisesByYear[year]) raisesByYear[year] = { count: 0, amount: 0, amounts: [] };
  raisesByYear[year].count++;
  raisesByYear[year].amount += (r.amount || 0) * 1e6;
  if (r.amount > 0) raisesByYear[year].amounts.push(r.amount * 1e6);
});
const yearlyFunding = Object.entries(raisesByYear).map(([year, d]) => {
  const sorted = d.amounts.sort((a, b) => a - b);
  return {
    year: Number(year), roundCount: d.count, totalRaised: d.amount,
    medianRound: sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0,
    avgRound: d.count > 0 ? d.amount / d.count : 0,
  };
}).sort((a, b) => a.year - b.year);

// ── Vintage Cohorts ──
const fundedProtocols = protocols.filter(p => p.totalRaised > 0);
const vintageCohorts = {};
fundedProtocols.forEach(p => {
  if (!p.latestRoundDate) return;
  const year = new Date(p.latestRoundDate).getFullYear();
  if (year < 2010 || year > 2030) return;
  if (!vintageCohorts[year]) vintageCohorts[year] = [];
  vintageCohorts[year].push(p);
});
const vintageRows = Object.entries(vintageCohorts).map(([year, prots]) => {
  const totalR = prots.reduce((s, p) => s + (p.totalRaised || 0), 0);
  const totalT = prots.reduce((s, p) => s + (p.tvl || 0), 0);
  const totalM = prots.reduce((s, p) => s + (p.mcap || 0), 0);
  const totalRev = prots.reduce((s, p) => s + (p.revenue30d || 0), 0);
  return {
    vintage: Number(year), protocolCount: prots.length,
    totalRaised: totalR, totalTvl: totalT, totalMcap: totalM, totalRevenue30d: totalRev,
    capitalEfficiency: totalR > 0 ? Math.round((totalT / totalR) * 100) / 100 : 0,
    annualRevenueYield: totalR > 0 ? Math.round((totalRev * 12 / totalR) * 10000) / 100 : 0,
  };
}).sort((a, b) => a.vintage - b.vintage);

// ── Investor Analytics ──
const investorMap = {};
fundedProtocols.forEach(p => {
  const investors = p.allInvestors ? p.allInvestors.split('; ') : [];
  investors.forEach(inv => {
    const name = inv.trim();
    if (!name) return;
    if (!investorMap[name]) investorMap[name] = { name, deals: 0, totalInvested: 0, portfolioTvl: 0, portfolioMcap: 0, portfolioRevenue: 0, protocols: [] };
    investorMap[name].deals++;
    investorMap[name].totalInvested += p.totalRaised || 0;
    investorMap[name].portfolioTvl += p.tvl || 0;
    investorMap[name].portfolioMcap += (p.mcap || 0);
    investorMap[name].portfolioRevenue += (p.revenue30d || 0);
    if (investorMap[name].protocols.length < 10) investorMap[name].protocols.push(p.name);
  });
});
const investorRows = Object.values(investorMap)
  .filter(inv => inv.deals >= 2)
  .map(inv => ({
    investor: inv.name, dealCount: inv.deals,
    totalInvested: inv.totalInvested,
    portfolioTvl: inv.portfolioTvl,
    portfolioMcap: inv.portfolioMcap,
    annualPortfolioRevenue: Math.round(inv.portfolioRevenue * 12),
    tvlPerDollarInvested: inv.totalInvested > 0 ? Math.round((inv.portfolioTvl / inv.totalInvested) * 100) / 100 : 0,
    mcapPerDollarInvested: inv.totalInvested > 0 ? Math.round((inv.portfolioMcap / inv.totalInvested) * 100) / 100 : 0,
    topProtocols: inv.protocols.join(', '),
  }))
  .sort((a, b) => b.dealCount - a.dealCount);

// ── Chain Analysis ──
const chainStats = {};
protocols.forEach(p => {
  if (!p.chains) return;
  const chainList = p.chains.split('; ').filter(Boolean);
  chainList.forEach(chain => {
    if (!chainStats[chain]) chainStats[chain] = { protocolCount: 0, totalTvl: 0, totalRevenue30d: 0, totalFees30d: 0, totalMcap: 0, totalDexVol: 0 };
    chainStats[chain].protocolCount++;
  });
  const primary = p.primaryChain || chainList[0];
  if (primary && chainStats[primary]) {
    chainStats[primary].totalTvl += p.tvl || 0;
    chainStats[primary].totalRevenue30d += p.revenue30d || 0;
    chainStats[primary].totalFees30d += p.fees30d || 0;
    chainStats[primary].totalMcap += p.mcap || 0;
    chainStats[primary].totalDexVol += p.dexVolume24h || 0;
  }
});
const chainRows = Object.entries(chainStats)
  .map(([chain, d]) => ({ chain, ...d }))
  .sort((a, b) => b.totalTvl - a.totalTvl);

// ── Treasury Analysis ──
const treasuryRows = protocols
  .filter(p => p.treasuryTotal > 0)
  .map(p => ({
    name: p.name, slug: p.slug, category: p.category,
    tvl: p.tvl, mcap: p.mcap || 0,
    treasuryTotal: p.treasuryTotal,
    treasuryStablecoins: p.treasuryStablecoins || 0,
    treasuryMajors: p.treasuryMajors || 0,
    treasuryOwnTokens: p.treasuryOwnTokens || 0,
    treasuryOthers: p.treasuryOthers || 0,
    stablecoinRatio: p.treasuryTotal > 0 ? (p.treasuryStablecoins || 0) / p.treasuryTotal : null,
    treasuryToTvl: p.tvl > 0 ? p.treasuryTotal / p.tvl : null,
    treasuryToMcap: p.mcap > 0 ? p.treasuryTotal / p.mcap : null,
    runwayMonths: p.revenue30d > 0 ? p.treasuryTotal / p.revenue30d : null,
  }))
  .sort((a, b) => b.treasuryTotal - a.treasuryTotal);

// ── Funding Performance ──
const fundingPerf = fundedProtocols
  .filter(p => p.totalRaised > 1e4)
  .map(p => {
    const raised = p.totalRaised;
    const mcap = p.mcap || 0;
    const rev = p.revenue30d || 0;
    const fees = p.fees30d || 0;
    let quadrant = 'Underperformer';
    if (p.tvl > raised && mcap > raised) quadrant = 'Star';
    else if (p.tvl > raised) quadrant = 'Builder';
    else if (mcap > raised) quadrant = 'Speculative';
    return {
      name: p.name, slug: p.slug, category: p.category,
      totalRaised: raised, tvl: p.tvl, mcap,
      revenue30d: rev, fees30d: fees,
      tvlMultiple: Math.round((p.tvl / raised) * 100) / 100,
      mcapMultiple: mcap > 0 ? Math.round((mcap / raised) * 100) / 100 : 0,
      annualRevenuePerRaised: rev > 0 ? Math.round(((rev * 12) / raised) * 10000) / 100 : 0,
      feeCapturePerRaised: fees > 0 ? Math.round(((fees * 12) / raised) * 10000) / 100 : 0,
      quadrant,
      latestRound: p.latestRound || '',
      latestRoundDate: p.latestRoundDate || '',
      latestValuation: p.latestValuation || 0,
      leadInvestors: p.leadInvestors || '',
    };
  })
  .sort((a, b) => b.tvlMultiple - a.tvlMultiple);

// ── Category Funding Efficiency ──
const catFunding = {};
fundedProtocols.forEach(p => {
  const cat = p.category || 'Other';
  if (!catFunding[cat]) catFunding[cat] = { raised: 0, tvl: 0, mcap: 0, rev: 0, count: 0 };
  catFunding[cat].raised += p.totalRaised || 0;
  catFunding[cat].tvl += p.tvl || 0;
  catFunding[cat].mcap += (p.mcap || 0);
  catFunding[cat].rev += (p.revenue30d || 0);
  catFunding[cat].count++;
});
const catFundingRows = Object.entries(catFunding)
  .filter(([, d]) => d.count >= 3 && d.raised > 0)
  .map(([category, d]) => ({
    category, protocolCount: d.count,
    totalRaised: d.raised, totalTvl: d.tvl,
    tvlPerRaised: Math.round((d.tvl / d.raised) * 100) / 100,
    mcapPerRaised: d.mcap > 0 ? Math.round((d.mcap / d.raised) * 100) / 100 : 0,
    annualRevPerRaisedPct: Math.round((d.rev * 12 / d.raised) * 10000) / 100,
  }))
  .sort((a, b) => b.tvlPerRaised - a.tvlPerRaised);

// ── Valuation Scoring ──
console.log('Computing valuation scores...');
const scored = protocols.filter(p => p.tvl > 1e5 && (p.revenue30d > 0 || p.mcap > 0));
const evRevValues = scored.filter(p => p.revenue30d > 0 && p.mcap > 0).map(p => p.mcap / (p.revenue30d * 12));
const fundingRatios = scored.filter(p => p.latestValuation > 0 && p.mcap > 0).map(p => p.mcap / p.latestValuation);

const valuationRows = scored.map(p => {
  const evToRev = p.revenue30d > 0 && p.mcap > 0 ? p.mcap / (p.revenue30d * 12) : null;
  const fundingRatio = p.latestValuation > 0 && p.mcap > 0 ? p.mcap / p.latestValuation : null;
  const tvlChange = p.tvlChange7d || 0;
  const divergence = (p.tvlChange1d || 0) - (p.priceChange || 0);
  const chainList = p.chains ? p.chains.split('; ') : [];
  const chainHHI = chainList.length > 1 ? 1 / chainList.length : 1;
  return {
    name: p.name, slug: p.slug, category: p.category,
    tvl: p.tvl, mcap: p.mcap || 0,
    revenue30d: p.revenue30d || 0, fees30d: p.fees30d || 0,
    annualizedRevenue: (p.revenue30d || 0) * 12,
    evToRevenue: evToRev,
    evRevPctl: evToRev != null ? 100 - pctlRank(evRevValues, evToRev) : null,
    fundingRatio, fundingPctl: fundingRatio != null ? pctlRank(fundingRatios, fundingRatio) : null,
    feeRetention: p.feeRetention,
    tvlChange1d: p.tvlChange1d, tvlChange7d: p.tvlChange7d,
    priceChange: p.priceChange, tvlPriceDivergence: divergence,
    chainCount: chainList.length, chainHHI,
    treasuryTotal: p.treasuryTotal || 0,
    totalRaised: p.totalRaised || 0,
    latestValuation: p.latestValuation || 0,
    hackCount: p.hackCount, totalHackedAmount: p.totalHackedAmount,
    dexVolume24h: p.dexVolume24h || 0,
  };
}).sort((a, b) => b.tvl - a.tvl);

// ── Historical TVL ──
const histTvl = (Array.isArray(tvlHistory) ? tvlHistory : []).map(d => ({
  date: new Date(d.date * 1000).toISOString().split('T')[0],
  tvl: d.totalLiquidityUSD || d.tvl || 0,
}));

// ── Revenue time series ──
const revChart = (revenueData?.totalDataChart || []).map(d => {
  const [ts, val] = Array.isArray(d) ? d : [d.date, d.value || 0];
  return { date: new Date(ts * 1000).toISOString().split('T')[0], dailyRevenue: val };
});

// ── Fees time series ──
const feesChart = (feesData?.totalDataChart || []).map(d => {
  const [ts, val] = Array.isArray(d) ? d : [d.date, d.value || 0];
  return { date: new Date(ts * 1000).toISOString().split('T')[0], dailyFees: val };
});

// ── DEX volume time series ──
const dexChart = (dexData?.totalDataChart || []).map(d => {
  const [ts, val] = Array.isArray(d) ? d : [d.date, d.value || 0];
  return { date: new Date(ts * 1000).toISOString().split('T')[0], dailyDexVolume: val };
});

// ── Market Structure ──
const sortedByTvl = [...protocols].sort((a, b) => b.tvl - a.tvl);
const totalTvl = protocols.reduce((s, p) => s + (p.tvl || 0), 0);
const totalRev = protocols.reduce((s, p) => s + (p.revenue30d || 0), 0);
const totalMcap = protocols.reduce((s, p) => s + (p.mcap || 0), 0);

// Lorenz curve
const lorenzPoints = [];
let cumTvl = 0;
let cumRev = 0;
const step = Math.max(1, Math.floor(sortedByTvl.length / 100));
for (let i = sortedByTvl.length - 1; i >= 0; i -= step) {
  cumTvl += sortedByTvl[i].tvl || 0;
  cumRev += sortedByTvl[i].revenue30d || 0;
  lorenzPoints.push({
    percentile: Math.round(((sortedByTvl.length - i) / sortedByTvl.length) * 100),
    cumulativeTvlShare: totalTvl > 0 ? Math.round((cumTvl / totalTvl) * 10000) / 100 : 0,
    cumulativeRevenueShare: totalRev > 0 ? Math.round((cumRev / totalRev) * 10000) / 100 : 0,
  });
}

const marketSummary = [{
  totalProtocols: protocols.length,
  totalTvl, totalRevenue30d: totalRev, totalMcap,
  protocolsWithRevenue: protocols.filter(p => p.revenue30d > 0).length,
  protocolsWithFees: protocols.filter(p => p.fees30d > 0).length,
  protocolsWithMcap: protocols.filter(p => p.mcap > 0).length,
  protocolsWithTreasury: protocols.filter(p => p.treasuryTotal > 0).length,
  protocolsFunded: fundedProtocols.length,
  top10TvlShare: totalTvl > 0 ? Math.round(sortedByTvl.slice(0, 10).reduce((s, p) => s + p.tvl, 0) / totalTvl * 10000) / 100 : 0,
  avgChainCount: protocols.length > 0 ? Math.round(protocols.reduce((s, p) => s + p.chainCount, 0) / protocols.length * 10) / 10 : 0,
}];

// ══════════════════════════════════════════════════════════════
//  BUILD XLSX
// ══════════════════════════════════════════════════════════════
console.log('Building XLSX...');
const wb = XLSX.utils.book_new();

function addSheet(name, data) {
  if (!data || data.length === 0) { console.log(`  [skip] ${name}`); return; }
  const sheetName = name.slice(0, 31);
  const ws = XLSX.utils.json_to_sheet(data);
  const keys = Object.keys(data[0]);
  ws['!cols'] = keys.map(k => {
    let maxLen = k.length;
    data.slice(0, 50).forEach(row => {
      const len = row[k] != null ? String(row[k]).length : 0;
      if (len > maxLen) maxLen = len;
    });
    return { wch: Math.min(maxLen + 2, 45) };
  });
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  console.log(`  [+] ${sheetName}: ${data.length} rows x ${keys.length} cols`);
}

addSheet('Market Summary', marketSummary);
addSheet('All Protocols', protocols);
addSheet('Category Analysis', categoryAnalysis);
addSheet('Revenue Efficiency', revenueEfficiency);
addSheet('Capital Efficiency', capitalEfficiency);
addSheet('Valuation Scores', valuationRows);
addSheet('Funding Performance', fundingPerf);
addSheet('Cat Funding Efficiency', catFundingRows);
addSheet('Funding Rounds (Raw)', raiseRows);
addSheet('Round Types', roundTypeRows);
addSheet('Yearly Funding', yearlyFunding);
addSheet('Vintage Cohorts', vintageRows);
addSheet('Investor Analytics', investorRows);
addSheet('Chain Analysis', chainRows);
addSheet('Treasury Analysis', treasuryRows);
addSheet('Hacks (Raw)', hackRows);
addSheet('Lorenz Curve', lorenzPoints);
addSheet('Historical TVL', histTvl);
addSheet('Daily Revenue', revChart);
addSheet('Daily Fees', feesChart);
addSheet('Daily DEX Volume', dexChart);

const outPath = '/home/user/holderrights/defi-analytics-dataset.xlsx';
XLSX.writeFile(wb, outPath);
console.log(`\n✓ Exported to: ${outPath}`);
console.log(`  ${wb.SheetNames.length} sheets`);
