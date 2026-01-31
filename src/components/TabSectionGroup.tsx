import type { ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  first?: boolean;
  children: ReactNode;
}

export function TabSectionGroup({ title, description, first, children }: Props) {
  return (
    <div className={`tab-section-group${first ? ' tab-section-group-first' : ''}`}>
      <div className="tab-section-group-header">
        <h3 className="tab-section-group-title">{title}</h3>
        {description && <p className="tab-section-group-desc">{description}</p>}
      </div>
      <div className="tab-section-group-content">
        {children}
      </div>
    </div>
  );
}
