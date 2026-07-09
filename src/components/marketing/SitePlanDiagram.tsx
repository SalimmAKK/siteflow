import React from 'react';

export const SitePlanDiagram: React.FC = () => (
  <div className="siteplan">
    <div className="siteplan-head">
      <span className="mono">Site plan · PH-04</span>
      <span className="mono">Al Nakheel Villa Complex</span>
    </div>
    <svg viewBox="0 0 320 300" role="img" aria-label="Site plan diagram showing construction phase progression">
      <line x1="40" y1="20" x2="40" y2="280" stroke="#DFD6BF" strokeWidth="1.5" strokeDasharray="3 5" />
      <g>
        <circle cx="40" cy="24" r="6" fill="#26456B" />
        <text x="58" y="20" className="node-label">PH-01</text>
        <text x="58" y="33" className="node-title">Planning</text>
      </g>
      <g>
        <circle cx="40" cy="70" r="6" fill="#26456B" />
        <text x="58" y="66" className="node-label">PH-02</text>
        <text x="58" y="79" className="node-title">Permits</text>
      </g>
      <g>
        <circle cx="40" cy="116" r="6" fill="#26456B" />
        <text x="58" y="112" className="node-label">PH-03</text>
        <text x="58" y="125" className="node-title">Foundation</text>
      </g>
      <g>
        <circle cx="40" cy="162" r="7" fill="#F2B705" stroke="#5A3E00" strokeWidth="1" />
        <text x="58" y="158" className="node-label">PH-04</text>
        <text x="58" y="171" className="node-title">Structure — in progress</text>
      </g>
      <g opacity="0.45">
        <circle cx="40" cy="208" r="6" fill="#A7A38D" />
        <text x="58" y="204" className="node-label">PH-05</text>
        <text x="58" y="217" className="node-title">MEP</text>
      </g>
      <g opacity="0.45">
        <circle cx="40" cy="254" r="6" fill="#A7A38D" />
        <text x="58" y="250" className="node-label">PH-06</text>
        <text x="58" y="263" className="node-title">Finishing</text>
      </g>
    </svg>
  </div>
);
