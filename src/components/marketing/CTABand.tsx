import React from 'react';
import { Link } from 'react-router-dom';

export const CTABand: React.FC = () => (
  <section className="section" id="demo">
    <div className="wrap">
      <div className="ctaband reveal">
        <h2>Your next site walkthrough shouldn't start with "wait, who has the update?"</h2>
        <Link to="/contact" className="btn btn-primary">Request a demo</Link>
      </div>
    </div>
  </section>
);
