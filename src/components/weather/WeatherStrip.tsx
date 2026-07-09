import React from 'react';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  Snowflake,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { weatherLabel, type DayRisk } from '@/lib/weather';

const HAZARD = '#F2B705';
const DANGER = '#DC2626';

const WeatherIcon: React.FC<{ code: number; className?: string }> = ({ code, className }) => {
  const cls = className ?? 'w-4 h-4';
  if (code === 0) return <Sun className={cls} />;
  if (code <= 2) return <CloudSun className={cls} />;
  if (code === 3) return <Cloud className={cls} />;
  if (code <= 48) return <CloudFog className={cls} />;
  if (code <= 57) return <CloudDrizzle className={cls} />;
  if (code <= 67) return <CloudRain className={cls} />;
  if (code <= 77) return <Snowflake className={cls} />;
  if (code <= 82) return <CloudRain className={cls} />;
  if (code <= 86) return <Snowflake className={cls} />;
  return <CloudLightning className={cls} />;
};

const parseDay = (iso: string) => {
  // iso is yyyy-MM-dd; append time so it parses in local tz consistently
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
};

export const WeatherStrip: React.FC<{ days: DayRisk[] }> = ({ days }) => {
  if (!days || days.length === 0) {
    return <p className="text-xs text-muted-foreground">Forecast unavailable.</p>;
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {days.map((d) => {
        const day = parseDay(d.date);
        const accent = d.level === 'risky' ? DANGER : d.level === 'caution' ? HAZARD : undefined;
        const tooltip =
          d.reasons.length > 0
            ? `${d.reasons.join(' · ')}${d.affectedWork.length ? ` — affects ${d.affectedWork.join(', ')}` : ''}`
            : weatherLabel(d.weatherCode);
        return (
          <div
            key={d.date}
            title={tooltip}
            className={cn(
              'relative shrink-0 w-[68px] rounded-xl border p-2 text-center transition-colors',
              d.level === 'ok' ? 'border-border bg-background/40' : 'bg-card'
            )}
            style={d.level !== 'ok' ? { borderColor: accent } : undefined}
          >
            {d.level !== 'ok' && (
              <AlertTriangle
                className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5"
                style={{ color: accent }}
                fill={d.level === 'risky' ? accent : 'none'}
              />
            )}
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {day ? format(day, 'EEE') : ''}
            </p>
            <div className="flex justify-center my-1" style={{ color: accent ?? 'var(--blueprint)' }}>
              <WeatherIcon code={d.weatherCode} />
            </div>
            <p className="text-xs font-bold text-foreground leading-none">{Math.round(d.tempMax)}°</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{Math.round(d.tempMin)}°</p>
          </div>
        );
      })}
    </div>
  );
};
