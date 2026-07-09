// Open-Meteo 7-day forecast + construction-specific weather risk assessment.
// Open-Meteo is free and needs no API key: https://open-meteo.com

export interface DailyForecast {
  date: string; // yyyy-MM-dd (in the site's local timezone)
  tempMax: number; // °C
  tempMin: number; // °C
  precipSum: number; // mm
  precipProbability: number; // %
  windMax: number; // km/h
  weatherCode: number; // WMO code
}

export type RiskLevel = 'ok' | 'caution' | 'risky';

// The specific trades that are weather-sensitive. We deliberately do NOT flag
// "all outdoor work" — only work where heat/rain/wind materially affects quality
// or safety of the result.
export type SensitiveWork = 'Concrete pours' | 'Roofing' | 'Exterior finishing';
export const WEATHER_SENSITIVE_WORK: SensitiveWork[] = ['Concrete pours', 'Roofing', 'Exterior finishing'];

export interface DayRisk extends DailyForecast {
  level: RiskLevel;
  reasons: string[];
  affectedWork: SensitiveWork[];
}

// ── Thresholds (justifiable on a demo) ───────────────────────────────────────
// Heat: fresh concrete cures too fast / cracks and coatings won't set in extreme
// heat (ACI hot-weather concreting guidance sits around the mid-30s °C).
const HEAT_RISKY_C = 38;
const HEAT_CAUTION_C = 32;
// Rain: washes out fresh concrete, kills roof-membrane adhesion, ruins paint/render.
const RAIN_RISKY_MM = 5;
const RAIN_CAUTION_MM = 1;
const RAIN_PROB_RISKY = 60; // %
// Wind: unsafe for roofing / working at height and lifting sheet material.
const WIND_RISKY_KMH = 40;
const WIND_CAUTION_KMH = 30;

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * Fetch a 7-day daily forecast for a coordinate. No API key required.
 * Throws on network / API error so callers can decide how to degrade.
 */
