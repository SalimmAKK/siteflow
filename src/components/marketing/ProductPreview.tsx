import React from 'react';

export const ProductPreview: React.FC = () => (
  <section className="section">
    <div className="wrap">
      <div className="section-head reveal">
        <div className="eyebrow mono">The dashboard</div>
        <h2>Every site, every phase, one screen.</h2>
      </div>
      <div className="preview-shell reveal">
        <div className="preview-top">
          <span className="mono">SiteFlow · Al Nakheel Villa Complex</span>
          <span className="mono">Updated 6 min ago</span>
        </div>
        <div className="kanban">
          <div className="kcol">
            <h4>Foundation</h4>
            <div className="ktask">Pour foundation slab<div className="bar"></div></div>
            <div className="ktask">Install rebar reinforcement<div className="bar"></div></div>
          </div>
          <div className="kcol">
            <h4>Structure</h4>
            <div className="ktask high">Order steel beams<div className="bar"></div></div>
            <div className="ktask">Coordinate crane delivery<div className="bar"></div></div>
          </div>
          <div className="kcol">
            <h4>MEP</h4>
            <div className="ktask">Install electrical conduit<div className="bar"></div></div>
            <div className="ktask high">Fix plumbing leak – Block B<div className="bar"></div></div>
          </div>
          <div className="kcol">
            <h4>Inspection</h4>
            <div className="ktask">
              Conduct safety walkthrough<div className="bar"></div>
              <div className="avatars"><span>AH</span><span>MK</span><span>RS</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
