import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import type { ValuationRanking } from '../types';

interface Props {
  valuationData: ValuationRanking | null;
  categoryBenchmark: Record<string, number> | null;
}

const DIMENSIONS = [
  { key: 'evRevPctl', label: 'EV/Revenue' },
  { key: 'momentumPctl', label: 'Momentum' },
  { key: 'realYieldPctl', label: 'Real Yield' },
  { key: 'securityPctl', label: 'Security' },
  { key: 'divergencePctl', label: 'Divergence' },
  { key: 'fundingPctl', label: 'Funding' },
  { key: 'volumeUtilPctl', label: 'Vol. Util.' },
  { key: 'dilutionPctl', label: 'Dilution' },
  { key: 'governancePctl', label: 'Governance' },
] as const;

function rawLabel(data: ValuationRanking, key: string): string {
  switch (key) {
    case 'evRevPctl': return data.evToRevenue !== null ? `${data.evToRevenue.toFixed(1)}x` : '—';
    case 'momentumPctl': return data.revenueMomentum !== null ? `${(data.revenueMomentum * 100).toFixed(0)}%` : '—';
    case 'realYieldPctl': return `${(data.realYieldScore * 100).toFixed(1)}%`;
    case 'securityPctl': return `${(data.securityScore * 100).toFixed(0)}%`;
    case 'divergencePctl': return `${(data.divergenceSignal * 100).toFixed(0)}%`;
    case 'fundingPctl': return data.fundingRatio !== null ? `${data.fundingRatio.toFixed(2)}x` : '—';
    case 'volumeUtilPctl': return data.volumeUtilization !== null ? `${data.volumeUtilization.toFixed(2)}x` : '—';
    case 'dilutionPctl': return `${(data.dilutionRisk * 100).toFixed(0)}%`;
    case 'governancePctl': return `${data.holderRightsScore}`;
    default: return '—';
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return '#2d6a2e';
  if (score >= 60) return '#1a1a1a';
  return '#888';
}

export function ValuationRadar({ valuationData, categoryBenchmark }: Props) {
  if (!valuationData) return null;

  const v = valuationData;

  const radarData = DIMENSIONS.map(({ key, label }) => ({
    subject: label,
    protocol: v[key as keyof ValuationRanking] as number ?? 50,
    benchmark: categoryBenchmark?.[key] ?? 50,
  }));

  return (
    <div className="valuation-radar-section">
      <h3 style={{ fontSize: 17, marginBottom: 4 }}>Valuation Profile</h3>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 16, fontStyle: 'italic' }}>
        9-dimension percentile positioning vs category peers (dashed)
      </p>

      <div className="radar-layout">
        {/* Score headline */}
        <div className="radar-score-block">
          <div className="radar-score-number" style={{ color: scoreColor(v.compositeScore) }}>
            {v.compositeScore.toFixed(1)}
          </div>
          <div className="radar-score-label">Composite Score</div>
          <div className="radar-completeness">
            <div className="radar-completeness-bar">
              <div
                className="radar-completeness-fill"
                style={{ width: `${Math.round(v.dataCompleteness * 100)}%` }}
              />
            </div>
            <span className="radar-completeness-text">
              {Math.round(v.dataCompleteness * 100)}% data coverage
            </span>
          </div>
        </div>

        {/* Radar chart */}
        <div className="radar-chart-wrapper">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid stroke="#e0e0dd" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="Protocol"
                dataKey="protocol"
                stroke="#1a1a1a"
                fill="#1a1a1a"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Radar
                name="Category Avg"
                dataKey="benchmark"
                stroke="#aaa"
                fill="none"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(255,255,255,0.96)',
                  border: '1px solid #e0e0dd',
                  borderRadius: '6px',
                  fontSize: 13,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Raw values grid */}
      <div className="radar-values-grid">
        {DIMENSIONS.map(({ key, label }) => {
          const pctl = v[key as keyof ValuationRanking] as number ?? 50;
          return (
            <div key={key} className="radar-value-item">
              <div className="radar-value-label">{label}</div>
              <div className="radar-value-main">{rawLabel(v, key)}</div>
              <div className="radar-value-pctl">
                <div className="pctl-bar-container pctl-bar-sm">
                  <div className="pctl-bar" style={{ width: `${pctl}%` }} />
                </div>
                <span style={{ fontSize: 11, color: '#888' }}>P{pctl.toFixed(0)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
