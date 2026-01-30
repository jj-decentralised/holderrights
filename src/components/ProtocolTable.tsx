import { useState } from 'react';
import { HOLDER_RIGHT_DEFINITIONS } from '../types';
import type { EnrichedProtocol, HolderRight } from '../types';

interface ProtocolTableProps {
  protocols: EnrichedProtocol[];
  onSelect: (slug: string) => void;
}

type SortKey = 'name' | 'tvl' | 'mcap' | 'holderRightsScore' | 'revenue30d' | 'mcapToRevenue' | 'fees30d';

function fmt(n: number | null): string {
  if (n === null || n === undefined) return '—';
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
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

export function ProtocolTable({ protocols, onSelect }: ProtocolTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('holderRightsScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categories = ['all', ...new Set(protocols.map((p) => p.category))];

  const sorted = [...protocols]
    .filter((p) => categoryFilter === 'all' || p.category === categoryFilter)
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
      <h2 className="section-title">Protocol Holder Rights Comparison</h2>
      <p className="section-desc">
        Each protocol is classified by the rights its token grants holders. Click a protocol to view detailed charts.
      </p>

      <div className="table-controls">
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
                  {p.holderRights.map((r) => rightsBadge(r))}
                </td>
                <td className="num-cell">{fmt(p.tvl)}</td>
                <td className="num-cell">{fmt(p.mcap)}</td>
                <td className="num-cell">{fmt(p.revenue30d)}</td>
                <td className="num-cell">{fmt(p.fees30d)}</td>
                <td className="num-cell">
                  {p.mcapToRevenue !== null ? `${p.mcapToRevenue.toFixed(1)}x` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
