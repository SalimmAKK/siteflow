import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => (
  <footer>
    <div className="wrap">
      <div className="brand" style={{ fontSize: '0.95rem' }}>
        <span className="brand-mark" style={{ width: 22, height: 22 }}></span>SiteFlow
      </div>
      <div className="flinks">
        <Link to="/#product">Product</Link>
        <Link to="/#phases">How it works</Link>
        <Link to="/features">Features</Link>
        <Link to="/pricing">Pricing</Link>
        <Link to="/contact">Contact</Link>
      </div>
      <span>Riyadh, Saudi Arabia</span>
    </div>
  </footer>
);
