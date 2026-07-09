import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import '@/styles/marketing.css';
import { Nav } from '@/components/marketing/Nav';
import { Footer } from '@/components/marketing/Footer';

// The four panels below are small, self-contained interactive previews (local
// state only, no data layer) so this page feels like a peek into the real app
// rather than static illustrations.

const ROSTER = [
  { id: 1, initials: 'AH', name: 'Ahmed H.', trade: 'Steel fixing', onSite: true },
  { id: 2, initials: 'MK', name: 'Mansour K.', trade: 'Electrical', onSite: true },
  { id: 3, initials: 'RS', name: 'Rami S.', trade: 'Plumbing', onSite: false },
];

const RosterMock: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'on' | 'off'>('all');
  const visible = ROSTER.filter((r) => (filter === 'all' ? true : filter === 'on' ? r.onSite : !r.onSite));

  return (
    <div className="feature-mock">
      <span className="mono">Crew · Al Nakheel Villa Complex</span>
      <div className="mock-filters">
        {(['all', 'on', 'off'] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`mock-chip${filter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'on' ? 'On site' : 'Off today'}
          </button>
        ))}
      </div>
      {visible.map((r) => (
        <div className="roster-row" key={r.id}>
          <div className="roster-avatar">{r.initials}</div>
          <span className="roster-name">{r.name}</span>
          <span className="roster-trade">{r.trade}</span>
          <span className={`roster-status${r.onSite ? '' : ' off'}`}>{r.onSite ? 'On site' : 'Off today'}</span>
        </div>
      ))}
    </div>
  );
};

const PHASES = [
  { id: 'foundation', label: 'Foundation', pct: 92, over: false, note: 'Tracking 8% under plan — comfortably on budget.' },
  { id: 'structure', label: 'Structure', pct: 108, over: true, note: 'Running 8% over plan — flagged automatically the week it happened.' },
  { id: 'mep', label: 'MEP', pct: 41, over: false, note: 'On pace for the phase — 41% of budget used so far.' },
];

const BudgetMock: React.FC = () => {
  const [selected, setSelected] = useState(PHASES[1].id); // default to the flagged phase
  const active = PHASES.find((p) => p.id === selected)!;

  return (
    <div className="feature-mock">
      <span className="mono">Budget · Phase burn rate</span>
      {PHASES.map((p) => (
        <div
          key={p.id}
          className={`budget-row${selected === p.id ? ' selected' : ''}`}
          onClick={() => setSelected(p.id)}
        >
          <div className="budget-row-head"><span>{p.label}</span><span>{p.pct}% of plan</span></div>
          <div className="budget-track">
            <div className={`budget-fill${p.over ? ' over' : ''}`} style={{ width: `${Math.min(p.pct, 100)}%` }}></div>
          </div>
        </div>
      ))}
      <div className="budget-note"><strong>{active.label}:</strong> {active.note}</div>
    </div>
  );
};

const ALERT_ITEMS = [
  { id: 1, label: 'Municipal permit renewal — Block B', date: 'Due tomorrow', due: true },
  { id: 2, label: 'Safety walkthrough — Structure phase', date: 'Due in 2 days', due: true },
  { id: 3, label: 'Fire system inspection', date: 'Due in 11 days', due: false },
];

const AlertsMock: React.FC = () => {
  const [acknowledged, setAcknowledged] = useState<number[]>([]);
  const toggle = (id: number) =>
    setAcknowledged((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="feature-mock">
      <span className="mono">Compliance · Upcoming (click to mark reviewed)</span>
      {ALERT_ITEMS.map((item) => {
        const done = acknowledged.includes(item.id);
        return (
          <div key={item.id} className={`alert-row${done ? ' done' : ''}`} onClick={() => toggle(item.id)}>
            <span className={`alert-dot${done ? ' done' : item.due ? ' due' : ''}`}></span>
            <span className="alert-label">{item.label}</span>
            <span className={`alert-date${done ? ' done' : ''}`}>{done ? 'Reviewed' : item.date}</span>
          </div>
        );
      })}
    </div>
  );
};

const PHONE_TASKS = [
  { id: 1, label: 'Pour foundation slab — mark complete', photo: false },
  { id: 2, label: 'Fix plumbing leak, Block B', photo: true },
];

const FieldAppMock: React.FC = () => {
  const [done, setDone] = useState<number[]>([]);
  const toggle = (id: number) => setDone((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="feature-mock">
      <span className="mono">Field app · Tap a task to mark complete</span>
      <div className="phone-frame">
        <div className="phone-screen">
          <span className="mono">Today · Structure</span>
          {PHONE_TASKS.map((t) => {
            const isDone = done.includes(t.id);
            return (
              <div key={t.id} className={`phone-task${isDone ? ' done' : ''}`} onClick={() => toggle(t.id)}>
                <div className="phone-task-row">
                  <span className="phone-check">{isDone ? '✓' : ''}</span>
                  <span>{t.label}</span>
                </div>
                {t.photo && <div className="phone-photo">+ photo attached</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const features = [
  {
    num: '01',
    title: 'Crew and subcontractor roster',
    body: (
      <>
        <p>Assign every trade — steel fixing, electrical, plumbing, HVAC — to a specific site and phase, then see at a glance who's actually on-site today versus who's scheduled but hasn't checked in.</p>
        <p>Filter by project when you need to staff a new phase, or by person when a subcontractor asks which sites their crew is covering this week. No more calling three foremen to find one answer.</p>
      </>
    ),
    mock: <RosterMock />,
  },
  {
    num: '02',
    title: 'Budget and progress tracking',
    body: (
      <>
        <p>Every phase carries its own budget line, and spend updates as invoices and material costs come in — not once a month when someone finally reconciles the spreadsheet.</p>
        <p>A phase that's tracking over plan is flagged immediately, so a manager sees the structure phase running 8% hot the week it happens, not the week the client asks why the budget report looks different from what they were told.</p>
      </>
    ),
    mock: <BudgetMock />,
  },
  {
    num: '03',
    title: 'Inspection and compliance alerts',
    body: (
      <>
        <p>Permit renewals, municipal approvals, and safety walkthroughs are tracked against their actual due dates, with reminders that fire days in advance instead of relying on someone remembering a WhatsApp message from three weeks ago.</p>
        <p>Overdue and due-soon items surface at the top of the dashboard for whoever owns compliance on that project, so a site doesn't sit idle waiting on paperwork nobody knew was expiring.</p>
      </>
    ),
    mock: <AlertsMock />,
  },
  {
    num: '04',
    title: 'Field app companion',
    body: (
      <>
        <p>Site supervisors update task status, log delays, and attach photos directly from their phone, standing on the site — no laptop, no end-of-day data entry back at the office.</p>
        <p>Photos and status changes sync straight into the same project timeline the office sees, so a plumbing leak reported at 9am shows up in the dashboard at 9am, not the next morning's stand-up.</p>
      </>
    ),
    mock: <FieldAppMock />,
  },
];

export const Features: React.FC = () => {
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
            <div className="eyebrow mono">What's included</div>
            <h2>Built for the site office and the field.</h2>
            <p style={{ marginTop: '0.9rem', color: 'var(--ink-soft)', fontSize: '0.98rem' }}>
              Four core capabilities, all reading from the same project data — so a change on
              the field app shows up in the office dashboard the same minute.
            </p>
          </div>
        </div>
      </section>

      {features.map((f, i) => (
        <section className="section" style={{ paddingTop: 0 }} key={f.num}>
          <div className="wrap">
            <div className={`feature-block reveal${i % 2 === 1 ? ' reverse' : ''}`}>
              <div className="feature-text">
                <span className="fnum mono">{f.num}</span>
                <h2>{f.title}</h2>
                {f.body}
              </div>
              <div className="feature-mock-wrap">{f.mock}</div>
            </div>
          </div>
        </section>
      ))}

      <section className="section">
        <div className="wrap">
          <div className="ctaband reveal">
            <h2>See these four working together on your own sites.</h2>
            <Link to="/contact" className="btn btn-primary">Request a demo</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
