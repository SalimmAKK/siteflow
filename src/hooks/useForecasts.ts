import { useEffect, useState } from 'react';
import { getForecastCached, assessForecast, type DayRisk } from '@/lib/weather';

type Locatable = { id: string; lat?: number; lng?: number };

/**
 * Fetch + risk-assess 7-day forecasts for every project that has coordinates.
 * Returns a map of projectId -> assessed days. Fetches are cached/deduped in
 * weather.ts so Dashboard and Tasks can both call this cheaply.
 */
export function useForecasts(projects: Locatable[]) {
  const [forecasts, setForecasts] = useState<Record<string, DayRisk[]>>({});
  const [loading, setLoading] = useState(false);

  const withCoords = projects.filter(
    (p) => typeof p.lat === 'number' && typeof p.lng === 'number'
  );
  // Stable dependency key so the effect only re-runs when the set of located
  // projects actually changes.
  const key = withCoords.map((p) => `${p.id}:${p.lat},${p.lng}`).sort().join('|');

  useEffect(() => {
    let active = true;
    if (withCoords.length === 0) {
      setForecasts({});
      return;
    }
    setLoading(true);
    Promise.all(
      withCoords.map(async (p) => {
        try {
          const days = await getForecastCached(p.lat!, p.lng!);
          return [p.id, assessForecast(days)] as const;
        } catch {
          return [p.id, [] as DayRisk[]] as const;
        }
      })
    ).then((entries) => {
      if (!active) return;
      setForecasts(Object.fromEntries(entries));
      setLoading(false);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { forecasts, loading };
}
