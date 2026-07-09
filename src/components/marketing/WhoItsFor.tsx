import React from 'react';

const audiences = [
  { label: 'General contractors', desc: 'One view across every active site, so budget and schedule risk surfaces before it becomes a client conversation.' },
  { label: 'Subcontractors', desc: 'See exactly which trades and tasks you own on each site, without chasing the main contractor for status.' },
  { label: 'Site supervisors', desc: 'Log progress and flag issues from the field, so the office isn’t finding out about a problem a week late.' },
];

export const WhoItsFor: React.FC = () => (
  <section className="section">
    <div className="wrap">
      <div className="section-head reveal">
        <div className="eyebrow mono">Who it's for</div>
        <h2>Built around how a site actually runs.</h2>
      </div>
      <div className="audience-grid">
        {audiences.map((a) => (
          <div className="audience-card reveal" key={a.label}>
            <span className="mono">Role</span>
            <h3>{a.label}</h3>
            <p>{a.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