export async function fetchForecast(lat: number, lng: number): Promise<DailyForecast[]> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weathercode,windspeed_10m_max',
    forecast_days: '7',
    timezone: 'auto',
  });
  const res = await fetch(`${OPEN_METEO_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`Open-Meteo request failed: ${res.status}`);
  const json = await res.json();
  const d = json?.daily;
  if (!d?.time) throw new Error('Open-Meteo returned no daily data');

  return d.time.map((date: string, i: number) => ({
    date,
    tempMax: d.temperature_2m_max?.[i] ?? NaN,
    tempMin: d.temperature_2m_min?.[i] ?? NaN,
    precipSum: d.precipitation_sum?.[i] ?? 0,
    precipProbability: d.precipitation_probability_max?.[i] ?? 0,
    windMax: d.windspeed_10m_max?.[i] ?? 0,
    weatherCode: d.weathercode?.[i] ?? 0,
  }));
}

/** Classify a single day's construction-work risk from its forecast. */
export function assessDay(day: DailyForecast): DayRisk {
  const reasons: string[] = [];
  const affected = new Set<SensitiveWork>();
  let level: RiskLevel = 'ok';
  const bump = (l: RiskLevel) => {
    if (l === 'risky') level = 'risky';
    else if (l === 'caution' && level === 'ok') level = 'caution';
  };

  // Heat — concrete pours and exterior finishing (coatings) suffer in extreme heat.
  if (day.tempMax >= HEAT_RISKY_C) {
    reasons.push(`Extreme heat ${Math.round(day.tempMax)}°C`);
    affected.add('Concrete pours');
    affected.add('Exterior finishing');
    bump('risky');
  } else if (day.tempMax >= HEAT_CAUTION_C) {
    reasons.push(`High heat ${Math.round(day.tempMax)}°C`);
    bump('caution');
  }

  // Rain — bad for fresh concrete, roofing adhesion, and exterior coatings.
  const rainRisky = day.precipSum >= RAIN_RISKY_MM || day.precipProbability >= RAIN_PROB_RISKY;
  if (rainRisky) {
    reasons.push(
      day.precipSum >= RAIN_RISKY_MM
        ? `Rain ${day.precipSum.toFixed(1)}mm`
        : `Rain likely (${day.precipProbability}%)`
    );
    affected.add('Concrete pours');
    affected.add('Roofing');
    affected.add('Exterior finishing');
    bump('risky');
  } else if (day.precipSum >= RAIN_CAUTION_MM) {
    reasons.push(`Light rain ${day.precipSum.toFixed(1)}mm`);
    bump('caution');
  }

  // Wind — unsafe for roofing / work at height.
  if (day.windMax >= WIND_RISKY_KMH) {
    reasons.push(`High wind ${Math.round(day.windMax)} km/h`);
    affected.add('Roofing');
    bump('risky');
  } else if (day.windMax >= WIND_CAUTION_KMH) {
    reasons.push(`Breezy ${Math.round(day.windMax)} km/h`);
    bump('caution');
  }

  return { ...day, level, reasons, affectedWork: [...affected] };
}

/** Assess a whole forecast. */
export const assessForecast = (days: DailyForecast[]): DayRisk[] => days.map(assessDay);

/**
 * Find the risk for a specific date (yyyy-MM-dd) within an assessed forecast.
 * Returns null when the date isn't in the 7-day window or the day is not flagged.
 */
export function riskForDate(days: DayRisk[] | undefined, dateStr: string): DayRisk | null {
  if (!days) return null;
  const match = days.find((d) => d.date === dateStr);
  return match && match.level !== 'ok' ? match : null;
}

// ── Weather-code presentation (WMO codes → short label) ───────────────────────
export function weatherLabel(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code <= 48) return 'Fog';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow showers';
  return 'Thunderstorm';
}

// ── Permanent mock forecast ──────────────────────────────────────────────────
// When true, forecasts are generated locally instead of calling Open-Meteo, so
// the weather UI always works (offline, demos, no network). Flip to false to use
// the live API via fetchForecast().
export const USE_MOCK_WEATHER = true;

const localISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Deterministic 7-day mock forecast starting today. Coordinates seed small
 * per-site variation so projects differ, but the mix of conditions is stable:
 * a couple of extreme-heat days, a rain day, and a windy day — enough to exercise
 * the concrete/roofing/exterior-finishing risk flags — plus a few clear days.
 */
export function mockForecast(lat: number, lng: number): DailyForecast[] {
  const seed = Math.abs(Math.round((lat + lng) * 10)) % 3;
  const template = [
    { tMax: 39, tMin: 29, rain: 0, prob: 0, wind: 14, code: 0 }, // risky: extreme heat
    { tMax: 42, tMin: 30, rain: 0, prob: 0, wind: 18, code: 0 }, // risky: extreme heat
    { tMax: 30, tMin: 22, rain: 9, prob: 80, wind: 22, code: 63 }, // risky: rain
    { tMax: 27, tMin: 20, rain: 0, prob: 10, wind: 12, code: 1 }, // ok
    { tMax: 34, tMin: 24, rain: 0, prob: 0, wind: 20, code: 2 }, // caution: high heat
    { tMax: 33, tMin: 23, rain: 0, prob: 5, wind: 46, code: 3 }, // risky: high wind
    { tMax: 28, tMin: 21, rain: 0.5, prob: 20, wind: 16, code: 1 }, // ok
  ];
  const today = new Date();
  return template.map((t, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const bump = ((seed + i) % 3) - 1; // -1..1 °C, keeps flags stable
    return {
      date: localISO(d),
      tempMax: t.tMax + bump,
      tempMin: t.tMin + bump,
      precipSum: t.rain,
      precipProbability: t.prob,
      windMax: t.wind,
      weatherCode: t.code,
    };
  });
}

// ── In-memory cache so Dashboard + Tasks don't refetch the same site ──────────
type CacheEntry = { at: number; data: DailyForecast[] };
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

/** Get a forecast (mock by default), with a short-lived cache keyed by coords. */
export async function getForecastCached(lat: number, lng: number): Promise<DailyForecast[]> {
  if (USE_MOCK_WEATHER) return mockForecast(lat, lng);
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;
  const data = await fetchForecast(lat, lng);
  CACHE.set(key, { at: Date.now(), data });
  return data;
}
