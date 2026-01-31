interface Metric {
  label: string;
  value: string;
  sub?: string;
}

interface Props {
  metrics: Metric[];
}

export function TabSummaryBar({ metrics }: Props) {
  if (metrics.length === 0) return null;

  return (
    <div className="tab-summary-bar">
      {metrics.map((m) => (
        <div key={m.label} className="tab-summary-metric">
          <div className="tab-summary-label">{m.label}</div>
          <div className="tab-summary-value">{m.value}</div>
          {m.sub && <div className="tab-summary-sub">{m.sub}</div>}
        </div>
      ))}
    </div>
  );
}
