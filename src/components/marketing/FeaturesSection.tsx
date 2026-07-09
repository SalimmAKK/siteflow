import React from 'react';
import { Link } from 'react-router-dom';

const features = [
  { num: '01', title: 'Crew and subcontractor roster', desc: "Assign trades to sites and see who's on-site today, by project or by person." },
  { num: '02', title: 'Budget and progress tracking', desc: 'Burn rate against plan, phase by phase, updated as costs come in.' },
  { num: '03', title: 'Inspection and compliance alerts', desc: "Permit renewals and safety walkthroughs flagged before they're overdue." },
  { num: '04', title: 'Field app companion', desc: 'Site supervisors update task status and log photos from the field, no laptop needed.' },
];

export const FeaturesSection: React.FC = () => (
  <section className="section" id="features">
    <div className="wrap">
      <div className="section-head reveal">
        <div className="eyebrow mono">What's included</div>
        <h2>Built for the site office and the field.</h2>
      </div>
      <div className="feat-grid">
        {features.map((f) => (
          <div className="feat reveal" key={f.num}>
            <span className="fnum">{f.num}</span>
            <div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <Link to="/features" className="feat-more">See the full feature breakdown →</Link>
    </div>
  </section>
);
