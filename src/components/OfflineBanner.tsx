import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Global "you're offline" notice. The app shell (precached via the service
 * worker) still loads offline, but live Firestore data won't be current —
 * this makes that state explicit rather than leaving pages looking silently
 * stuck. Shows while offline, disappears the moment connectivity returns.
 */
export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-[60] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium"
      style={{ backgroundColor: 'var(--hazard)', color: 'var(--hazard-ink)' }}
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      You're offline — reconnect to see the latest.
    </div>
  );
};
