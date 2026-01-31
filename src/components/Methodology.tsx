import { HOLDER_RIGHT_DEFINITIONS, HolderRight } from '../types';

export function Methodology() {
  const rights = Object.values(HOLDER_RIGHT_DEFINITIONS).filter((r) => r.id !== HolderRight.NONE);

  return (
    <div className="methodology-section">
      <h2 className="section-title">Methodology</h2>
      <div className="methodology-content">
        <div className="methodology-block">
          <h3>Holder Rights Scoring</h3>
          <p>
            Each protocol's token is evaluated based on the rights it grants to holders. Rights are
            categorized and weighted by the economic value they provide. The total score is the sum of
            all applicable right weights.
          </p>
          <table className="methodology-table">
            <thead>
              <tr>
                <th>Right</th>
                <th>Weight</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {rights.map((r) => (
                <tr key={r.id}>
                  <td>{r.label}</td>
                  <td className="num-cell">{r.weight}/10</td>
                  <td>{r.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="methodology-block">
          <h3>Scoring Framework</h3>
          <p>
            The Holder Rights Score captures the breadth and depth of value accrual mechanisms
            available to token holders. It is intentionally a static classification — reflecting
            protocol design choices rather than market conditions. This allows us to test
            whether structural alignment between protocols and their token holders correlates
            with financial outcomes.
          </p>
          <h4>Interpretation Guidelines</h4>
          <ul>
            <li><strong>Score 0</strong>: No holder rights — the token is purely speculative with no direct value accrual.</li>
            <li><strong>Score 1–10</strong>: Limited rights — typically governance-only or single-mechanism tokens.</li>
            <li><strong>Score 11–25</strong>: Moderate rights — multiple accrual pathways (e.g., staking + governance + fee sharing).</li>
            <li><strong>Score 26+</strong>: Comprehensive rights — deep holder alignment with revenue share, veToken locks, buybacks, and governance.</li>
          </ul>
        </div>

        <div className="methodology-block">
          <h3>Data Sources</h3>
          <table className="methodology-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Source</th>
                <th>Endpoint</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>TVL &amp; Protocol Metadata</td>
                <td>DeFi Llama (Free)</td>
                <td><code>/protocols</code>, <code>/protocol/&#123;slug&#125;</code></td>
              </tr>
              <tr>
                <td>Revenue &amp; Fees</td>
                <td>DeFi Llama (Free)</td>
                <td><code>/overview/fees</code>, <code>/summary/fees/&#123;slug&#125;</code></td>
              </tr>
              <tr>
                <td>DEX Volumes</td>
                <td>DeFi Llama (Free)</td>
                <td><code>/overview/dexs</code></td>
              </tr>
              <tr>
                <td>Price History</td>
                <td>DeFi Llama Coins (Free)</td>
                <td><code>/chart/&#123;coins&#125;</code>, <code>/prices/current/&#123;coins&#125;</code></td>
              </tr>
              <tr>
                <td>Historical TVL</td>
                <td>DeFi Llama (Free)</td>
                <td><code>/v2/historicalChainTvl</code></td>
              </tr>
              <tr>
                <td>Token Emissions &amp; Unlocks</td>
                <td>DeFi Llama Pro</td>
                <td><code>/api/emissions</code>, <code>/api/emission/&#123;protocol&#125;</code></td>
              </tr>
              <tr>
                <td>Treasury Composition</td>
                <td>DeFi Llama Pro</td>
                <td><code>/api/treasuries</code></td>
              </tr>
              <tr>
                <td>Yield Pools</td>
                <td>DeFi Llama Pro</td>
                <td><code>/yields/pools</code></td>
              </tr>
              <tr>
                <td>Hacks &amp; Exploits</td>
                <td>DeFi Llama Pro</td>
                <td><code>/api/hacks</code></td>
              </tr>
              <tr>
                <td>Funding Rounds</td>
                <td>DeFi Llama Pro</td>
                <td><code>/api/raises</code></td>
              </tr>
              <tr>
                <td>Historical Liquidity</td>
                <td>DeFi Llama Pro</td>
                <td><code>/api/historicalLiquidity/&#123;token&#125;</code></td>
              </tr>
              <tr>
                <td>Holder Rights Classifications</td>
                <td>Manual Research</td>
                <td>Protocol docs, governance forums, token contracts</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="methodology-block">
          <h3>Key Metrics</h3>
          <ul>
            <li><strong>MC/Revenue</strong>: Market cap divided by annualized revenue (30d × 12). Lower values may indicate undervaluation relative to revenue generation.</li>
            <li><strong>Holder Rights Score</strong>: Sum of weights for all rights the token provides. Higher scores indicate more comprehensive value accrual to holders.</li>
            <li><strong>Correlation (r)</strong>: Pearson correlation coefficient between holder rights score and the plotted metric. Values near ±1 indicate strong linear relationships.</li>
            <li><strong>Fee-to-Revenue Ratio</strong>: Total fees divided by protocol revenue. Measures what fraction of fees the protocol retains vs distributes.</li>
            <li><strong>TVL-to-MCap Ratio</strong>: Total value locked divided by market capitalization. Higher ratios may suggest productive capital efficiency.</li>
          </ul>
        </div>

        <div className="methodology-block">
          <h3>Academic &amp; Research Foundations</h3>
          <p>
            The governance analysis on this site draws on peer-reviewed academic literature and
            institutional research frameworks. Key sources informing our methodology:
          </p>
          <table className="methodology-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Key Finding</th>
                <th>Application</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Lo Monaco, Momtaz &amp; Vismara (2025)</strong><br /><em>Economics Letters</em></td>
                <td>DAO proposal passage increases token returns by +4.7% (regression discontinuity). Voter participation amplifies returns by +2.2% per standard deviation.</td>
                <td>Governance quality scoring; voter participation as value signal</td>
              </tr>
              <tr>
                <td><strong>Outerlands Capital (2024)</strong><br /><em>Governance Token Evaluation Framework</em></td>
                <td>Two-axis framework: Economic Control (cash-flow rights) vs Reliability (enforcement strength). Tokens with strong control over economic parameters can be DCF-valued.</td>
                <td>Control vs Reliability quadrant map; governance quality classification</td>
              </tr>
              <tr>
                <td><strong>Lommers, Xu &amp; Xu (2022)</strong><br /><em>Journal of Financial Economics / SSRN</em></td>
                <td>DAO token value derives from three pillars: community membership, utility, and governance rights. "Discounted Value of Benefits" model parallels corporate control premiums.</td>
                <td>Governance premium quantification; tier-based valuation comparison</td>
              </tr>
              <tr>
                <td><strong>JFE Token-Based Platform Governance (2024)</strong><br /><em>Journal of Financial Economics</em></td>
                <td>Tokens bundling cash-flow claims + transaction services + governance rights create more efficient equilibria than traditional equity governance.</td>
                <td>Rights combination analysis; bundling value assessment</td>
              </tr>
              <tr>
                <td><strong>Rossello (2024)</strong><br /><em>SSRN Working Paper</em></td>
                <td>Majority blockholder override of minority holders causes -12.77% weekly abnormal returns. Pre-vote token accumulation detected in ~15% of proposals.</td>
                <td>Governance concentration risk assessment</td>
              </tr>
              <tr>
                <td><strong>Cong et al. (2025)</strong><br /><em>Fudan / Wharton</em></td>
                <td>Concentrated governance ownership fosters whale-vs-community conflicts that negatively affect platform growth.</td>
                <td>Decentralization analysis; concentration risk scoring</td>
              </tr>
              <tr>
                <td><strong>Technology in Society (2023)</strong></td>
                <td>DeFi governance tends toward "timocracy" — plutocratic rule — when voting rights are freely tradeable without anti-concentration protections.</td>
                <td>Limitations acknowledgment; governance model risk assessment</td>
              </tr>
              <tr>
                <td><strong>EPJ Data Science (2025)</strong></td>
                <td>Persistent cross-protocol governance token overlap among institutional actors. Concentration shifts correlate with TVL and valuation changes.</td>
                <td>Cross-protocol governance concentration analysis</td>
              </tr>
              <tr>
                <td><strong>Hall / a16z (2025)</strong><br /><em>Stanford / a16z crypto</em></td>
                <td>Governance rights should only be attached to tokens when decisions cannot be fully automated in smart contracts, or when crowdsourcing engagement adds value.</td>
                <td>Governance scope evaluation; right-type appropriateness</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="methodology-block">
          <h3>Proposed Extended Metrics (Pro API)</h3>
          <p>
            When a DeFi Llama Pro API key is configured, the following additional analyses become available:
          </p>
          <ul>
            <li>
              <strong>Net Value Accrual Score</strong>: Combines holder rights score with actual revenue distribution data. Weights rights by realized economic value rather than design intent.
            </li>
            <li>
              <strong>Emission-Adjusted Yield</strong>: Real yield minus token inflation from upcoming unlocks. Uses emissions schedule data to discount inflationary rewards.
            </li>
            <li>
              <strong>Treasury Health Index</strong>: Ratio of stablecoin + major asset holdings to own-token holdings. Protocols with diversified treasuries may be better positioned for downturns.
            </li>
            <li>
              <strong>Risk-Adjusted Score</strong>: Holder rights score penalized by historical hack exposure and concentrated liquidity risk. A high-rights protocol that has been exploited carries additional risk.
            </li>
            <li>
              <strong>Holder Efficiency Ratio</strong>: Revenue per unit of TVL, normalized by holder rights score. Measures whether strong holder rights correlate with more efficient capital deployment.
            </li>
          </ul>
        </div>

        <div className="methodology-block">
          <h3>Limitations</h3>
          <ul>
            <li>Holder rights classifications are based on current protocol designs and may change with governance proposals.</li>
            <li>Revenue data availability varies by protocol; some protocols may have incomplete historical data.</li>
            <li>The scoring system weights are subjective and reflect one framework for evaluating holder value.</li>
            <li>Market cap data may not be available for all tokens, particularly newer or smaller protocols.</li>
            <li>Pro API data (emissions, treasury, yields) is gated behind an API key and may not always be available.</li>
            <li>Price performance correlation does not imply causation — many factors beyond holder rights drive token prices.</li>
            <li>Cross-chain protocols may have fragmented TVL and revenue data across different chain deployments.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
