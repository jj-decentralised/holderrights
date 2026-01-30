import { useState, useMemo, useCallback } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Brush,
  ReferenceArea,
} from 'recharts';

type Period = '7d' | '30d' | '90d' | '1y' | 'all';

const PERIODS: { key: Period; label: string; days: number }[] = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
  { key: '1y', label: '1Y', days: 365 },
  { key: 'all', label: 'ALL', days: 0 },
];

interface HistoricChartProps {
  title: string;
  data: { timestamp: number; price: number }[];
  yLabel?: string;
  color?: string;
}

function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function formatDateFull(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPrice(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  if (v >= 1) return `$${v.toFixed(2)}`;
  if (v >= 0.01) return `$${v.toFixed(4)}`;
  return `$${v.toFixed(6)}`;
}

function sliceByPeriod(data: { timestamp: number; price: number }[], period: Period) {
  if (period === 'all' || data.length === 0) return data;
  const days = PERIODS.find(p => p.key === period)!.days;
  const cutoff = data[data.length - 1].timestamp - days * 86400;
  const idx = data.findIndex(d => d.timestamp >= cutoff);
  return idx >= 0 ? data.slice(idx) : data;
}

const tooltipStyle = {
  background: 'rgba(255,255,255,0.96)',
  border: '1px solid #e0e0dd',
  borderRadius: '6px',
  fontSize: 13,
  color: '#333',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  padding: '8px 12px',
};

export function HistoricChart({ title, data, color = '#1a1a1a' }: HistoricChartProps) {
  const [period, setPeriod] = useState<Period>('all');
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const [zoomLeft, setZoomLeft] = useState<number | null>(null);
  const [zoomRight, setZoomRight] = useState<number | null>(null);

  const sliced = useMemo(() => sliceByPeriod(data, period), [data, period]);

  const displayData = useMemo(() => {
    if (zoomLeft === null || zoomRight === null) return sliced;
    return sliced.filter(d => d.timestamp >= zoomLeft && d.timestamp <= zoomRight);
  }, [sliced, zoomLeft, zoomRight]);

  const handleMouseDown = useCallback((e: Record<string, unknown>) => {
    if (e && e.activeLabel) setRefAreaLeft(e.activeLabel as number);
  }, []);

  const handleMouseMove = useCallback((e: Record<string, unknown>) => {
    if (refAreaLeft && e && e.activeLabel) setRefAreaRight(e.activeLabel as number);
  }, [refAreaLeft]);

  const handleMouseUp = useCallback(() => {
    if (refAreaLeft && refAreaRight) {
      const left = Math.min(refAreaLeft, refAreaRight);
      const right = Math.max(refAreaLeft, refAreaRight);
      if (right - left > 86400) {
        setZoomLeft(left);
        setZoomRight(right);
      }
    }
    setRefAreaLeft(null);
    setRefAreaRight(null);
  }, [refAreaLeft, refAreaRight]);

  const resetZoom = useCallback(() => {
    setZoomLeft(null);
    setZoomRight(null);
  }, []);

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p);
    setZoomLeft(null);
    setZoomRight(null);
  }, []);

  if (!data.length) {
    return (
      <div className="chart-card">
        <h3 className="chart-card-title">{title}</h3>
        <div className="chart-empty">No price data available</div>
      </div>
    );
  }

  const first = displayData[0]?.price ?? data[0].price;
  const last = displayData[displayData.length - 1]?.price ?? data[data.length - 1].price;
  const change = ((last - first) / first) * 100;
  const isPositive = change >= 0;
  const high = Math.max(...displayData.map(d => d.price));
  const low = Math.min(...displayData.map(d => d.price));

  const isZoomed = zoomLeft !== null;
  const gradientId = `grad-${title.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div>
          <h3 className="chart-card-title">
            {title}
            <span className={`chg-badge ${isPositive ? 'positive' : 'negative'}`}>
              {isPositive ? '+' : ''}{change.toFixed(1)}%
            </span>
          </h3>
          <div className="chart-card-value">{formatPrice(last)}</div>
        </div>
        <div className="chart-card-right">
          <div className="chart-badges-col">
            <div className="chart-badge-group">
              <span className="chart-badge-label">High</span>
              <span className="chart-badge-val">{formatPrice(high)}</span>
            </div>
            <div className="chart-badge-group">
              <span className="chart-badge-label">Low</span>
              <span className="chart-badge-val">{formatPrice(low)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="period-selector period-selector-sm">
        {PERIODS.map(p => (
          <button
            key={p.key}
            className={`period-btn ${period === p.key ? 'period-active' : ''}`}
            onClick={() => handlePeriodChange(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="zoomable-chart">
        {isZoomed && (
          <button className="zoom-reset-btn" onClick={resetZoom}>Reset zoom</button>
        )}
        <div className="zoom-hint">{isZoomed ? 'Showing selected range' : 'Drag to zoom'}</div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart
            data={displayData}
            margin={{ top: 8, right: 16, bottom: 20, left: 48 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                <stop offset="50%" stopColor={color} stopOpacity={0.06} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ececea" vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatDate}
              tick={{ fill: '#999', fontSize: 11, fontFamily: 'system-ui' }}
              stroke="none"
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={formatPrice}
              tick={{ fill: '#999', fontSize: 11, fontFamily: 'system-ui' }}
              stroke="none"
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              width={56}
            />
            <Tooltip
              formatter={(value) => [formatPrice(Number(value)), 'Price']}
              labelFormatter={(ts) => formatDateFull(ts as number)}
              contentStyle={tooltipStyle}
              cursor={{ stroke: '#bbb', strokeDasharray: '4 2' }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              animationDuration={600}
            />
            {refAreaLeft && refAreaRight && (
              <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#1a1a1a" fillOpacity={0.06} />
            )}
            {!isZoomed && sliced.length > 60 && (
              <Brush
                dataKey="timestamp"
                height={24}
                stroke="#ccc"
                fill="#fafaf8"
                tickFormatter={formatDate}
                travellerWidth={8}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Revenue history chart
interface RevenueChartProps {
  title: string;
  data: { date: number; value: number }[];
}

export function RevenueChart({ title, data }: RevenueChartProps) {
  const [period, setPeriod] = useState<Period>('all');

  const sliced = useMemo(() => {
    if (period === 'all' || data.length === 0) return data;
    const days = PERIODS.find(p => p.key === period)!.days;
    const cutoff = data[data.length - 1].date - days * 86400;
    const idx = data.findIndex(d => d.date >= cutoff);
    return idx >= 0 ? data.slice(idx) : data;
  }, [data, period]);

  if (!data.length) {
    return (
      <div className="chart-card">
        <h3 className="chart-card-title">{title}</h3>
        <div className="chart-empty">No revenue data available</div>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <h3 className="chart-card-title">{title}</h3>
        <div className="period-selector period-selector-sm">
          {PERIODS.map(p => (
            <button
              key={p.key}
              className={`period-btn ${period === p.key ? 'period-active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={sliced} margin={{ top: 8, right: 16, bottom: 20, left: 48 }}>
          <defs>
            <linearGradient id="revHistGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a1a1a" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#1a1a1a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ececea" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(ts) => formatDate(ts)}
            tick={{ fill: '#999', fontSize: 11, fontFamily: 'system-ui' }}
            stroke="none"
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => {
              if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
              if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
              return `$${v.toFixed(0)}`;
            }}
            tick={{ fill: '#999', fontSize: 11, fontFamily: 'system-ui' }}
            stroke="none"
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']}
            labelFormatter={(ts) => formatDateFull(ts as number)}
            contentStyle={tooltipStyle}
            cursor={{ stroke: '#bbb', strokeDasharray: '4 2' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#1a1a1a"
            strokeWidth={2}
            fill="url(#revHistGrad)"
            dot={false}
            animationDuration={600}
          />
          {sliced.length > 60 && (
            <Brush
              dataKey="date"
              height={24}
              stroke="#ccc"
              fill="#fafaf8"
              tickFormatter={formatDate}
              travellerWidth={8}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
