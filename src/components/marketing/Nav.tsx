import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export const Nav: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav>
      <div className="wrap">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark"></span>SiteFlow
        </Link>
        <div className="navlinks">
          <Link to="/#product">Product</Link>
          <Link to="/#phases">How it works</Link>
          <Link to="/features">Features</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <div className="nav-actions">
          <Link to="/login" className="btn btn-ghost">Sign in</Link>
          <Link to="/contact" className="btn btn-primary">Request a demo</Link>
        </div>
        <button
          type="button"
          className="nav-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="nav-mobile">
          <div className="nav-mobile-links">
            <Link to="/#product" onClick={() => setOpen(false)}>Product</Link>
            <Link to="/#phases" onClick={() => setOpen(false)}>How it works</Link>
            <Link to="/features" onClick={() => setOpen(false)}>Features</Link>
            <Link to="/pricing" onClick={() => setOpen(false)}>Pricing</Link>
            <Link to="/contact" onClick={() => setOpen(false)}>Contact</Link>
          </div>
          <div className="nav-mobile-actions">
            <Link to="/login" className="btn btn-ghost" onClick={() => setOpen(false)}>Sign in</Link>
            <Link to="/contact" className="btn btn-primary" onClick={() => setOpen(false)}>Request a demo</Link>
          </div>
        </div>
      )}
    </nav>
  );
};
