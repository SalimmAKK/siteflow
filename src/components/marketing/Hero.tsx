import React from 'react';
import { Link } from 'react-router-dom';
import { HeroDashboardPreview } from './HeroDashboardPreview';

export const Hero: React.FC = () => (
  <section className="hero">
    <div className="hero-grid"></div>
    <div className="wrap">
      <div>
        <div className="eyebrow mono">Site operations platform · built for KSA contractors</div>
        <h1>Run every site from one dashboard, <em>not five WhatsApp groups.</em></h1>
        <p className="lede">
          SiteFlow tracks crew, budget, and inspections across every active project, from
          ground-breaking to handover, so nothing gets missed between the site office and the
          spreadsheet.
        </p>
        <div className="hero-ctas">
          <Link to="/contact" className="btn btn-primary">Request a demo</Link>
          <Link to="/#phases" className="btn btn-ghost">See how it works</Link>
        </div>
        <div className="hero-stats">
          <div><span className="num">5</span><span className="lab">active sites, one view</span></div>
          <div><span className="num">8</span><span className="lab">phases tracked per project</span></div>
          <div><span className="num">0</span><span className="lab">missed inspection alerts</span></div>
        </div>
      </div>
      <HeroDashboardPreview />
    </div>
  </section>
);
