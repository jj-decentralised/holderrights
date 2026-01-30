import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import type { ServerAnalytics } from '../hooks/useDefiData';

function fmt(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function formatDateFull(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function tickInterval(len: number): number {
  if (len <= 14) return 1;
  if (len <= 60) return Math.floor(len / 6);
  return Math.floor(len / 8);
}

type View = 'bars' | 'share';
type Period = '30d' | '90d' | '1y' | '3y' | '6y' | 'custom';

const PERIOD_OPTIONS: { key: Period; label: string; days: number }[] = [
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
  { key: '1y', label: '1Y', days: 365 },
  { key: '3y', label: '3Y', days: 1095 },
  { key: '6y', label: '6Y', days: 2190 },
  { key: 'custom', label: 'Custom', days: 0 },
];

// Muted palette for stacked areas — high contrast, distinct
const CHAIN_COLORS: Record<string, string> = {
  Ethereum: '#1a1a1a',
  Bitcoin: '#f7931a',
  Solana: '#9945ff',
  Tron: '#e33',
  BSC: '#f0b90b',
  Arbitrum: '#28a0f0',
  Base: '#0052ff',
  Polygon: '#8247e5',
  Avalanche: '#e84142',
  Sui: '#4da2ff',
  Optimism: '#ff0420',
  'Hyperliquid L1': '#50e3c2',
  Others: '#bbb',
};

function getColor(chain: string): string {
  return CHAIN_COLORS[chain] || '#999';
}

interface ChainHistoryData {
  chains: string[];
  dates: number[];
  data: Record<string, { date: number; tvl: number }[]>;
}

interface Props {
  analytics: ServerAnalytics;
}

const tooltipStyle = {
  background: 'rgba(255,255,255,0.96)',
  border: '1px solid #e0e0dd',
  borderRadius: '6px',
  fontSize: 13,
  color: '#333',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  padding: '8px 12px',
};

export function ChainDominance({ analytics }: Props) {
  const data = analytics.chainAnalysis;
  const [view, setView] = useState<View>('bars');
  const [period, setPeriod] = useState<Period>('6y');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [chainHistory, setChainHistory] = useState<ChainHistoryData | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch chain history when switching to share view
  useEffect(() => {
    if (view !== 'share' || chainHistory) return;
    setLoading(true);
    fetch('/api/chain-history')
      .then(r => r.json())
      .then(d => { setChainHistory(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [view, chainHistory]);

  // Build % share time series from pre-aligned weekly data
  const shareData = useMemo(() => {
    if (!chainHistory || !chainHistory.dates) return [];

    const { chains, dates, data: histData } = chainHistory;

    // Filter dates by period
    let filteredIndices: number[] = [];
    if (period === 'custom') {
      const fromTs = customFrom ? new Date(customFrom).getTime() / 1000 : 0;
      const toTs = customTo ? new Date(customTo).getTime() / 1000 : Infinity;
      filteredIndices = dates.map((_, i) => i).filter(i => dates[i] >= fromTs && dates[i] <= toTs);
    } else {
      const opt = PERIOD_OPTIONS.find(p => p.key === period);
      if (opt && opt.days > 0 && dates.length > 0) {
        const cutoff = dates[dates.length - 1] - opt.days * 86400;
        filteredIndices = dates.map((_, i) => i).filter(i => dates[i] >= cutoff);
      } else {
        filteredIndices = dates.map((_, i) => i);
      }
    }

    // Build rows: all chains are aligned to the same date array
    return filteredIndices.map(idx => {
      const date = dates[idx];
      const row: Record<string, number> = { date };

      // Sum total TVL across all chains at this index
      let total = 0;
      for (const chain of chains) {
        const arr = histData[chain];
        const tvl = arr && arr[idx] ? arr[idx].tvl : 0;
        total += tvl;
      }

      // Compute % share
      if (total > 0) {
        let known = 0;
        for (const chain of chains) {
          const arr = histData[chain];
          const tvl = arr && arr[idx] ? arr[idx].tvl : 0;
          const share = (tvl / total) * 100;
          row[chain] = share;
          known += share;
        }
        row['Others'] = Math.max(0, 100 - known);
      }

      return row;
    });
  }, [chainHistory, period, customFrom, customTo]);

  const shareChains = useMemo(() => {
    if (!chainHistory) return [];
    return [...chainHistory.chains, 'Others'];
  }, [chainHistory]);

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p);
  }, []);

  if (!Array.isArray(data) || data.length === 0) return null;

  const chartData = data.slice(0, 15).map((c: Record<string, unknown>) => ({
    chain: c.chain as string,
    totalTvl: c.totalTvl as number,
    totalRevenue30d: c.totalRevenue30d as number,
    protocolCount: c.protocolCount as number,
  }));

  return (
    <div className="analytics-section">
      <div className="chain-dom-header">
        <div>
          <h2 className="section-title">Chain Dominance</h2>
          <p className="section-desc">
            TVL and revenue distribution across blockchain networks.
            {view === 'share' && ' Showing TVL market share (%) over time for the top chains.'}
          </p>
        </div>
        <div className="view-toggle">
          <button
            className={`view-toggle-btn ${view === 'bars' ? 'view-active' : ''}`}
            onClick={() => setView('bars')}
          >
            Current
          </button>
          <button
            className={`view-toggle-btn ${view === 'share' ? 'view-active' : ''}`}
            onClick={() => setView('share')}
          >
            % Share Over Time
          </button>
        </div>
      </div>

      {/* ── Bar charts (current snapshot) ── */}
      {view === 'bars' && (
        <>
          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-card-title">TVL by Chain — Top 15</h3>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ececea" vertical={false} />
                  <XAxis type="number" tickFormatter={fmt} tick={{ fill: '#999', fontSize: 11 }} stroke="none" />
                  <YAxis type="category" dataKey="chain" tick={{ fill: '#1a1a1a', fontSize: 12 }} stroke="none" width={70} />
                  <Tooltip
                    formatter={(value) => [fmt(Number(value)), 'TVL']}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="totalTvl" fill="#1a1a1a" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-card-title">Revenue (30d) by Chain — Top 15</h3>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ececea" vertical={false} />
                  <XAxis type="number" tickFormatter={fmt} tick={{ fill: '#999', fontSize: 11 }} stroke="none" />
                  <YAxis type="category" dataKey="chain" tick={{ fill: '#1a1a1a', fontSize: 12 }} stroke="none" width={70} />
                  <Tooltip
                    formatter={(value) => [fmt(Number(value)), 'Revenue (30d)']}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="totalRevenue30d" fill="#888" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* ── % Share over time (stacked area) ── */}
      {view === 'share' && (
        <div className="chain-share-section">
          <div className="chain-share-controls">
            <div className="period-selector">
              {PERIOD_OPTIONS.map(p => (
                <button
                  key={p.key}
                  className={`period-btn ${period === p.key ? 'period-active' : ''}`}
                  onClick={() => handlePeriodChange(p.key)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {period === 'custom' && (
              <div className="custom-date-range">
                <label className="custom-date-label">
                  From
                  <input
                    type="date"
                    className="custom-date-input"
                    value={customFrom}
                    onChange={e => setCustomFrom(e.target.value)}
                  />
                </label>
                <label className="custom-date-label">
                  To
                  <input
                    type="date"
                    className="custom-date-input"
                    value={customTo}
                    onChange={e => setCustomTo(e.target.value)}
                  />
                </label>
              </div>
            )}
          </div>

          {loading && (
            <div className="chain-share-loading">Loading chain history data...</div>
          )}

          {!loading && shareData.length > 0 && (
            <>
              <div className="chart-card chart-card-full">
                <h3 className="chart-card-title">TVL Market Share by Chain (%)</h3>
                <ResponsiveContainer width="100%" height={440}>
                  <AreaChart data={shareData} margin={{ top: 8, right: 16, bottom: 20, left: 48 }} stackOffset="none">
                    <CartesianGrid strokeDasharray="3 3" stroke="#ececea" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fill: '#999', fontSize: 11, fontFamily: 'system-ui' }}
                      stroke="none"
                      tickLine={false}
                      interval={tickInterval(shareData.length)}
                    />
                    <YAxis
                      tickFormatter={v => `${v.toFixed(0)}%`}
                      tick={{ fill: '#999', fontSize: 11, fontFamily: 'system-ui' }}
                      stroke="none"
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                      width={48}
                    />
                    <Tooltip
                      formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name as string]}
                      labelFormatter={(ts) => formatDateFull(ts as number)}
                      contentStyle={tooltipStyle}
                      itemSorter={(item) => -(item.value as number)}
                    />
                    {shareChains.map(chain => (
                      <Area
                        key={chain}
                        type="monotone"
                        dataKey={chain}
                        stackId="share"
                        stroke={getColor(chain)}
                        fill={getColor(chain)}
                        fillOpacity={0.8}
                        strokeWidth={0.5}
                        dot={false}
                        animationDuration={600}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="chain-share-legend">
                {shareChains.map(chain => (
                  <div key={chain} className="chain-legend-item">
                    <span className="chain-legend-swatch" style={{ background: getColor(chain) }} />
                    <span className="chain-legend-label">{chain}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {!loading && shareData.length === 0 && chainHistory && (
            <div className="chain-share-loading">No data for the selected period.</div>
          )}
        </div>
      )}

      {/* Table — always visible */}
      <div className="analytics-table-wrapper" style={{ marginTop: 24 }}>
        <table className="category-summary-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Chain</th>
              <th style={{ textAlign: 'right' }}>Protocols</th>
              <th style={{ textAlign: 'right' }}>TVL</th>
              <th style={{ textAlign: 'right' }}>Revenue (30d)</th>
              <th style={{ textAlign: 'right' }}>Fees (30d)</th>
              <th style={{ textAlign: 'right' }}>Rev/TVL</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c: Record<string, unknown>, i: number) => (
              <tr key={c.chain as string}>
                <td style={{ color: '#888' }}>{i + 1}</td>
                <td className="cat-name-cell">{c.chain as string}</td>
                <td className="num-cell">{c.protocolCount as number}</td>
                <td className="num-cell">{fmt(c.totalTvl as number)}</td>
                <td className="num-cell">{(c.totalRevenue30d as number) > 0 ? fmt(c.totalRevenue30d as number) : '—'}</td>
                <td className="num-cell">{(c.totalFees30d as number) > 0 ? fmt(c.totalFees30d as number) : '—'}</td>
                <td className="num-cell">
                  {(c.totalTvl as number) > 0 && (c.totalRevenue30d as number) > 0
                    ? `${(((c.totalRevenue30d as number) / (c.totalTvl as number)) * 100).toFixed(3)}%`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
