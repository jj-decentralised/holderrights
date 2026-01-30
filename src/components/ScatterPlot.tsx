import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
} from 'recharts';
import { HOLDER_RIGHT_DEFINITIONS } from '../types';
import type { CorrelationPoint } from '../types';

interface ScatterPlotProps {
  data: CorrelationPoint[];
  xKey: 'holderRightsScore';
  yKey: 'revenue30d' | 'mcap' | 'mcapToRevenue' | 'priceChange30d';
  title: string;
  yLabel: string;
  yFormatter?: (v: number) => string;
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function defaultFormatter(v: number): string {
  return fmt(v);
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: CorrelationPoint }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="scatter-tooltip">
      <div className="tooltip-name">{d.name} ({d.symbol})</div>
      <div>Holder Rights Score: {d.holderRightsScore}</div>
      <div>Rights: {d.holderRights.map((r) => HOLDER_RIGHT_DEFINITIONS[r].label).join(', ')}</div>
      {d.mcap && <div>Market Cap: {fmt(d.mcap)}</div>}
      {d.revenue30d && <div>Revenue (30d): {fmt(d.revenue30d)}</div>}
      {d.mcapToRevenue && <div>Mcap/Revenue: {d.mcapToRevenue.toFixed(1)}x</div>}
      {d.priceChange30d !== null && <div>Price Change (30d): {d.priceChange30d.toFixed(1)}%</div>}
    </div>
  );
}

export function ScatterPlotChart({ data, xKey, yKey, title, yLabel, yFormatter }: ScatterPlotProps) {
  const formatter = yFormatter || defaultFormatter;
  const filtered = data.filter((d) => d[yKey] !== null && d[yKey] !== undefined);

  // Compute simple linear regression
  const n = filtered.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  filtered.forEach((d) => {
    const x = d[xKey] as number;
    const y = d[yKey] as number;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });
  const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) : 0;

  // Correlation coefficient
  const meanX = sumX / n;
  const meanY = sumY / n;
  let ssXY = 0, ssXX = 0, ssYY = 0;
  filtered.forEach((d) => {
    const dx = (d[xKey] as number) - meanX;
    const dy = (d[yKey] as number) - meanY;
    ssXY += dx * dy;
    ssXX += dx * dx;
    ssYY += dy * dy;
  });
  const r = ssXX > 0 && ssYY > 0 ? ssXY / Math.sqrt(ssXX * ssYY) : 0;

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <div className="chart-meta">
        n={n} &middot; r={r.toFixed(3)} &middot; slope={slope.toFixed(2)}
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 10, right: 30, bottom: 40, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            type="number"
            dataKey={xKey}
            domain={[0, 'auto']}
            tick={{ fill: '#999', fontSize: 12 }}
            stroke="#555"
          >
            <Label value="Holder Rights Score" offset={-20} position="insideBottom" fill="#999" />
          </XAxis>
          <YAxis
            type="number"
            dataKey={yKey}
            tickFormatter={(v) => formatter(v)}
            tick={{ fill: '#999', fontSize: 12 }}
            stroke="#555"
          >
            <Label value={yLabel} angle={-90} position="insideLeft" fill="#999" style={{ textAnchor: 'middle' }} />
          </YAxis>
          <Tooltip content={<CustomTooltip />} />
          <Scatter
            data={filtered}
            fill="#fff"
            stroke="#fff"
            strokeWidth={1}
            r={5}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
