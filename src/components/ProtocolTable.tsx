import { useState } from 'react';
import { HOLDER_RIGHT_DEFINITIONS } from '../types';
import type { EnrichedProtocol, HolderRight } from '../types';

interface ProtocolTableProps {
  protocols: EnrichedProtocol[];
  onSelect: (slug: string) => void;
  hasProData: boolean;
}

type SortKey = 'name' | 'tvl' | 'mcap' | 'holderRightsScore' | 'revenue30d' | 'mcapToRevenue' | 'fees30d'
  | 'treasuryTotal' | 'totalRaised' | 'hackCount' | 'dexVolume24h' | 'topPoolApy'
  | 'priceChange1d' | 'priceChange7d' | 'priceChange30d' | 'tvlChange7d' | 'chainCount';

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

function rightsBadge(right: HolderRight) {
  const def = HOLDER_RIGHT_DEFINITIONS[right];
  return (
    <span key={right} className="rights-badge" title={def.description}>
      {def.label}
    </span>
  );
}

function scoreBar(score: number) {
  const maxScore = 35; // theoretical max
  const pct = Math.min((score / maxScore) * 100, 100);
  return (
    <div className="score-bar-container">
      <div className="score-bar" style={{ width: `${pct}%` }} />
      <span className="score-value">{score}</span>
    </div>
  );
}

type DataFilter = 'all' | 'classified' | 'with-revenue' | 'with-fees';

export function ProtocolTable({ protocols, onSelect, hasProData }: ProtocolTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('tvl');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dataFilter, setDataFilter] = useState<DataFilter>('all');

  const categories = ['all', ...new Set(protocols.map((p) => p.category).filter(Boolean).sort())];

  const classifiedCount = protocols.filter((p) => p.isClassified).length;
  const totalCount = protocols.length;

  const sorted = [...protocols]
    .filter((p) => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (dataFilter === 'classified' && !p.isClassified) return false;
      if (dataFilter === 'with-revenue' && !p.revenue30d) return false;
      if (dataFilter === 'with-fees' && !p.fees30d) return false;
      return true;
    })
    .sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      if (sortKey === 'name') {
        aVal = a.name;
        bVal = b.name;
        return sortDir === 'asc'
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal as string);
      }

      aVal = (a[sortKey] as number) || 0;
      bVal = (b[sortKey] as number) || 0;
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function sortIndicator(key: SortKey) {
    if (key !== sortKey) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  }

  return (
    <div className="table-section">
      <h2 className="section-title">Protocol Data Explorer</h2>
      <p className="section-desc">
        {classifiedCount} protocols have manual holder rights classifications. All {totalCount} protocols shown
        include financial data from DeFi Llama. Click a protocol to view detailed charts.
        {hasProData && ' Treasury, funding, emissions, and hack data sourced from DeFi Llama Pro API.'}
      </p>

      <div className="table-controls">
        <label>
          Show:
          <select value={dataFilter} onChange={(e) => setDataFilter(e.target.value as DataFilter)}>
            <option value="all">All Protocols ({totalCount})</option>
            <option value="classified">Classified Only ({classifiedCount})</option>
            <option value="with-revenue">With Revenue</option>
            <option value="with-fees">With Fees</option>
          </select>
        </label>
        <label>
          Category:
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
            ))}
          </select>
        </label>
        <span className="table-count">{sorted.length} protocols</span>
      </div>

      <div className="table-wrapper">
        <table className="protocol-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')}>Protocol{sortIndicator('name')}</th>
              <th>Category</th>
              <th onClick={() => handleSort('holderRightsScore')}>Rights Score{sortIndicator('holderRightsScore')}</th>
              <th>Holder Rights</th>
              <th onClick={() => handleSort('tvl')}>TVL{sortIndicator('tvl')}</th>
              <th onClick={() => handleSort('mcap')}>Market Cap{sortIndicator('mcap')}</th>
              <th onClick={() => handleSort('revenue30d')}>Revenue (30d){sortIndicator('revenue30d')}</th>
              <th onClick={() => handleSort('fees30d')}>Fees (30d){sortIndicator('fees30d')}</th>
              <th onClick={() => handleSort('mcapToRevenue')}>MC/Rev{sortIndicator('mcapToRevenue')}</th>
              <th onClick={() => handleSort('priceChange1d')}>Price 1d{sortIndicator('priceChange1d')}</th>
              <th onClick={() => handleSort('priceChange7d')}>Price 7d{sortIndicator('priceChange7d')}</th>
              <th onClick={() => handleSort('priceChange30d')}>Price 30d{sortIndicator('priceChange30d')}</th>
              <th onClick={() => handleSort('tvlChange7d')}>TVL 7d{sortIndicator('tvlChange7d')}</th>
              <th onClick={() => handleSort('chainCount')}>Chains{sortIndicator('chainCount')}</th>
              {hasProData && (
                <>
                  <th onClick={() => handleSort('treasuryTotal')}>Treasury{sortIndicator('treasuryTotal')}</th>
                  <th onClick={() => handleSort('totalRaised')}>Raised{sortIndicator('totalRaised')}</th>
                  <th onClick={() => handleSort('hackCount')}>Hacks{sortIndicator('hackCount')}</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.slug} onClick={() => onSelect(p.slug)} className="protocol-row">
                <td className="name-cell">
                  {p.logo && <img src={p.logo} alt="" className="protocol-logo" />}
                  <span>{p.name}</span>
                  <span className="symbol">{p.symbol}</span>
                </td>
                <td><span className="category-badge">{p.category}</span></td>
                <td>{scoreBar(p.holderRightsScore)}</td>
                <td className="rights-cell">
                  {p.isClassified
                    ? p.holderRights.map((r) => rightsBadge(r))
                    : <span className="unclassified-badge">Unclassified</span>
                  }
                </td>
                <td className="num-cell">{fmt(p.tvl)}</td>
                <td className="num-cell">{fmt(p.mcap)}</td>
                <td className="num-cell">{fmt(p.revenue30d)}</td>
                <td className="num-cell">{fmt(p.fees30d)}</td>
                <td className="num-cell">
                  {p.mcapToRevenue !== null ? `${p.mcapToRevenue.toFixed(1)}x` : '—'}
                </td>
                <td className={`num-cell ${pctClass(p.priceChange1d)}`}>{pctFmt(p.priceChange1d)}</td>
                <td className={`num-cell ${pctClass(p.priceChange7d)}`}>{pctFmt(p.priceChange7d)}</td>
                <td className={`num-cell ${pctClass(p.priceChange30d)}`}>{pctFmt(p.priceChange30d)}</td>
                <td className={`num-cell ${pctClass(p.tvlChange7d)}`}>{pctFmt(p.tvlChange7d)}</td>
                <td className="num-cell">{p.chainCount > 0 ? p.chainCount : '—'}</td>
                {hasProData && (
                  <>
                    <td className="num-cell">{fmt(p.treasuryTotal)}</td>
                    <td className="num-cell">{fmt(p.totalRaised)}</td>
                    <td className="num-cell">
                      {p.hackCount > 0 ? (
                        <span className="hack-indicator" title={`${p.hackCount} hack(s), ${fmt(p.totalHackedAmount)} lost`}>
                          {p.hackCount}
                        </span>
                      ) : '—'}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
