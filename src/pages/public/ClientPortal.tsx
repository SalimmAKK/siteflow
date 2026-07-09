import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SHARE_COLLECTION, type PortalSnapshot } from '@/lib/clientPortal';
import { Logo } from '@/components/Logo';
import { CheckCircle2, Circle, Clock, Flag, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const BLUEPRINT = '#26456B';
const HAZARD = '#F2B705';

const ProgressRing: React.FC<{ value: number }> = ({ value }) => {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="relative w-[140px] h-[140px] shrink-0">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke={BLUEPRINT}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-foreground leading-none">{value}%</span>
        <span className="text-xs text-muted-foreground mt-1">complete</span>
      </div>
    </div>
  );
};

const fmtDate = (iso: string | null, pattern = 'MMM d, yyyy') => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : format(d, pattern);
};

export const ClientPortal: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [snapshot, setSnapshot] = useState<PortalSnapshot | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading');

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) {
        setState('notfound');
        return;
      }
      try {
        const snap = await getDoc(doc(db, SHARE_COLLECTION, token));
        if (!active) return;
        if (snap.exists()) {
          setSnapshot(snap.data() as PortalSnapshot);
          setState('ready');
        } else {
          setState('notfound');
        }
      } catch {
        if (active) setState('notfound');
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo className="h-7 text-foreground" />
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Client Portal
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {state === 'loading' && (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mb-3" />
            <p className="text-sm">Loading project…</p>
          </div>
        )}

        {state === 'notfound' && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Flag className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-semibold">Link unavailable</h1>
            <p className="text-muted-foreground max-w-sm mt-2">
              This share link is invalid or has been revoked. Please contact your project
              manager for an up-to-date link.
            </p>
          </div>
        )}

        {state === 'ready' && snapshot && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Title */}
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
                Project status
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{snapshot.projectName}</h1>
            </div>

            {/* Progress + phase */}
            <div className="rounded-2xl border border-border bg-card shadow-sm p-6 flex flex-col sm:flex-row items-center gap-6">
              <ProgressRing value={snapshot.progress} />
              <div className="flex-1 w-full space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                    Current phase
                  </p>
                  <p className="text-lg font-semibold text-foreground">{snapshot.currentPhase}</p>
                </div>
                <div className="border-t border-border/60 pt-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5" style={{ color: HAZARD }} />
                    Upcoming milestone
                  </p>
                  <p className="text-base font-medium text-foreground">{snapshot.upcomingMilestone}</p>
                  {fmtDate(snapshot.upcomingMilestoneDate) && (
                    <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Target: {fmtDate(snapshot.upcomingMilestoneDate)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Recent updates */}
            <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
              <h2 className="text-base font-semibold text-foreground mb-4">Recent updates</h2>
              {snapshot.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No updates yet.</p>
              ) : (
                <ul className="space-y-3">
                  {snapshot.recentActivity.map((item, i) => {
                    const done = item.status === 'Completed';
                    return (
                      <li key={i} className="flex items-start gap-3">
                        {done ? (
                          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: BLUEPRINT }} />
                        ) : (
                          <Circle className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground leading-snug">{item.label}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {item.status}
                            {fmtDate(item.date, 'MMM d') && ` · ${fmtDate(item.date, 'MMM d')}`}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {snapshot.updatedAt?.toDate && (
              <p className="text-center text-xs text-muted-foreground">
                Last updated {format(snapshot.updatedAt.toDate(), 'MMMM d, yyyy')}
              </p>
            )}
          </div>
        )}
      </main>

      <footer className="max-w-3xl mx-auto px-6 py-8 text-center">
        <p className="text-xs text-muted-foreground">Powered by SiteFlow</p>
      </footer>
    </div>
  );
};
