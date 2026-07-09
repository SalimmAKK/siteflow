import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * React Router's <Link> does client-side navigation and never scrolls to URL
 * fragments — that only happens on a full browser page load. Without this,
 * links like `to="/#phases"` (Nav, Hero CTA, Footer) silently do nothing when
 * clicked from a different route: the URL changes but the viewport doesn't
 * move, which reads as a dead link.
 *
 * Mounted once near the router root. On every location change: if the URL has
 * a hash, smooth-scroll to the matching element (retrying across a few frames
 * in case the target route is still mounting); otherwise reset scroll to top
 * so a fresh page doesn't inherit the previous page's scroll position.
 */
export const ScrollToHash: React.FC = () => {
  const { pathname, hash } = useLocation();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (hash) {
      const id = hash.slice(1);
      let attempts = 0;
      let frame: number;
      const tryScroll = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (attempts < 20) {
          attempts += 1;
          frame = requestAnimationFrame(tryScroll);
        }
      };
      tryScroll();
      return () => cancelAnimationFrame(frame);
    }

    if (prevPathname.current !== pathname) {
      window.scrollTo({ top: 0, left: 0 });
    }
    prevPathname.current = pathname;
  }, [pathname, hash]);

  return null;
};
