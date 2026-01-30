import { useState, useMemo, useCallback } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ComposedChart,
  Line,
  Brush,
  ReferenceArea,
} from 'recharts';

interface AggregateChartsProps {
  historicalTvl: { date: number; tvl: number }[];
  aggregateRevenue: { date: number; value: number }[];
  aggregateFees: { date: number; value: number }[];
  aggregateDexVolume: { date: number; value: number }[];
}

type Period = '7d' | '30d' | '90d' | '1y' | 'all';

const PERIODS: { key: Period; label: string; days: number }[] = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
  { key: '1y', label: '1Y', days: 365 },
  { key: 'all', label: 'ALL', days: 0 },
];

function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function formatDateFull(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDollar(v: number): string {
  if (Math.abs(v) >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function sliceByPeriod<T extends { date: number }>(data: T[], period: Period): T[] {
  if (period === 'all' || data.length === 0) return data;
  const days = PERIODS.find(p => p.key === period)!.days;
  const cutoff = data[data.length - 1].date - days * 86400;
  const idx = data.findIndex(d => d.date >= cutoff);
  return idx >= 0 ? data.slice(idx) : data;
}

function computeStats(data: { value: number }[]) {
  if (data.length === 0) return null;
  const values = data.map(d => d.value);
  const current = values[values.length - 1];
  const max = Math.max(...values);
  const min = Math.min(...values);

  const last7 = values.slice(-7);
  const last30 = values.slice(-30);
  const avg7d = last7.reduce((s, v) => s + v, 0) / last7.length;
  const avg30d = last30.reduce((s, v) => s + v, 0) / last30.length;

  const prior7 = values.slice(-14, -7);
  const prior30 = values.slice(-60, -30);
  const change7d = prior7.length > 0
    ? ((avg7d - prior7.reduce((s, v) => s + v, 0) / prior7.length) / (prior7.reduce((s, v) => s + v, 0) / prior7.length)) * 100
    : null;
  const change30d = prior30.length > 0
    ? ((avg30d - prior30.reduce((s, v) => s + v, 0) / prior30.length) / (prior30.reduce((s, v) => s + v, 0) / prior30.length)) * 100
    : null;

  return { current, max, min, avg7d, avg30d, change7d, change30d };
}

function computeTvlStats(data: { tvl: number }[]) {
  if (data.length === 0) return null;
  const values = data.map(d => d.tvl);
  const current = values[values.length - 1];
  const max = Math.max(...values);
  const min = Math.min(...values);

  const prior7 = data.length > 7 ? values[values.length - 8] : null;
  const prior30 = data.length > 30 ? values[values.length - 31] : null;
  const change7d = prior7 ? ((current - prior7) / prior7) * 100 : null;
  const change30d = prior30 ? ((current - prior30) / prior30) * 100 : null;

  return { current, max, min, change7d, change30d };
}

function addMovingAvg(data: { date: number; value: number }[], window: number) {
  return data.map((d, i) => {
    if (i < window - 1) return { ...d, ma: null as number | null };
    const slice = data.slice(i - window + 1, i + 1);
    const avg = slice.reduce((s, x) => s + x.value, 0) / window;
    return { ...d, ma: avg };
  });
}

function ChgBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const cls = value > 0 ? 'positive' : value < 0 ? 'negative' : '';
  return <span className={`chg-badge ${cls}`}>{value > 0 ? '+' : ''}{value.toFixed(1)}%</span>;
}

function PeriodSelector({ active, onChange }: { active: Period; onChange: (p: Period) => void }) {
  return (
    <div className="period-selector">
      {PERIODS.map(p => (
        <button
          key={p.key}
          className={`period-btn ${active === p.key ? 'period-active' : ''}`}
          onClick={() => onChange(p.key)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
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

function ZoomableAreaChart({
  data,
  dataKey,
  gradientId,
  strokeColor,
  tooltipLabel,
  formatter,
  height = 340,
}: {
  data: { date: number; [k: string]: number | null }[];
  dataKey: string;
  gradientId: string;
  strokeColor: string;
  tooltipLabel: string;
  formatter: (v: number) => string;
  height?: number;
}) {
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const [zoomLeft, setZoomLeft] = useState<number | null>(null);
  const [zoomRight, setZoomRight] = useState<number | null>(null);

  const displayData = useMemo(() => {
    if (zoomLeft === null || zoomRight === null) return data;
    return data.filter(d => d.date >= zoomLeft && d.date <= zoomRight);
  }, [data, zoomLeft, zoomRight]);

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

  const isZoomed = zoomLeft !== null;

  return (
    <div className="zoomable-chart">
      {isZoomed && (
        <button className="zoom-reset-btn" onClick={resetZoom}>Reset zoom</button>
      )}
      <div className="zoom-hint">{isZoomed ? 'Showing selected range' : 'Drag to zoom'}</div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={displayData}
          margin={{ top: 8, right: 16, bottom: 20, left: 48 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.18} />
              <stop offset="50%" stopColor={strokeColor} stopOpacity={0.06} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ececea" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: '#999', fontSize: 11, fontFamily: 'system-ui' }}
            stroke="none"
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatter}
            tick={{ fill: '#999', fontSize: 11, fontFamily: 'system-ui' }}
            stroke="none"
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
            width={56}
          />
          <Tooltip
            formatter={(value) => [formatter(Number(value)), tooltipLabel]}
            labelFormatter={(ts) => formatDateFull(ts as number)}
            contentStyle={tooltipStyle}
            cursor={{ stroke: '#bbb', strokeDasharray: '4 2' }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={strokeColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            animationDuration={600}
          />
          {refAreaLeft && refAreaRight && (
            <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#1a1a1a" fillOpacity={0.06} />
          )}
          {!isZoomed && data.length > 60 && (
            <Brush
              dataKey="date"
              height={28}
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

function ZoomableComposedChart({
  data,
  gradientId,
  strokeColor,
  tooltipLabelRaw,
  tooltipLabelMa,
  formatter,
  height = 300,
}: {
  data: { date: number; value: number; ma: number | null }[];
  gradientId: string;
  strokeColor: string;
  tooltipLabelRaw: string;
  tooltipLabelMa: string;
  formatter: (v: number) => string;
  height?: number;
}) {
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const [zoomLeft, setZoomLeft] = useState<number | null>(null);
  const [zoomRight, setZoomRight] = useState<number | null>(null);

  const displayData = useMemo(() => {
    if (zoomLeft === null || zoomRight === null) return data;
    return data.filter(d => d.date >= zoomLeft && d.date <= zoomRight);
  }, [data, zoomLeft, zoomRight]);

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

  const isZoomed = zoomLeft !== null;

  return (
    <div className="zoomable-chart">
      {isZoomed && (
        <button className="zoom-reset-btn" onClick={resetZoom}>Reset zoom</button>
      )}
      <div className="zoom-hint">{isZoomed ? 'Showing selected range' : 'Drag to zoom'}</div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={displayData}
          margin={{ top: 8, right: 16, bottom: 20, left: 48 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.1} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ececea" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: '#999', fontSize: 11, fontFamily: 'system-ui' }}
            stroke="none"
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatter}
            tick={{ fill: '#999', fontSize: 11, fontFamily: 'system-ui' }}
            stroke="none"
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            formatter={(value, name) => [formatter(Number(value)), name === 'ma' ? tooltipLabelMa : tooltipLabelRaw]}
            labelFormatter={(ts) => formatDateFull(ts as number)}
            contentStyle={tooltipStyle}
            cursor={{ stroke: '#bbb', strokeDasharray: '4 2' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={0.5}
            strokeOpacity={0.4}
            fill={`url(#${gradientId})`}
            dot={false}
            name={tooltipLabelRaw}
            animationDuration={600}
          />
          <Line
            type="monotone"
            dataKey="ma"
            stroke={strokeColor}
            strokeWidth={2.5}
            dot={false}
            name="ma"
            connectNulls
            animationDuration={600}
          />
          {refAreaLeft && refAreaRight && (
            <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#1a1a1a" fillOpacity={0.06} />
          )}
          {!isZoomed && data.length > 60 && (
            <Brush
              dataKey="date"
              height={28}
              stroke="#ccc"
              fill="#fafaf8"
              tickFormatter={formatDate}
              travellerWidth={8}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AggregateCharts({ historicalTvl, aggregateRevenue, aggregateFees, aggregateDexVolume }: AggregateChartsProps) {
  const [period, setPeriod] = useState<Period>('all');

  const tvlSlice = useMemo(() => sliceByPeriod(historicalTvl, period), [historicalTvl, period]);
  const revSlice = useMemo(() => sliceByPeriod(aggregateRevenue, period), [aggregateRevenue, period]);
  const feeSlice = useMemo(() => sliceByPeriod(aggregateFees, period), [aggregateFees, period]);
  const dexSlice = useMemo(() => sliceByPeriod(aggregateDexVolume, period), [aggregateDexVolume, period]);

  const tvlStats = computeTvlStats(tvlSlice);
  const revStats = computeStats(revSlice);
  const feeStats = computeStats(feeSlice);
  const dexStats = computeStats(dexSlice);

  const revWithMa = useMemo(() => addMovingAvg(revSlice, 7), [revSlice]);
  const feeWithMa = useMemo(() => addMovingAvg(feeSlice, 7), [feeSlice]);
  const dexWithMa = useMemo(() => addMovingAvg(dexSlice, 7), [dexSlice]);

  return (
    <div className="aggregate-charts-section">
      <div className="agg-charts-header">
        <div>
          <h2 className="section-title">DeFi Market Overview</h2>
          <p className="section-desc">
            Historical time-series across the DeFi ecosystem. 7-day moving averages smooth daily volatility.
            Drag on any chart to zoom into a specific date range.
          </p>
        </div>
        <PeriodSelector active={period} onChange={setPeriod} />
      </div>

      {/* TVL Chart — full width */}
      {tvlSlice.length > 0 && (
        <div className="chart-card chart-card-full">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Total DeFi TVL</h3>
              <div className="chart-card-value">{fmtDollar(tvlStats?.current || 0)}</div>
            </div>
            {tvlStats && (
              <div className="chart-badges">
                <div className="chart-badge-group">
                  <span className="chart-badge-label">7d</span>
                  <ChgBadge value={tvlStats.change7d} />
                </div>
                <div className="chart-badge-group">
                  <span className="chart-badge-label">30d</span>
                  <ChgBadge value={tvlStats.change30d} />
                </div>
                <div className="chart-badge-sep" />
                <div className="chart-badge-group">
                  <span className="chart-badge-label">Peak</span>
                  <span className="chart-badge-val">{fmtDollar(tvlStats.max)}</span>
                </div>
                <div className="chart-badge-group">
                  <span className="chart-badge-label">Trough</span>
                  <span className="chart-badge-val">{fmtDollar(tvlStats.min)}</span>
                </div>
              </div>
            )}
          </div>
          <ZoomableAreaChart
            data={tvlSlice as { date: number; [k: string]: number | null }[]}
            dataKey="tvl"
            gradientId="tvlGradNew"
            strokeColor="#1a1a1a"
            tooltipLabel="TVL"
            formatter={fmtDollar}
            height={360}
          />
        </div>
      )}

      <div className="chart-grid" style={{ marginTop: 20 }}>
        {/* Revenue with 7d MA */}
        {revSlice.length > 0 && (
          <div className="chart-card">
            <div className="chart-card-header">
              <div>
                <h3 className="chart-card-title">Daily Revenue</h3>
                <div className="chart-card-value">{fmtDollar(revStats?.current || 0)}<span className="chart-card-unit">/day</span></div>
              </div>
              {revStats && (
                <div className="chart-badges-col">
                  <div className="chart-badge-group">
                    <span className="chart-badge-label">7d avg</span>
                    <span className="chart-badge-val">{fmtDollar(revStats.avg7d)}</span>
                    <ChgBadge value={revStats.change7d} />
                  </div>
                  <div className="chart-badge-group">
                    <span className="chart-badge-label">30d avg</span>
                    <span className="chart-badge-val">{fmtDollar(revStats.avg30d)}</span>
                    <ChgBadge value={revStats.change30d} />
                  </div>
                </div>
              )}
            </div>
            <ZoomableComposedChart
              data={revWithMa}
              gradientId="revGradNew"
              strokeColor="#1a1a1a"
              tooltipLabelRaw="Daily Revenue"
              tooltipLabelMa="7d MA"
              formatter={fmtDollar}
            />
          </div>
        )}

        {/* Fees with 7d MA */}
        {feeSlice.length > 0 && (
          <div className="chart-card">
            <div className="chart-card-header">
              <div>
                <h3 className="chart-card-title">Daily Fees</h3>
                <div className="chart-card-value">{fmtDollar(feeStats?.current || 0)}<span className="chart-card-unit">/day</span></div>
              </div>
              {feeStats && (
                <div className="chart-badges-col">
                  <div className="chart-badge-group">
                    <span className="chart-badge-label">7d avg</span>
                    <span className="chart-badge-val">{fmtDollar(feeStats.avg7d)}</span>
                    <ChgBadge value={feeStats.change7d} />
                  </div>
                  <div className="chart-badge-group">
                    <span className="chart-badge-label">30d avg</span>
                    <span className="chart-badge-val">{fmtDollar(feeStats.avg30d)}</span>
                    <ChgBadge value={feeStats.change30d} />
                  </div>
                </div>
              )}
            </div>
            <ZoomableComposedChart
              data={feeWithMa}
              gradientId="feeGradNew"
              strokeColor="#1a1a1a"
              tooltipLabelRaw="Daily Fees"
              tooltipLabelMa="7d MA"
              formatter={fmtDollar}
            />
          </div>
        )}
      </div>

      {/* DEX Volume — full width */}
      {dexSlice.length > 0 && (
        <div className="chart-card chart-card-full" style={{ marginTop: 20 }}>
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">DEX Trading Volume</h3>
              <div className="chart-card-value">{fmtDollar(dexStats?.current || 0)}<span className="chart-card-unit">/day</span></div>
            </div>
            {dexStats && (
              <div className="chart-badges">
                <div className="chart-badge-group">
                  <span className="chart-badge-label">7d avg</span>
                  <span className="chart-badge-val">{fmtDollar(dexStats.avg7d)}</span>
                  <ChgBadge value={dexStats.change7d} />
                </div>
                <div className="chart-badge-group">
                  <span className="chart-badge-label">30d avg</span>
                  <span className="chart-badge-val">{fmtDollar(dexStats.avg30d)}</span>
                  <ChgBadge value={dexStats.change30d} />
                </div>
                <div className="chart-badge-sep" />
                <div className="chart-badge-group">
                  <span className="chart-badge-label">Peak</span>
                  <span className="chart-badge-val">{fmtDollar(dexStats.max)}</span>
                </div>
              </div>
            )}
          </div>
          <ZoomableComposedChart
            data={dexWithMa}
            gradientId="dexGradNew"
            strokeColor="#1a1a1a"
            tooltipLabelRaw="Daily Volume"
            tooltipLabelMa="7d MA"
            formatter={fmtDollar}
            height={320}
          />
        </div>
      )}
    </div>
  );
}
