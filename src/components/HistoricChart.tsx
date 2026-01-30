import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface HistoricChartProps {
  title: string;
  data: { timestamp: number; price: number }[];
  yLabel?: string;
  color?: string;
}

function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function formatPrice(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  if (v >= 1) return `$${v.toFixed(2)}`;
  if (v >= 0.01) return `$${v.toFixed(4)}`;
  return `$${v.toFixed(6)}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { timestamp: number; price: number } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div>{formatDate(d.timestamp)}</div>
      <div className="tooltip-price">{formatPrice(d.price)}</div>
    </div>
  );
}

export function HistoricChart({ title, data, yLabel, color = '#fff' }: HistoricChartProps) {
  if (!data.length) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">{title}</h3>
        <div className="chart-empty">No price data available</div>
      </div>
    );
  }

  const first = data[0].price;
  const last = data[data.length - 1].price;
  const change = ((last - first) / first) * 100;
  const isPositive = change >= 0;

  return (
    <div className="chart-container">
      <h3 className="chart-title">
        {title}
        <span className={`price-change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '+' : ''}{change.toFixed(1)}%
        </span>
      </h3>
      <div className="chart-current-price">{formatPrice(last)}</div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 25, left: 50 }}>
          <defs>
            <linearGradient id={`grad-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatDate}
            tick={{ fill: '#666', fontSize: 11 }}
            stroke="#333"
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatPrice}
            tick={{ fill: '#666', fontSize: 11 }}
            stroke="#333"
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#grad-${title.replace(/\s/g, '')})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Revenue history chart
interface RevenueChartProps {
  title: string;
  data: { date: number; value: number }[];
}

export function RevenueChart({ title, data }: RevenueChartProps) {
  if (!data.length) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">{title}</h3>
        <div className="chart-empty">No revenue data available</div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 25, left: 50 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#fff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
          <XAxis
            dataKey="date"
            tickFormatter={(ts) => formatDate(ts)}
            tick={{ fill: '#666', fontSize: 11 }}
            stroke="#333"
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => {
              if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
              if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
              return `$${v.toFixed(0)}`;
            }}
            tick={{ fill: '#666', fontSize: 11 }}
            stroke="#333"
          />
          <Tooltip
            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
            labelFormatter={(ts) => formatDate(ts as number)}
            contentStyle={{ background: '#111', border: '1px solid #333', color: '#ccc' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#fff"
            strokeWidth={1.5}
            fill="url(#revGrad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
