import { HOLDER_RIGHT_DEFINITIONS } from '../types';
import type { EnrichedProtocol } from '../types';
import { HistoricChart, RevenueChart } from './HistoricChart';

interface ProtocolDetailProps {
  protocol: EnrichedProtocol;
  revenueHistory: { date: number; value: number }[];
  onClose: () => void;
}

function fmt(n: number | null): string {
  if (n === null || n === undefined) return '—';
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function ProtocolDetail({ protocol, revenueHistory, onClose }: ProtocolDetailProps) {
  const p = protocol;

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
        </div>

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
          <div className="rights-notes">
            <h4>Notes</h4>
            <p>{p.holderRightsNotes}</p>
          </div>
        </div>

        <div className="detail-charts">
          <HistoricChart
            title={`${p.symbol} Price History`}
            data={p.priceHistory}
          />
          <RevenueChart
            title={`${p.name} Daily Revenue`}
            data={revenueHistory}
          />
        </div>
      </div>
    </div>
  );
}
