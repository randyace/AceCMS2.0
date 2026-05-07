import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StockAlertItem {
  /** Product SKU, e.g. "ELEC-0042". */
  sku: string;
  /** Display name of the product. */
  name: string;
  /** Current on-hand quantity. */
  currentStock: number;
  /**
   * Reorder threshold. The progress bar fills to
   * `Math.min(currentStock / threshold, 1) * 100 %`.
   */
  threshold: number;
}

export interface LowStockAlertsProps {
  /** List of products currently below their reorder threshold. */
  items: StockAlertItem[];
  /** Invoked when the user clicks "Manage Stock". */
  onManageStock: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stockCountColour(current: number, threshold: number): string {
  const ratio = threshold > 0 ? current / threshold : 1;
  if (ratio <= 0.25) return 'text-red-600';
  if (ratio <= 0.50) return 'text-amber-600';
  return 'text-slate-500';
}

function stockBarColour(current: number, threshold: number): string {
  const ratio = threshold > 0 ? current / threshold : 1;
  if (ratio <= 0.25) return 'bg-red-500';
  if (ratio <= 0.50) return 'bg-amber-500';
  return 'bg-emerald-500';
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * LowStockAlerts — a vertically-stacked list of low-inventory items,
 * each with a proportional fill-bar and a current/threshold counter.
 *
 * Pure presentational component. No internal state.
 * All data and interaction callbacks are prop-injected.
 */
export function LowStockAlerts({
  items,
  onManageStock,
}: LowStockAlertsProps): React.ReactElement {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle
            className="w-4 h-4 text-red-500 flex-shrink-0"
            aria-hidden="true"
          />
          Low Stock Alerts
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary"
          onClick={onManageStock}
        >
          Manage Stock
          <ArrowRight className="w-3.5 h-3.5 ml-1" aria-hidden="true" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {items.map((item) => {
          const fillPct   = Math.min((item.currentStock / Math.max(item.threshold, 1)) * 100, 100);
          const countCls  = stockCountColour(item.currentStock, item.threshold);
          const barCls    = stockBarColour(item.currentStock, item.threshold);

          return (
            <div
              key={item.sku}
              className="flex items-center justify-between gap-3"
              role="listitem"
              aria-label={`${item.name}: ${item.currentStock} of ${item.threshold} units`}
            >
              {/* Product info */}
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
              </div>

              {/* Fill bar + counter */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div
                  className="w-24 h-1.5 bg-muted rounded-full overflow-hidden"
                  aria-hidden="true"
                >
                  <div
                    className={`h-full rounded-full transition-all ${barCls}`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
                <span className={`text-xs font-medium w-14 text-right tabular-nums ${countCls}`}>
                  {item.currentStock}&thinsp;/&thinsp;{item.threshold}
                </span>
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            All products are adequately stocked.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
