import { useDefiData } from './hooks/useDefiData';
import { Header } from './components/Header';
import { ExecutiveSummary } from './components/ExecutiveSummary';
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
import './App.css';

function App() {
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

  // Find top protocols for featured price charts
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

      {/* Aggregate DeFi Market Charts */}
      <section className="section">
        <AggregateCharts
          historicalTvl={historicalTvl}
          aggregateRevenue={aggregateRevenueChart}
          aggregateFees={aggregateFeesChart}
          aggregateDexVolume={aggregateDexVolumeChart}
        />
      </section>

      {/* Key Findings — auto-generated insights */}
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

      {/* Market Structure & Concentration */}
      {analytics && (
        <section className="section">
          <MarketStructure analytics={analytics} />
        </section>
      )}

      {/* Scatter Plots Section */}
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

      {/* Revenue Efficiency Rankings */}
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

      {/* Chain Dominance */}
      {analytics && (
        <section className="section">
          <ChainDominance analytics={analytics} />
        </section>
      )}

      {/* Holder Rights Distribution */}
      <section className="section">
        <RightsBreakdown
          rightTypeStats={rightTypeStats}
          totalProtocols={protocols.length}
        />
      </section>

      {/* Category Analysis (simple) */}
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

      {/* Security & Hack Analysis */}
      {analytics && (
        <section className="section">
          <HackAnalysis analytics={analytics} />
        </section>
      )}

      {/* Funding Landscape */}
      {analytics && (
        <section className="section">
          <FundingLandscape analytics={analytics} />
        </section>
      )}

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

      {/* Protocol Table */}
      <section className="section">
        <ProtocolTable protocols={protocols} onSelect={selectProtocol} hasProData={hasProData} />
      </section>

      {/* Methodology */}
      <section className="section">
        <Methodology />
      </section>

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
