import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

/**
 * Registers the service worker and, when Workbox finds a new one waiting,
 * surfaces a persistent "refresh to update" toast instead of silently
 * swapping the app out from under the user mid-session.
 */
export const PWAUpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('Service worker registration failed:', error);
    },
  });

  const toastId = useRef<string | number | null>(null);

  useEffect(() => {
    if (!needRefresh) return;
    toastId.current = toast('New version available', {
      description: 'Refresh to get the latest version of SiteFlow.',
      duration: Infinity,
      action: {
        label: 'Refresh',
        onClick: () => updateServiceWorker(true),
      },
      onDismiss: () => setNeedRefresh(false),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needRefresh]);

  return null;
};
