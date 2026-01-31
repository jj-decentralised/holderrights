import { useState } from 'react';
import { useDefiData } from './hooks/useDefiData';
import { Header } from './components/Header';
import { ExecutiveSummary } from './components/ExecutiveSummary';
import { MarketPulse } from './components/MarketPulse';
import { ScatterPlotChart } from './components/ScatterPlot';
import { ProtocolTable } from './components/ProtocolTable';
import { HistoricChart } from './components/HistoricChart';
import { CategoryAnalysis } from './components/CategoryAnalysis';
import { CategoryDeepDive } from './components/CategoryDeepDive';
import { RightsBreakdown } from './components/RightsBreakdown';
import { AggregateCharts } from './components/AggregateCharts';
import { ProtocolDetail } from './components/ProtocolDetail';
import { Methodology } from './components/Methodology';
import { MarketStructure } from './components/MarketStructure';
import { RevenueEfficiency } from './components/RevenueEfficiency';
import { CapitalEfficiency } from './components/CapitalEfficiency';
import { HackAnalysis } from './components/HackAnalysis';
import { FundingLandscape } from './components/FundingLandscape';
import { ChainDominance } from './components/ChainDominance';
import { YieldLandscape } from './components/YieldLandscape';
import { EmissionsAnalysis } from './components/EmissionsAnalysis';
import { ValuationAnalysis } from './components/ValuationAnalysis';
import { TreasuryHealth } from './components/TreasuryHealth';
import { MomentumScanner } from './components/MomentumScanner';
import { RiskReturn } from './components/RiskReturn';
import { FundingPerformance } from './components/FundingPerformance';
import { GovernanceQuality } from './components/GovernanceQuality';
import { GovernanceFramework } from './components/GovernanceFramework';
import { GovernancePremium } from './components/GovernancePremium';
import { RightsEconomicImpact } from './components/RightsEconomicImpact';
import './App.css';

