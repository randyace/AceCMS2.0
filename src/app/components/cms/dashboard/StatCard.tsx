import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Directional trend used to colour the delta badge and pick the trend icon. */
export type StatTrend = 'up' | 'down' | 'neutral';

export interface StatCardProps {
  /** Short label rendered beneath the value, e.g. "Total Members". */
  label: string;
  /** Formatted primary value, e.g. "12,483" or "HK$24,160". */
  value: string;
  /** Formatted delta string, e.g. "+8.2%" or "-4". */
  change: string;
  /** Determines badge colour and trend icon direction. */
  trend: StatTrend;
  /**
   * Lucide-compatible icon component.
   * Must accept a `className` prop — all Lucide icons satisfy this.
   */
  icon: React.ComponentType<{ className?: string }>;
  /**
   * Tailwind classes applied to the icon container div (background + text colour).
   * Example: "bg-blue-50 text-blue-600"
   */
  iconContainerClassName: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TREND_STYLES: Record<
  StatTrend,
  { text: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  up:      { text: 'text-emerald-600', Icon: TrendingUp },
  down:    { text: 'text-red-500',     Icon: TrendingDown },
  neutral: { text: 'text-slate-400',   Icon: Minus },
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * StatCard — a single KPI tile.
 *
 * Pure presentational component. Accepts no internal state.
 * All data and styling intent is injected entirely via props.
 */
export function StatCard({
  label,
  value,
  change,
  trend,
  icon: Icon,
  iconContainerClassName,
}: StatCardProps): React.ReactElement {
  const { text: trendText, Icon: TrendIcon } = TREND_STYLES[trend];

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        {/* Icon bubble */}
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${iconContainerClassName}`}
          aria-hidden="true"
        >
          <Icon className="w-4 h-4" />
        </div>

        {/* Label */}
        <p className="text-muted-foreground text-xs mb-1 leading-tight">{label}</p>

        {/* Primary value */}
        <p className="text-xl">{value}</p>

        {/* Delta / change badge */}
        <p className={`text-xs mt-1 flex items-center gap-0.5 ${trendText}`}>
          <TrendIcon className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
          <span>{change}</span>
        </p>
      </CardContent>
    </Card>
  );
}
