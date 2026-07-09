import React, { useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import '@/styles/marketing.css';
import { Nav } from '@/components/marketing/Nav';
import { Footer } from '@/components/marketing/Footer';

const TIERS = [
  {
    name: 'Site',
    price: 'Contact for pricing',
    note: 'per active site / month',
    description: 'For a single active project that needs real tracking instead of a shared spreadsheet.',
    features: [
      '1 active project',
      'Crew & subcontractor roster',
      'Task & phase tracking',
      'Site diary',
    ],
    ctaLabel: 'Talk to sales',
    highlight: false,
  },
  {
    name: 'Contractor',
    price: 'Contact for pricing',
    note: 'per company / month',
    description: 'For contractors running several active sites who need one view across all of them.',
    features: [
      'Up to 10 active sites',
      'Everything in Site',
      'Budget tracking',
      'Client portal links',
      'Inspection & compliance alerts',
    ],
    ctaLabel: 'Talk to sales',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    note: 'volume pricing',
    description: 'For larger contractors and developers who need unlimited sites and a dedicated rollout.',
    features: [
      'Unlimited active sites',
      'Everything in Contractor',
      'Priority support',
      'Custom onboarding',
      'Roadmap input',
    ],
    ctaLabel: 'Contact sales',
    highlight: false,
  },
];

const FAQS = [
  {
    q: 'Can I switch tiers later?',
    a: "Yes. As the number of active sites you're running changes, you can move between tiers at any time — we'll work out the adjustment with you on your next billing cycle.",
  },
  {
    q: 'Is there a setup fee?',
    a: 'No setup fee on the Site or Contractor tiers. Enterprise rollouts that need custom onboarding or data migration are scoped and quoted separately, up front.',
  },
  {
    q: 'What counts as an active site?',
    a: 'Any project that isn’t archived. A completed project still counts as active until you archive it, since you may still need to reference its records during handover.',
  },
  {
    q: 'Do you offer annual pricing?',
    a: 'Yes — annual billing is available on the Contractor and Enterprise tiers. Ask your sales contact for details when you get in touch.',
  },
];

export const Pricing: React.FC = () => {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = containerRef.current?.querySelectorAll('.reveal') ?? [];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="marketing-page" ref={containerRef}>
      <Nav />

      <section className="section feature-page-hero">
        <div className="wrap">
          <div className="section-head reveal">
            <div className="eyebrow mono">Pricing</div>
            <h2>Priced by how many sites you're actually running.</h2>
            <p style={{ marginTop: '0.9rem', color: 'var(--ink-soft)', fontSize: '0.98rem' }}>
              No per-seat pricing to track — every tier includes your whole team. Talk to us
              and we'll size the right plan for your sites.
            </p>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="pricing-grid">
            {TIERS.map((tier) => (
              <div key={tier.name} className={`pricing-card reveal${tier.highlight ? ' highlight' : ''}`}>
                {tier.highlight && <span className="pricing-tag">Recommended</span>}
                <span className="pricing-name">{tier.name}</span>
                <span className="pricing-price">{tier.price}</span>
                <span className="pricing-note">{tier.note}</span>
                <p className="pricing-desc">{tier.description}</p>
                <ul className="pricing-features">
                  {tier.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <Link to="/contact" className="btn btn-primary">{tier.ctaLabel}</Link>
              </div>
            ))}
          </div>

          <p className="pricing-signin">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head reveal">
            <div className="eyebrow mono">Questions</div>
            <h2>Pricing FAQ.</h2>
          </div>
          <div className="faq-grid">
            {FAQS.map((item) => (
              <div className="faq-item reveal" key={item.q}>
                <h4>{item.q}</h4>
                <p>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
