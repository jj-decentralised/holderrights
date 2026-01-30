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

function pctFmt(n: number | null): string {
  if (n === null || n === undefined) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function pctClass(n: number | null): string {
  if (n === null) return '';
  return n >= 0 ? 'positive' : 'negative';
}

export function ProtocolDetail({ protocol, revenueHistory, onClose }: ProtocolDetailProps) {
  const p = protocol;
  const hasTreasury = p.treasuryTotal !== null && p.treasuryTotal > 0;
  const hasRaises = p.totalRaised !== null && p.totalRaised > 0;
  const hasHacks = p.hackCount > 0;
  const hasYields = p.yieldPoolCount > 0;
  const hasDexVolume = p.dexVolume24h !== null;
  const hasDerivatives = p.derivativesVolume24h !== null;
  const hasOptions = p.optionsVolume24h !== null;
  const hasPriceChanges = p.priceChange1d !== null || p.priceChange7d !== null || p.priceChange30d !== null;

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