type Tab = 'overview' | 'protocols' | 'chains' | 'risk' | 'governance';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Market Overview', icon: '\u25C8' },
  { key: 'protocols', label: 'Protocol Intelligence', icon: '\u25A0' },
  { key: 'chains', label: 'Chain & Ecosystem', icon: '\u25CB' },
  { key: 'risk', label: 'Risk & Opportunity', icon: '\u25B2' },
  { key: 'governance', label: 'Governance & Rights', icon: '\u2606' },
];

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const {
    protocols,
    correlationPoints,
    totalRevenue24h,
    totalFees24h,
    revenueByCategory,
    avgScoreByCategory,
    categoryStats,
    rightTypeStats,
    historicalTvl,
    aggregateRevenueChart,
    aggregateFeesChart,
    aggregateDexVolumeChart,
    loading,
    error,
    selectedProtocol,
    selectProtocol,
    revenueHistory,
    hasProData,
    analytics,
    pulse,
  } = useDefiData();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <div className="loading-text">Loading DeFi protocol data...</div>
        <div className="loading-subtext">Fetching protocols, revenue, fees, and price history from DeFi Llama</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>Error Loading Data</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  const featured = protocols
    .filter((p) => p.priceHistory.length > 0)
    .sort((a, b) => (b.mcap || 0) - (a.mcap || 0))
    .slice(0, 4);

  return (
    <div className="app">
      <Header
        totalRevenue24h={totalRevenue24h}
        totalFees24h={totalFees24h}
        protocolCount={protocols.length}
        analytics={analytics}
      />

      {/* Tab Navigation */}
      <nav className="tab-nav">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB 1: MARKET OVERVIEW                                     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* Market Pulse — hourly monitoring */}
          <section className="section">
            <MarketPulse pulse={pulse} />
          </section>

          {/* Aggregate DeFi Market Charts */}
          <section className="section">
            <AggregateCharts
              historicalTvl={historicalTvl}
              aggregateRevenue={aggregateRevenueChart}
              aggregateFees={aggregateFeesChart}
              aggregateDexVolume={aggregateDexVolumeChart}
            />
          </section>

          {/* Key Findings */}
          {analytics && (
            <section className="section">
              <ExecutiveSummary
                analytics={analytics}
                totalRevenue24h={totalRevenue24h}
                totalFees24h={totalFees24h}
                tvlHistory={historicalTvl}
                revenueChart={aggregateRevenueChart}
                feesChart={aggregateFeesChart}
                dexVolumeChart={aggregateDexVolumeChart}
              />
            </section>
          )}

          {/* Market Structure */}
          {analytics && (
            <section className="section">
              <MarketStructure analytics={analytics} />
            </section>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB 2: PROTOCOL INTELLIGENCE                               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'protocols' && (
        <>
          {/* Revenue Efficiency */}
          {analytics && (
            <section className="section">
              <RevenueEfficiency analytics={analytics} />
            </section>
          )}

          {/* Capital Efficiency */}
          {analytics && (
            <section className="section">
              <CapitalEfficiency analytics={analytics} />
            </section>
          )}

          {/* Valuation Analysis */}
          {analytics && (
            <section className="section">
              <ValuationAnalysis analytics={analytics} />
            </section>
          )}

          {/* Treasury Health */}
          {analytics && (
            <section className="section">
              <TreasuryHealth analytics={analytics} protocols={protocols} />
            </section>
          )}

          {/* Momentum Scanner */}
          <section className="section">
            <MomentumScanner protocols={protocols} />
          </section>

          {/* Protocol Table */}
          <section className="section">
            <ProtocolTable protocols={protocols} onSelect={selectProtocol} hasProData={hasProData} />
          </section>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB 3: CHAIN & ECOSYSTEM                                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'chains' && (
        <>
          {/* Chain Dominance */}
          {analytics && (
            <section className="section">
              <ChainDominance analytics={analytics} />
            </section>
          )}

          {/* Featured Price Charts */}
          {featured.length > 0 && (
            <section className="section">
              <h2 className="section-title">Price History — Top DeFi Tokens</h2>
              <p className="section-desc">
                Historic price performance for the largest DeFi tokens by market cap. Click any protocol in the table below
                to see its individual charts.
              </p>
              <div className="chart-grid">
                {featured.map((p) => (
                  <HistoricChart
                    key={p.slug}
                    title={`${p.name} (${p.symbol})`}
                    data={p.priceHistory}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Category Analysis */}
          <section className="section">
            <CategoryAnalysis
              revenueByCategory={revenueByCategory}
              avgScoreByCategory={avgScoreByCategory}
            />
          </section>

          {/* Category Deep Dive */}
          <section className="section">
            <CategoryDeepDive categoryStats={categoryStats} />
          </section>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB 4: RISK & OPPORTUNITY                                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'risk' && (
        <>
          {/* Security & Hack Analysis */}
          {analytics && (
            <section className="section">
              <HackAnalysis analytics={analytics} />
            </section>
          )}

          {/* Risk / Return */}
          <section className="section">
            <RiskReturn protocols={protocols} />
          </section>

          {/* Yield Landscape */}
          {analytics && (
            <section className="section">
              <YieldLandscape analytics={analytics} />
            </section>
          )}

          {/* Token Emissions */}
          {analytics && (
            <section className="section">
              <EmissionsAnalysis analytics={analytics} />
            </section>
          )}

          {/* Funding Landscape */}
          {analytics && (
            <section className="section">
              <FundingLandscape analytics={analytics} />
            </section>
          )}

          {/* Funding Performance */}
          <section className="section">
            <FundingPerformance protocols={protocols} />
          </section>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB 5: GOVERNANCE & RIGHTS                                 */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'governance' && (
        <>
          {/* Governance Quality Framework (Outerlands 2-axis model) */}
          <section className="section">
            <GovernanceFramework protocols={protocols} />
          </section>

          {/* The Governance Premium — tier-based valuation comparison */}
          <section className="section">
            <GovernancePremium protocols={protocols} />
          </section>

          {/* Governance Quality — score vs TVL/revenue scatter */}
          <section className="section">
            <GovernanceQuality correlationPoints={correlationPoints} />
          </section>

          {/* Rights Economic Impact — per-right premium analysis */}
          <section className="section">
            <RightsEconomicImpact rightTypeStats={rightTypeStats} protocols={protocols} />
          </section>

          {/* Holder Rights vs Performance */}
          <section className="section">
            <h2 className="section-title">Holder Rights vs Performance</h2>
            <p className="section-desc">
              Do protocols with stronger holder rights generate more revenue or command higher valuations?
              Each dot represents a classified DeFi protocol.
            </p>
            <div className="chart-grid">
              <ScatterPlotChart
                data={correlationPoints}
                xKey="holderRightsScore"
                yKey="revenue30d"
                title="Holder Rights Score vs 30d Revenue"
                yLabel="Revenue (30d)"
              />
              <ScatterPlotChart
                data={correlationPoints}
                xKey="holderRightsScore"
                yKey="mcap"
                title="Holder Rights Score vs Market Cap"
                yLabel="Market Cap"
              />
            </div>
            <div className="chart-grid" style={{ marginTop: 24 }}>
              <ScatterPlotChart
                data={correlationPoints}
                xKey="holderRightsScore"
                yKey="mcapToRevenue"
                title="Holder Rights Score vs MC/Revenue Multiple"
                yLabel="MC/Revenue (annualized)"
                yFormatter={(v) => `${v.toFixed(0)}x`}
              />
              <ScatterPlotChart
                data={correlationPoints.filter((p) => p.priceChange30d !== null)}
                xKey="holderRightsScore"
                yKey="priceChange30d"
                title="Holder Rights Score vs 30d Price Change"
                yLabel="Price Change (%)"
                yFormatter={(v) => `${v.toFixed(1)}%`}
              />
            </div>
          </section>

          {/* Holder Rights Distribution */}
          <section className="section">
            <RightsBreakdown
              rightTypeStats={rightTypeStats}
              totalProtocols={protocols.length}
            />
          </section>

          {/* Methodology */}
          <section className="section">
            <Methodology />
          </section>
        </>
      )}

      {/* Protocol Detail Modal */}
      {selectedProtocol && (
        <ProtocolDetail
          protocol={selectedProtocol}
          revenueHistory={revenueHistory}
          onClose={() => selectProtocol(null)}
        />
      )}

      <footer className="footer">
        <p>
          Data sourced from <a href="https://defillama.com" target="_blank" rel="noopener noreferrer">DeFi Llama</a>.
          Holder rights classifications are manually researched.
          This is not financial advice.
        </p>
      </footer>
    </div>
  );
}

export default App;
