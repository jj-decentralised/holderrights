import { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Bar, BarChart, Cell,
} from 'recharts';
import { HOLDER_RIGHT_DEFINITIONS } from '../types';
import type { EnrichedProtocol, CategoryPeer } from '../types';
import { HistoricChart, RevenueChart } from './HistoricChart';

type DetailTab = 'overview' | 'history' | 'peers';

interface ProtocolDetailProps {
  protocol: EnrichedProtocol;
  revenueHistory: { date: number; value: number }[];
  feeHistory: { date: number; value: number }[];
  tvlHistory: { date: number; tvl: number }[];
  chainTvls: Record<string, { date: number; tvl: number }[]>;
  holdersRevenueHistory: { date: number; value: number }[];
  dexVolumeHistory: { date: number; value: number }[];
  categoryPeers: CategoryPeer[];
  onClose: () => void;
}

function fmt(n: number | null): string {
  if (n === null || n === undefined) return '—';
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function pctFmt(n: number | null): string {
  if (n === null || n === undefined) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function pctClass(n: number | null): string {
  if (n === null) return '';
  return n >= 0 ? 'positive' : 'negative';
}

function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

const tooltipStyle = {
  background: 'rgba(255,255,255,0.96)',
  border: '1px solid #e0e0dd',
  borderRadius: '6px',
  fontSize: 13,
  color: '#333',
} as const;

const CHAIN_COLORS = [
  '#1a1a1a', '#555', '#888', '#aaa', '#ccc', '#ddd', '#e8e8e5',
] as const;

type HistoryPeriod = '30d' | '90d' | '1y' | 'all';

function filterByPeriod<T extends { date: number }>(data: T[], period: HistoryPeriod): T[] {
  if (period === 'all' || data.length === 0) return data;
  const now = Date.now() / 1000;
  const cutoffs: Record<string, number> = { '30d': 30 * 86400, '90d': 90 * 86400, '1y': 365 * 86400 };
  const cutoff = now - (cutoffs[period] ?? 0);
  return data.filter((d) => d.date >= cutoff);
}

export function ProtocolDetail({
  protocol,
  revenueHistory,
  feeHistory,
  tvlHistory,
  chainTvls,
  holdersRevenueHistory,
  dexVolumeHistory,
  categoryPeers,
  onClose,
}: ProtocolDetailProps) {
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [histPeriod, setHistPeriod] = useState<HistoryPeriod>('1y');
  const p = protocol;

  const hasTreasury = p.treasuryTotal !== null && p.treasuryTotal > 0;
  const hasRaises = p.totalRaised !== null && p.totalRaised > 0;
  const hasHacks = p.hackCount > 0;
  const hasYields = p.yieldPoolCount > 0;
  const hasDexVolume = p.dexVolume24h !== null;
  const hasDerivatives = p.derivativesVolume24h !== null;
  const hasOptions = p.optionsVolume24h !== null;
  const hasPriceChanges = p.priceChange1d !== null || p.priceChange7d !== null || p.priceChange30d !== null;

  // History tab data
  const filteredTvl = useMemo(() => filterByPeriod(tvlHistory, histPeriod), [tvlHistory, histPeriod]);

  const revenueVsFees = useMemo(() => {
    const revMap = new Map(revenueHistory.map((d) => [d.date, d.value]));
    const feeMap = new Map(feeHistory.map((d) => [d.date, d.value]));
    const allDates = [...new Set([...revMap.keys(), ...feeMap.keys()])].sort();
    const data = allDates.map((date) => ({
      date,
      revenue: revMap.get(date) ?? 0,
      fees: feeMap.get(date) ?? 0,
    }));
    return filterByPeriod(data, histPeriod);
  }, [revenueHistory, feeHistory, histPeriod]);

  const filteredHoldersRev = useMemo(
    () => filterByPeriod(holdersRevenueHistory, histPeriod),
    [holdersRevenueHistory, histPeriod],
  );

  const filteredDexVol = useMemo(
    () => filterByPeriod(dexVolumeHistory, histPeriod),
    [dexVolumeHistory, histPeriod],
  );

  // Stacked chain TVL data
  const chainNames = useMemo(() => Object.keys(chainTvls), [chainTvls]);
  const stackedChainData = useMemo(() => {
    if (chainNames.length === 0) return [];
    const dateMap: Record<number, Record<string, number>> = {};
    for (const chain of chainNames) {
      for (const d of chainTvls[chain]) {
        if (!dateMap[d.date]) dateMap[d.date] = {};
        dateMap[d.date][chain] = d.tvl;
      }
    }
    const rows = Object.entries(dateMap)
      .map(([date, vals]) => ({ date: Number(date), ...vals }))
      .sort((a, b) => a.date - b.date);
    return filterByPeriod(rows, histPeriod);
  }, [chainTvls, chainNames, histPeriod]);

  // Peers tab — sorted by TVL, protocol included
  const peersWithSelf = useMemo(() => {
    const self: CategoryPeer = {
      name: p.name,
      slug: p.slug,
      tvl: p.tvl,
      revenue30d: p.revenue30d,
      mcap: p.mcap,
      fees30d: p.fees30d,
    };
    return [self, ...categoryPeers].sort((a, b) => b.tvl - a.tvl);
  }, [p, categoryPeers]);

  const maxPeerTvl = useMemo(
    () => Math.max(...peersWithSelf.map((pr) => pr.tvl), 1),
    [peersWithSelf],
  );

  const DETAIL_TABS: { key: DetailTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'history', label: 'History' },
    { key: 'peers', label: `Peers (${categoryPeers.length})` },
  ];

  return (
    <div className="detail-overlay" onClick={(e) => {
      if ((e.target as HTMLElement).classList.contains('detail-overlay')) onClose();
    }}>
      <div className="detail-panel">
        <button className="close-btn" onClick={onClose}>&times;</button>

        <div className="detail-header">
          {p.logo && <img src={p.logo} alt="" className="detail-logo" />}
          <div>
            <h2>{p.name} <span className="symbol">{p.symbol}</span></h2>
            <span className="category-badge">{p.category}</span>
          </div>
        </div>

        {/* Internal sub-navigation */}
        <nav className="detail-tabs">
          {DETAIL_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`detail-tab-btn ${detailTab === tab.key ? 'detail-tab-active' : ''}`}
              onClick={() => setDetailTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* ═══════ OVERVIEW TAB ═══════ */}
        {detailTab === 'overview' && (
          <>
            <div className="detail-stats">
              <div className="detail-stat">
                <div className="stat-label">TVL</div>
                <div className="stat-value">{fmt(p.tvl)}</div>
              </div>
              <div className="detail-stat">
                <div className="stat-label">Market Cap</div>
                <div className="stat-value">{fmt(p.mcap)}</div>
              </div>
              <div className="detail-stat">
                <div className="stat-label">Revenue (24h)</div>
                <div className="stat-value">{fmt(p.revenue24h)}</div>
              </div>
              <div className="detail-stat">
                <div className="stat-label">Revenue (30d)</div>
                <div className="stat-value">{fmt(p.revenue30d)}</div>
              </div>
              <div className="detail-stat">
                <div className="stat-label">Fees (24h)</div>
                <div className="stat-value">{fmt(p.fees24h)}</div>
              </div>
              <div className="detail-stat">
                <div className="stat-label">MC / Revenue</div>
                <div className="stat-value">{p.mcapToRevenue ? `${p.mcapToRevenue.toFixed(1)}x` : '—'}</div>
              </div>
              {hasDexVolume && (
                <div className="detail-stat">
                  <div className="stat-label">DEX Volume (24h)</div>
                  <div className="stat-value">{fmt(p.dexVolume24h)}</div>
                </div>
              )}
              {hasDexVolume && (
                <div className="detail-stat">
                  <div className="stat-label">DEX Volume (30d)</div>
                  <div className="stat-value">{fmt(p.dexVolume30d)}</div>
                </div>
              )}
              {hasDerivatives && (
                <div className="detail-stat">
                  <div className="stat-label">Derivatives Vol (24h)</div>
                  <div className="stat-value">{fmt(p.derivativesVolume24h)}</div>
                </div>
              )}
              {hasOptions && (
                <div className="detail-stat">
                  <div className="stat-label">Options Vol (24h)</div>
                  <div className="stat-value">{fmt(p.optionsVolume24h)}</div>
                </div>
              )}
            </div>

            {/* Price & TVL Momentum */}
            {(hasPriceChanges || p.tvlChange1d !== null) && (
              <div className="detail-section">
                <h3>Price & TVL Momentum</h3>
                <div className="detail-stats">
                  {p.priceChange1d !== null && (
                    <div className="detail-stat">
                      <div className="stat-label">Price 1d</div>
                      <div className={`stat-value ${pctClass(p.priceChange1d)}`}>{pctFmt(p.priceChange1d)}</div>
                    </div>
                  )}
                  {p.priceChange7d !== null && (
                    <div className="detail-stat">
                      <div className="stat-label">Price 7d</div>
                      <div className={`stat-value ${pctClass(p.priceChange7d)}`}>{pctFmt(p.priceChange7d)}</div>
                    </div>
                  )}
                  {p.priceChange30d !== null && (
                    <div className="detail-stat">
                      <div className="stat-label">Price 30d</div>
                      <div className={`stat-value ${pctClass(p.priceChange30d)}`}>{pctFmt(p.priceChange30d)}</div>
                    </div>
                  )}
                  {p.tvlChange1d !== null && (
                    <div className="detail-stat">
                      <div className="stat-label">TVL 1d</div>
                      <div className={`stat-value ${pctClass(p.tvlChange1d)}`}>{pctFmt(p.tvlChange1d)}</div>
                    </div>
                  )}
                  {p.tvlChange7d !== null && (
                    <div className="detail-stat">
                      <div className="stat-label">TVL 7d</div>
                      <div className={`stat-value ${pctClass(p.tvlChange7d)}`}>{pctFmt(p.tvlChange7d)}</div>
                    </div>
                  )}
                  {p.tvlChange1m !== null && (
                    <div className="detail-stat">
                      <div className="stat-label">TVL 1m</div>
                      <div className={`stat-value ${pctClass(p.tvlChange1m)}`}>{pctFmt(p.tvlChange1m)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Chain Distribution */}
            {p.chainCount > 0 && (
              <div className="detail-section">
                <h3>Chain Distribution</h3>
                <div className="detail-stats">
                  <div className="detail-stat">
                    <div className="stat-label">Primary Chain</div>
                    <div className="stat-value" style={{ fontSize: '16px' }}>{p.primaryChain}</div>
                  </div>
                  <div className="detail-stat">
                    <div className="stat-label">Total Chains</div>
                    <div className="stat-value">{p.chainCount}</div>
                  </div>
                </div>
                {p.chains.length > 0 && (
                  <div className="chain-list">
                    {p.chains.map((chain) => (
                      <span key={chain} className="chain-badge">{chain}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Treasury Section */}
            {hasTreasury && (
              <div className="detail-section">
                <h3>Treasury Composition</h3>
                <div className="detail-stats">
                  <div className="detail-stat">
                    <div className="stat-label">Total Treasury</div>
                    <div className="stat-value">{fmt(p.treasuryTotal)}</div>
                  </div>
                  <div className="detail-stat">
                    <div className="stat-label">Stablecoins</div>
                    <div className="stat-value">{fmt(p.treasuryStablecoins)}</div>
                  </div>
                  <div className="detail-stat">
                    <div className="stat-label">Major Assets</div>
                    <div className="stat-value">{fmt(p.treasuryMajors)}</div>
                  </div>
                  <div className="detail-stat">
                    <div className="stat-label">Own Token</div>
                    <div className="stat-value">{fmt(p.treasuryOwnTokens)}</div>
                  </div>
                  <div className="detail-stat">
                    <div className="stat-label">Other Assets</div>
                    <div className="stat-value">{fmt(p.treasuryOthers)}</div>
                  </div>
                </div>
                {p.treasuryTotal && p.treasuryStablecoins !== null && (
                  <div className="treasury-bar">
                    {p.treasuryStablecoins > 0 && (
                      <div className="treasury-segment stables" style={{ width: `${(p.treasuryStablecoins / p.treasuryTotal) * 100}%` }}
                        title={`Stablecoins: ${fmt(p.treasuryStablecoins)}`} />
                    )}
                    {p.treasuryMajors !== null && p.treasuryMajors > 0 && (
                      <div className="treasury-segment majors" style={{ width: `${(p.treasuryMajors / p.treasuryTotal) * 100}%` }}
                        title={`Majors: ${fmt(p.treasuryMajors)}`} />
                    )}
                    {p.treasuryOwnTokens !== null && p.treasuryOwnTokens > 0 && (
                      <div className="treasury-segment own-token" style={{ width: `${(p.treasuryOwnTokens / p.treasuryTotal) * 100}%` }}
                        title={`Own Token: ${fmt(p.treasuryOwnTokens)}`} />
                    )}
                    {p.treasuryOthers !== null && p.treasuryOthers > 0 && (
                      <div className="treasury-segment others" style={{ width: `${(p.treasuryOthers / p.treasuryTotal) * 100}%` }}
                        title={`Others: ${fmt(p.treasuryOthers)}`} />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Funding Section */}
            {hasRaises && (
              <div className="detail-section">
                <h3>Funding History</h3>
                <div className="detail-stats">
                  <div className="detail-stat">
                    <div className="stat-label">Total Raised</div>
                    <div className="stat-value">{fmt(p.totalRaised)}</div>
                  </div>
                  {p.latestRound && (
                    <div className="detail-stat">
                      <div className="stat-label">Latest Round</div>
                      <div className="stat-value">{p.latestRound}</div>
                    </div>
                  )}
                  {p.latestRoundDate && (
                    <div className="detail-stat">
                      <div className="stat-label">Round Date</div>
                      <div className="stat-value">{new Date(p.latestRoundDate).toLocaleDateString()}</div>
                    </div>
                  )}
                  {p.latestValuation && (
                    <div className="detail-stat">
                      <div className="stat-label">Valuation</div>
                      <div className="stat-value">{fmt(p.latestValuation)}</div>
                    </div>
                  )}
                </div>
                {p.leadInvestors.length > 0 && (
                  <div className="investor-list">
                    <span className="investor-label">Lead Investors: </span>
                    {p.leadInvestors.join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Hack History */}
            {hasHacks && (
              <div className="detail-section">
                <h3>Security History</h3>
                <div className="detail-stats">
                  <div className="detail-stat">
                    <div className="stat-label">Hack Count</div>
                    <div className="stat-value hack-value">{p.hackCount}</div>
                  </div>
                  <div className="detail-stat">
                    <div className="stat-label">Total Lost</div>
                    <div className="stat-value hack-value">{fmt(p.totalHackedAmount)}</div>
                  </div>
                  {p.lastHackDate && (
                    <div className="detail-stat">
                      <div className="stat-label">Last Hack</div>
                      <div className="stat-value">{new Date(p.lastHackDate).toLocaleDateString()}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Yield Pools */}
            {hasYields && (
              <div className="detail-section">
                <h3>Yield Opportunities</h3>
                <div className="detail-stats">
                  <div className="detail-stat">
                    <div className="stat-label">Active Pools</div>
                    <div className="stat-value">{p.yieldPoolCount}</div>
                  </div>
                  {p.topPoolApy !== null && (
                    <div className="detail-stat">
                      <div className="stat-label">Top Pool APY</div>
                      <div className="stat-value">{p.topPoolApy.toFixed(1)}%</div>
                    </div>
                  )}
                  {p.avgPoolApy !== null && (
                    <div className="detail-stat">
                      <div className="stat-label">Avg Pool APY</div>
                      <div className="stat-value">{p.avgPoolApy.toFixed(1)}%</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Token Emissions / Unlocks */}
            {p.hasEmissions && (
              <div className="detail-section">
                <h3>Token Emissions</h3>
                <div className="detail-stats">
                  <div className="detail-stat">
                    <div className="stat-label">Upcoming Unlocks</div>
                    <div className="stat-value">{p.upcomingUnlockCount}</div>
                  </div>
                  {p.nextUnlockDate && (
                    <div className="detail-stat">
                      <div className="stat-label">Next Unlock</div>
                      <div className="stat-value">{new Date(p.nextUnlockDate).toLocaleDateString()}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Holder Rights Analysis */}
            {p.isClassified ? (
              <div className="detail-rights">
                <h3>Holder Rights Analysis</h3>
                <div className="rights-score-display">
                  <div className="rights-score-number">{p.holderRightsScore}</div>
                  <div className="rights-score-label">Rights Score</div>
                </div>
                <div className="rights-list">
                  {p.holderRights.map((r) => {
                    const def = HOLDER_RIGHT_DEFINITIONS[r];
                    return (
                      <div key={r} className="right-detail">
                        <div className="right-name">{def.label}</div>
                        <div className="right-weight">Weight: {def.weight}/10</div>
                        <div className="right-desc">{def.description}</div>
                      </div>
                    );
                  })}
                </div>
                {p.holderRightsNotes && (
                  <div className="rights-notes">
                    <h4>Notes</h4>
                    <p>{p.holderRightsNotes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="detail-rights">
                <h3>Holder Rights</h3>
                <div className="unclassified-notice">
                  This protocol has not yet been classified for holder rights.
                  Financial data is sourced from DeFi Llama.
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════ HISTORY TAB ═══════ */}
        {detailTab === 'history' && (
          <div className="history-charts-grid">
            {/* Period Selector */}
            <div className="period-selector period-selector-sm">
              {(['30d', '90d', '1y', 'all'] as HistoryPeriod[]).map((per) => (
                <button
                  key={per}
                  className={`period-btn ${histPeriod === per ? 'period-active' : ''}`}
                  onClick={() => setHistPeriod(per)}
                >
                  {per.toUpperCase()}
                </button>
              ))}
            </div>

            {/* TVL Over Time */}
            {filteredTvl.length > 0 && (
              <div className="history-chart-card">
                <h4 className="history-chart-title">TVL Over Time</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={filteredTvl} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
                    <YAxis tickFormatter={(v) => fmt(v)} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
                    <Tooltip
                      labelFormatter={(v) => new Date((v as number) * 1000).toLocaleDateString()}
                      formatter={(value) => [fmt(value as number), 'TVL']}
                      contentStyle={tooltipStyle}
                    />
                    <Area type="monotone" dataKey="tvl" stroke="#1a1a1a" fill="#1a1a1a" fillOpacity={0.08} strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Chain TVL Breakdown (stacked) */}
            {stackedChainData.length > 0 && chainNames.length > 1 && (
              <div className="history-chart-card">
                <h4 className="history-chart-title">TVL by Chain</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={stackedChainData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
                    <YAxis tickFormatter={(v) => fmt(v)} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
                    <Tooltip
                      labelFormatter={(v) => new Date((v as number) * 1000).toLocaleDateString()}
                      formatter={(value, name) => [fmt(value as number), name as string]}
                      contentStyle={tooltipStyle}
                    />
                    {chainNames.map((chain, i) => (
                      <Area
                        key={chain}
                        type="monotone"
                        dataKey={chain}
                        stackId="1"
                        stroke={CHAIN_COLORS[i % CHAIN_COLORS.length]}
                        fill={CHAIN_COLORS[i % CHAIN_COLORS.length]}
                        fillOpacity={0.6 - i * 0.08}
                        strokeWidth={0.5}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
                <div className="chain-share-legend">
                  {chainNames.map((chain, i) => (
                    <div key={chain} className="chain-legend-item">
                      <div className="chain-legend-swatch" style={{ background: CHAIN_COLORS[i % CHAIN_COLORS.length] }} />
                      <span className="chain-legend-label">{chain}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Revenue vs Fees */}
            {revenueVsFees.length > 0 && (
              <div className="history-chart-card">
                <h4 className="history-chart-title">Revenue vs Fees</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={revenueVsFees} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
                    <YAxis tickFormatter={(v) => fmt(v)} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
                    <Tooltip
                      labelFormatter={(v) => new Date((v as number) * 1000).toLocaleDateString()}
                      formatter={(value, name) => [fmt(value as number), name === 'revenue' ? 'Revenue' : 'Fees']}
                      contentStyle={tooltipStyle}
                    />
                    <Area type="monotone" dataKey="fees" stroke="#ccc" fill="#e8e8e5" fillOpacity={0.5} strokeWidth={1} />
                    <Area type="monotone" dataKey="revenue" stroke="#1a1a1a" fill="#1a1a1a" fillOpacity={0.1} strokeWidth={1.5} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Holders Revenue */}
            {filteredHoldersRev.length > 0 && (
              <div className="history-chart-card">
                <h4 className="history-chart-title">Revenue to Token Holders</h4>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={filteredHoldersRev} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
                    <YAxis tickFormatter={(v) => fmt(v)} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
                    <Tooltip
                      labelFormatter={(v) => new Date((v as number) * 1000).toLocaleDateString()}
                      formatter={(value) => [fmt(value as number), 'Holders Revenue']}
                      contentStyle={tooltipStyle}
                    />
                    <Area type="monotone" dataKey="value" stroke="#2d6a2e" fill="#2d6a2e" fillOpacity={0.08} strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* DEX Volume */}
            {filteredDexVol.length > 0 && (
              <div className="history-chart-card">
                <h4 className="history-chart-title">DEX Volume</h4>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={filteredDexVol} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
                    <YAxis tickFormatter={(v) => fmt(v)} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
                    <Tooltip
                      labelFormatter={(v) => new Date((v as number) * 1000).toLocaleDateString()}
                      formatter={(value) => [fmt(value as number), 'Volume']}
                      contentStyle={tooltipStyle}
                    />
                    <Area type="monotone" dataKey="value" stroke="#555" fill="#555" fillOpacity={0.08} strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Price History */}
            <HistoricChart
              title={`${p.symbol} Price History`}
              data={p.priceHistory}
            />

            {/* Revenue Chart (daily) */}
            <RevenueChart
              title={`${p.name} Daily Revenue`}
              data={revenueHistory}
            />

            {filteredTvl.length === 0 && revenueVsFees.length === 0 && p.priceHistory.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: '#888', fontStyle: 'italic' }}>
                Historical data is loading or unavailable for this protocol.
              </div>
            )}
          </div>
        )}

        {/* ═══════ PEERS TAB ═══════ */}
        {detailTab === 'peers' && (
          <>
            {categoryPeers.length > 0 ? (
              <>
                <h3 style={{ fontSize: 17, marginBottom: 16 }}>
                  Category: {p.category} — TVL Comparison
                </h3>

                {/* Horizontal bar chart */}
                <div className="history-chart-card">
                  <ResponsiveContainer width="100%" height={Math.max(peersWithSelf.length * 36, 200)}>
                    <BarChart
                      data={peersWithSelf}
                      layout="vertical"
                      margin={{ top: 5, right: 30, bottom: 5, left: 120 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e5" horizontal={false} />
                      <XAxis type="number" tickFormatter={(v) => fmt(v)} tick={{ fill: '#888', fontSize: 11 }} stroke="#ccc" />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: '#1a1a1a', fontSize: 12 }}
                        stroke="#ccc"
                        width={110}
                      />
                      <Tooltip
                        formatter={(value) => [fmt(value as number), 'TVL']}
                        contentStyle={tooltipStyle}
                      />
                      <Bar dataKey="tvl" radius={[0, 3, 3, 0]}>
                        {peersWithSelf.map((pr) => (
                          <Cell
                            key={pr.slug}
                            fill={pr.slug === p.slug ? '#1a1a1a' : '#ccc'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Peers table */}
                <div className="peer-table-wrapper">
                  <table className="peer-table">
                    <thead>
                      <tr>
                        <th>Protocol</th>
                        <th className="num-cell">TVL</th>
                        <th className="num-cell">Revenue (30d)</th>
                        <th className="num-cell">Fees (30d)</th>
                        <th className="num-cell">MCap</th>
                        <th className="num-cell">TVL Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {peersWithSelf.map((pr) => (
                        <tr key={pr.slug} className={pr.slug === p.slug ? 'peer-row-highlight' : ''}>
                          <td style={{ fontWeight: pr.slug === p.slug ? 600 : 400 }}>{pr.name}</td>
                          <td className="num-cell">{fmt(pr.tvl)}</td>
                          <td className="num-cell">{pr.revenue30d !== null ? fmt(pr.revenue30d) : '—'}</td>
                          <td className="num-cell">{pr.fees30d !== null ? fmt(pr.fees30d) : '—'}</td>
                          <td className="num-cell">{pr.mcap !== null ? fmt(pr.mcap) : '—'}</td>
                          <td className="num-cell">{maxPeerTvl > 0 ? `${((pr.tvl / maxPeerTvl) * 100).toFixed(1)}%` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div style={{ padding: 32, textAlign: 'center', color: '#888', fontStyle: 'italic' }}>
                Peer data is loading or unavailable for this protocol's category.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
