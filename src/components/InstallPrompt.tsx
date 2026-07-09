import React, { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

const DISMISS_KEY = 'siteflow-install-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as unknown as { standalone?: boolean }).standalone === true;

const isIOS = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

/**
 * Chrome/Edge/Android fire `beforeinstallprompt`, which we capture and defer
 * so we can show it from our own styled banner instead of the native mini-bar.
 * iOS Safari never fires that event — install there is manual (Share ->
 * Add to Home Screen) — so we show brief instructions instead.
 */
export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    if (isStandalone() || dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (isIOS()) setShowIOSInstructions(true);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissed]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  if (dismissed || isStandalone()) return null;
  if (!deferredPrompt && !showIOSInstructions) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:w-96 z-50 rounded-2xl border border-border bg-card shadow-lg p-4 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: 'var(--blueprint)' }}
      >
        {deferredPrompt ? (
          <Download className="w-5 h-5 text-white" />
        ) : (
          <Share className="w-5 h-5 text-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Install SiteFlow</p>
        {deferredPrompt ? (
          <>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add SiteFlow to your home screen for quick, full-screen access.
            </p>
            <button
              onClick={install}
              className="mt-3 h-9 px-4 rounded-full text-sm font-semibold"
              style={{ backgroundColor: 'var(--hazard)', color: 'var(--hazard-ink)' }}
            >
              Install
            </button>
          </>
        ) : (
          <p className="text-xs text-muted-foreground mt-0.5">
            Tap the Share icon in Safari, then "Add to Home Screen".
          </p>
        )}
      </div>
      <button
        onClick={dismiss}
        className="text-muted-foreground hover:text-foreground shrink-0"
        aria-label="Dismiss install prompt"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
