import { useState, useMemo } from 'react';
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
import { TabSectionGroup } from './components/TabSectionGroup';
import { TabSummaryBar } from './components/TabSummaryBar';
import { DiscoveryDashboard } from './components/DiscoveryDashboard';
import './App.css';

type Tab = 'overview' | 'protocols' | 'chains' | 'risk' | 'governance';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Market Overview', icon: '\u25C8' },
  { key: 'protocols', label: 'Protocol Intelligence', icon: '\u25A0' },
  { key: 'chains', label: 'Chain & Ecosystem', icon: '\u25CB' },
  { key: 'risk', label: 'Risk & Opportunity', icon: '\u25B2' },
  { key: 'governance', label: 'Governance & Rights', icon: '\u2606' },
];

function fmtCompact(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

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
    feeHistory,
    hasProData,
    analytics,
    pulse,
    protocolTvlHistory,
    protocolChainTvls,
    holdersRevenueHistory,
    dexVolumeHistory,
    categoryPeers,
  } = useDefiData();

  /* ── Tab summary metrics (memoized) ── */
  const overviewMetrics = useMemo(() => {
    const totalTvl = protocols.reduce((s, p) => s + p.tvl, 0);
    return [
      { label: 'Total TVL', value: fmtCompact(totalTvl) },
      { label: '24h Revenue', value: fmtCompact(totalRevenue24h) },
      { label: '24h Fees', value: fmtCompact(totalFees24h) },
      { label: 'Protocols', value: String(protocols.length) },
    ];
  }, [protocols, totalRevenue24h, totalFees24h]);

  const protocolMetrics = useMemo(() => {
    const classified = protocols.filter((p) => p.isClassified);
    const withRevenue = protocols.filter((p) => (p.revenue30d ?? 0) > 0 && (p.mcap ?? 0) > 0);
    const peRatios = withRevenue.map((p) => (p.mcap! / (p.revenue30d! * 12)));
    const medianPE = peRatios.length > 0
      ? [...peRatios].sort((a, b) => a - b)[Math.floor(peRatios.length / 2)]
      : 0;
    const topRevProto = [...protocols].sort((a, b) => (b.revenue30d ?? 0) - (a.revenue30d ?? 0))[0];
    return [
      { label: 'Median P/E', value: medianPE > 0 ? `${medianPE.toFixed(1)}x` : '—' },
      { label: 'Top Revenue', value: topRevProto?.name ?? '—', sub: topRevProto?.revenue30d ? fmtCompact(topRevProto.revenue30d) + '/30d' : undefined },
      { label: 'Classified', value: String(classified.length), sub: `of ${protocols.length} total` },
    ];
  }, [protocols]);

  const chainMetrics = useMemo(() => {
    const chains = new Set(protocols.flatMap((p) => p.chains));
    const multiChain = protocols.filter((p) => p.chainCount > 1).length;
    const multiPct = protocols.length > 0 ? ((multiChain / protocols.length) * 100).toFixed(0) : '0';
    return [
      { label: 'Chains Tracked', value: String(chains.size) },
      { label: 'Categories', value: String(categoryStats.length) },
      { label: 'Multi-chain', value: `${multiPct}%`, sub: `${multiChain} protocols` },
    ];
  }, [protocols, categoryStats]);

  const riskMetrics = useMemo(() => {
    const hackedCount = protocols.filter((p) => p.hackCount > 0).length;
    const totalHacked = protocols.reduce((s, p) => s + p.totalHackedAmount, 0);
    const funded = protocols.filter((p) => (p.totalRaised ?? 0) > 0).length;
    return [
      { label: 'Hacked Protocols', value: String(hackedCount), sub: totalHacked > 0 ? fmtCompact(totalHacked) + ' total lost' : undefined },
      { label: 'Funded Protocols', value: String(funded) },
      { label: 'With Yields', value: String(protocols.filter((p) => p.yieldPoolCount > 0).length) },
    ];
  }, [protocols]);

  const govMetrics = useMemo(() => {
    const classified = protocols.filter((p) => p.isClassified);
    const avgScore = classified.length > 0
      ? (classified.reduce((s, p) => s + p.holderRightsScore, 0) / classified.length).toFixed(1)
      : '—';
    const revShareCount = classified.filter((p) => p.holderRights.includes('revenue_share')).length;
    const revSharePct = classified.length > 0 ? ((revShareCount / classified.length) * 100).toFixed(0) : '0';
    return [
      { label: 'Avg Rights Score', value: avgScore },
      { label: 'Classified', value: String(classified.length) },
      { label: 'Revenue Share', value: `${revSharePct}%`, sub: `${revShareCount} protocols` },
    ];
  }, [protocols]);

  const selectedValuation = useMemo(() => {
    if (!selectedProtocol || !analytics?.valuationDiscovery?.rankings) return null;
    return analytics.valuationDiscovery.rankings.find(
      (r: { slug: string }) => r.slug === selectedProtocol.slug
    ) ?? null;
  }, [selectedProtocol, analytics]);

  const selectedCategoryBenchmark = useMemo(() => {
    if (!selectedProtocol || !analytics?.valuationDiscovery?.categoryBenchmarks) return null;
    return analytics.valuationDiscovery.categoryBenchmarks[selectedProtocol.category] ?? null;
  }, [selectedProtocol, analytics]);

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
          <TabSummaryBar metrics={overviewMetrics} />

          <section className="section">
            <MarketPulse pulse={pulse} />
          </section>

          <section className="section">
            <AggregateCharts
              historicalTvl={historicalTvl}
              aggregateRevenue={aggregateRevenueChart}
              aggregateFees={aggregateFeesChart}
              aggregateDexVolume={aggregateDexVolumeChart}
            />
          </section>

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
          <TabSummaryBar metrics={protocolMetrics} />

          <TabSectionGroup
            title="Undervaluation Discovery"
            description="9-dimension composite scoring engine identifying potentially undervalued protocols across EV/Revenue, momentum, real yield, security, and more."
            first
          >
            {analytics && (
              <section className="section">
                <DiscoveryDashboard analytics={analytics} protocols={protocols} onSelectProtocol={selectProtocol} />
              </section>
            )}
          </TabSectionGroup>

          <TabSectionGroup
            title="Revenue & Capital Efficiency"
            description="How efficiently do protocols convert TVL into revenue, and how do their capital structures compare?"
            first
          >
            {analytics && (
              <section className="section">
                <RevenueEfficiency analytics={analytics} />
              </section>
            )}
            {analytics && (
              <section className="section">
                <CapitalEfficiency analytics={analytics} />
              </section>
            )}
          </TabSectionGroup>

          <TabSectionGroup
            title="Valuation & Treasury"
            description="Protocol valuation multiples and treasury composition analysis."
          >
            {analytics && (
              <section className="section">
                <ValuationAnalysis analytics={analytics} />
              </section>
            )}
            {analytics && (
              <section className="section">
                <TreasuryHealth analytics={analytics} protocols={protocols} />
              </section>
            )}
          </TabSectionGroup>

          <TabSectionGroup
            title="Momentum & Protocol Explorer"
            description="Real-time momentum signals and the complete protocol database."
          >
            <section className="section">
              <MomentumScanner protocols={protocols} />
            </section>
            <section className="section">
              <ProtocolTable protocols={protocols} onSelect={selectProtocol} hasProData={hasProData} />
            </section>
          </TabSectionGroup>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB 3: CHAIN & ECOSYSTEM                                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'chains' && (
        <>
          <TabSummaryBar metrics={chainMetrics} />

          <TabSectionGroup
            title="Chain Dominance"
            description="TVL distribution across chains, and price performance of the largest DeFi tokens."
            first
          >
            {analytics && (
              <section className="section">
                <ChainDominance analytics={analytics} />
              </section>
            )}
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
          </TabSectionGroup>

          <TabSectionGroup
            title="Category Breakdown"
            description="Revenue distribution and performance metrics across DeFi protocol categories."
          >
            <section className="section">
              <CategoryAnalysis
                revenueByCategory={revenueByCategory}
                avgScoreByCategory={avgScoreByCategory}
              />
            </section>
            <section className="section">
              <CategoryDeepDive categoryStats={categoryStats} />
            </section>
          </TabSectionGroup>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB 4: RISK & OPPORTUNITY                                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'risk' && (
        <>
          <TabSummaryBar metrics={riskMetrics} />

          <TabSectionGroup
            title="Security Analysis"
            description="Hack history, security incidents, and risk-return profiles across the DeFi landscape."
            first
          >
            {analytics && (
              <section className="section">
                <HackAnalysis analytics={analytics} />
              </section>
            )}
            <section className="section">
              <RiskReturn protocols={protocols} />
            </section>
          </TabSectionGroup>

          <TabSectionGroup
            title="Yield & Emissions"
            description="Yield opportunities, real yields vs inflationary rewards, and token unlock schedules."
          >
            {analytics && (
              <section className="section">
                <YieldLandscape analytics={analytics} />
              </section>
            )}
            {analytics && (
              <section className="section">
                <EmissionsAnalysis analytics={analytics} />
              </section>
            )}
          </TabSectionGroup>

          <TabSectionGroup
            title="Funding Landscape"
            description="Venture capital activity, funding rounds, and post-funding performance analysis."
          >
            {analytics && (
              <section className="section">
                <FundingLandscape analytics={analytics} />
              </section>
            )}
            <section className="section">
              <FundingPerformance protocols={protocols} />
            </section>
          </TabSectionGroup>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB 5: GOVERNANCE & RIGHTS                                 */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'governance' && (
        <>
          <TabSummaryBar metrics={govMetrics} />

          <TabSectionGroup
            title="Governance Quality Assessment"
            description="Two-axis evaluation framework adapted from Outerlands Capital (2024), measuring economic control and enforcement reliability."
            first
          >
            <section className="section">
              <GovernanceFramework protocols={protocols} />
            </section>
            <section className="section">
              <GovernanceQuality correlationPoints={correlationPoints} />
            </section>
          </TabSectionGroup>

          <TabSectionGroup
            title="Economic Impact of Rights"
            description="Quantifying the valuation premium associated with governance rights, based on the Lommers, Xu & Xu (2022) framework."
          >
            <section className="section">
              <GovernancePremium protocols={protocols} />
            </section>
            <section className="section">
              <RightsEconomicImpact rightTypeStats={rightTypeStats} protocols={protocols} />
            </section>
          </TabSectionGroup>

          <TabSectionGroup
            title="Rights vs Performance"
            description="Do protocols with stronger holder rights generate more revenue or command higher valuations? Each dot represents a classified DeFi protocol."
          >
            <section className="section">
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
          </TabSectionGroup>

          <TabSectionGroup
            title="Distribution & Methodology"
            description="Rights adoption across the protocol universe and the scoring framework used."
          >
            <section className="section">
              <RightsBreakdown
                rightTypeStats={rightTypeStats}
                totalProtocols={protocols.length}
              />
            </section>
            <section className="section">
              <Methodology />
            </section>
          </TabSectionGroup>
        </>
      )}

      {/* Protocol Detail Modal */}
      {selectedProtocol && (
        <ProtocolDetail
          protocol={selectedProtocol}
          revenueHistory={revenueHistory}
          feeHistory={feeHistory}
          tvlHistory={protocolTvlHistory}
          chainTvls={protocolChainTvls}
          holdersRevenueHistory={holdersRevenueHistory}
          dexVolumeHistory={dexVolumeHistory}
          categoryPeers={categoryPeers}
          valuationData={selectedValuation}
          categoryBenchmark={selectedCategoryBenchmark}
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
