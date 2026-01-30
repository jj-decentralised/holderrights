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
          <h3>Data Sources</h3>
          <ul>
            <li><strong>TVL & Protocol Data</strong>: DeFi Llama /protocols endpoint</li>
            <li><strong>Revenue & Fees</strong>: DeFi Llama /overview/fees endpoint (dailyRevenue dataType)</li>
            <li><strong>Price History</strong>: DeFi Llama /chart endpoint via coins.llama.fi</li>
            <li><strong>Holder Rights Classifications</strong>: Manually researched from protocol documentation, governance forums, and token contracts</li>
          </ul>
        </div>

        <div className="methodology-block">
          <h3>Key Metrics</h3>
          <ul>
            <li><strong>MC/Revenue</strong>: Market Cap divided by annualized revenue (30d * 12). Lower values may indicate undervaluation relative to revenue generation.</li>
            <li><strong>Holder Rights Score</strong>: Sum of weights for all rights the token provides. Higher scores indicate more comprehensive value accrual to holders.</li>
            <li><strong>Correlation (r)</strong>: Pearson correlation coefficient between holder rights score and the plotted metric. Values near +1/-1 indicate strong linear relationships.</li>
          </ul>
        </div>

        <div className="methodology-block">
          <h3>Limitations</h3>
          <ul>
            <li>Holder rights classifications are based on current protocol designs and may change with governance proposals.</li>
            <li>Revenue data availability varies by protocol; some protocols may have incomplete historical data.</li>
            <li>The scoring system weights are subjective and reflect one framework for evaluating holder value.</li>
            <li>Market cap data may not be available for all tokens.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
