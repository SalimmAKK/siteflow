import React from 'react';
import { SitePlanDiagram } from './SitePlanDiagram';

const phases = [
  { num: 'PH-01', title: 'Planning', desc: 'Scope, budget, and crew assigned before a shovel touches ground.' },
  { num: 'PH-02', title: 'Permits', desc: 'Municipal approvals tracked with renewal reminders built in.' },
  { num: 'PH-03', title: 'Foundation', desc: 'Slab, footing, and reinforcement sign-offs logged per site.' },
  { num: 'PH-04', title: 'Structure', desc: 'Steel and concrete progress against the delivery schedule.' },
  { num: 'PH-05', title: 'MEP', desc: 'Electrical, plumbing, and HVAC coordinated across trades.' },
  { num: 'PH-06', title: 'Finishing', desc: 'Render, paint, and fit-out tracked room by room.' },
  { num: 'PH-07', title: 'Inspection', desc: 'Safety walkthroughs and compliance checks before sign-off.' },
  { num: 'PH-08', title: 'Handover', desc: 'Client walkthrough and documentation, closed out in one click.' },
];

export const PhasesSection: React.FC = () => (
  <section className="section" id="phases">
    <div className="wrap">
      <div className="phasewrap reveal">
        <div className="phasewrap-top">
          <div className="section-head">
            <div className="eyebrow mono">How it works</div>
            <h2>One board per site, eight phases from break-ground to handover.</h2>
          </div>
          <SitePlanDiagram />
        </div>
        <div className="phase-list">
          {phases.map((p) => (
            <div className="phase" key={p.num}>
              <span className="pnum">{p.num}</span>
              <h4>{p.title}</h4>
              <p>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
