import type { ServerAnalytics } from '../hooks/useDefiData';

function fmt(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

interface Props {
  analytics: ServerAnalytics;
}

export function EmissionsAnalysis({ analytics }: Props) {
  const emissions = analytics.emissionsAnalysis;
  if (!emissions || emissions.totalWithEmissions === 0) return null;

  return (
    <div className="analytics-section">
      <h2 className="section-title">Token Emissions & Unlocks</h2>
      <p className="section-desc">
        Upcoming token unlock events that may create sell pressure.
        {' '}{emissions.totalWithEmissions} protocols have emissions data,
        with {emissions.upcomingUnlocks} upcoming unlock events.
      </p>

      <div className="market-stats-grid">
        <div className="stat-card">
          <div className="stat-label">Protocols with Emissions</div>
          <div className="stat-value">{emissions.totalWithEmissions}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Upcoming Unlocks</div>
          <div className="stat-value">{emissions.upcomingUnlocks}</div>
        </div>
      </div>

      {Array.isArray(emissions.protocolsWithUpcoming) && emissions.protocolsWithUpcoming.length > 0 && (
        <div className="analytics-table-wrapper" style={{ marginTop: 24 }}>
          <h3 className="analytics-subtitle">Protocols with Most Upcoming Unlocks</h3>
          <table className="category-summary-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Protocol</th>
                <th style={{ textAlign: 'right' }}>Upcoming Unlocks</th>
                <th style={{ textAlign: 'right' }}>Next Unlock</th>
                <th style={{ textAlign: 'right' }}>MCap</th>
                <th style={{ textAlign: 'right' }}>TVL</th>
              </tr>
            </thead>
            <tbody>
              {emissions.protocolsWithUpcoming.map((p: Record<string, unknown>, i: number) => (
                <tr key={p.slug as string}>
                  <td style={{ color: '#888' }}>{i + 1}</td>
                  <td className="cat-name-cell">{p.name as string}</td>
                  <td className="num-cell">{p.unlockCount as number}</td>
                  <td className="num-cell">{p.nextUnlock ? new Date(p.nextUnlock as string).toLocaleDateString() : '—'}</td>
                  <td className="num-cell">{p.mcap ? fmt(p.mcap as number) : '—'}</td>
                  <td className="num-cell">{fmt(p.tvl as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
