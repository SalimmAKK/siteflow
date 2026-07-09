import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { sendContactRequest } from '@/lib/web3forms';
import '@/styles/marketing.css';
import { Nav } from '@/components/marketing/Nav';
import { Footer } from '@/components/marketing/Footer';

const SITE_COUNT_OPTIONS = ['1-5', '6-15', '16+'];

export const Contact: React.FC = () => {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [siteCount, setSiteCount] = useState(SITE_COUNT_OPTIONS[0]);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const resetForm = () => {
    setName('');
    setCompany('');
    setEmail('');
    setPhone('');
    setSiteCount(SITE_COUNT_OPTIONS[0]);
    setMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await sendContactRequest({ name, company, email, phone, siteCount, message });
      toast.success("Thanks — we'll be in touch within one business day.");
      resetForm();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send your message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="marketing-page" ref={containerRef}>
      <Nav />

      <section className="section">
        <div className="wrap">
          <div className="section-head reveal">
            <div className="eyebrow mono">Get in touch</div>
            <h2>Talk to the SiteFlow team.</h2>
            <p style={{ marginTop: '0.9rem', color: 'var(--ink-soft)', fontSize: '0.98rem' }}>
              Tell us about your sites and we'll get back to you within one business day.
            </p>
          </div>

          <div className="contact-grid">
            <form className="contact-form reveal" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-field">
                  <label className="form-label" htmlFor="contact-name">Full name</label>
                  <input
                    id="contact-name"
                    className="form-input"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="contact-company">Company</label>
                  <input
                    id="contact-company"
                    className="form-input"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label className="form-label" htmlFor="contact-email">Email</label>
                  <input
                    id="contact-email"
                    type="email"
                    className="form-input"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="contact-phone">
                    Phone <span className="form-optional">(optional)</span>
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="contact-sites">Number of active sites</label>
                <select
                  id="contact-sites"
                  className="form-input"
                  value={siteCount}
                  onChange={(e) => setSiteCount(e.target.value)}
                >
                  {SITE_COUNT_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="contact-message">Message</label>
                <textarea
                  id="contact-message"
                  className="form-input form-textarea"
                  required
                  rows={5}
                  placeholder="What are you hoping SiteFlow can help with?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send message'}
              </button>
            </form>

            <div className="contact-info reveal">
              <div className="contact-info-item">
                <span className="mono">Location</span>
                <p>Riyadh, Saudi Arabia</p>
              </div>
              <div className="contact-info-item">
                <span className="mono">Email</span>
                <p><a href="mailto:hello@siteflow.app">hello@siteflow.app</a></p>
              </div>
              <div className="contact-info-item">
                <span className="mono">Already a customer?</span>
                <p><Link to="/login">Sign in</Link> instead of filling out this form.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
