import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Exhaustive union of every valid order status in the system. */
export type OrderStatus =
  | 'Pending'
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export interface OrderRow {
  /** Human-readable order reference, e.g. "ORD-20260001". */
  id: string;
  /** Full customer display name. */
  customer: string;
  /** Pre-formatted monetary string, e.g. "HK$1,280". */
  amount: string;
  /** Current fulfilment status. */
  status: OrderStatus;
  /** Display timestamp string, e.g. "2026-03-19 09:14". */
  date: string;
}

export interface RecentOrdersTableProps {
  /** Ordered list of order rows to display (most recent first by convention). */
  orders: OrderRow[];
  /** Invoked when the user clicks the "View All" CTA. */
  onViewAll: () => void;
}

// ─── Presentational helpers ───────────────────────────────────────────────────

/**
 * Maps every possible OrderStatus to a Tailwind badge class-string.
 * Defined here (not in a parent) because it is exclusively a visual concern.
 */
const STATUS_BADGE: Record<OrderStatus, string> = {
  Pending:    'bg-amber-100  text-amber-700',
  Processing: 'bg-blue-100   text-blue-700',
  Shipped:    'bg-purple-100 text-purple-700',
  Delivered:  'bg-emerald-100 text-emerald-700',
  Cancelled:  'bg-red-100    text-red-700',
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * RecentOrdersTable — tabular view of the most recent web orders.
 *
 * Pure presentational component. No internal state.
 * Interaction callbacks are fully prop-injected.
 */
export function RecentOrdersTable({
  orders,
  onViewAll,
}: RecentOrdersTableProps): React.ReactElement {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Recent Orders</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary"
          onClick={onViewAll}
        >
          View All
          <ArrowRight className="w-3.5 h-3.5 ml-1" aria-hidden="true" />
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Recent orders">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2 text-muted-foreground text-xs font-medium">
                  Order
                </th>
                <th className="text-left px-4 py-2 text-muted-foreground text-xs font-medium">
                  Customer
                </th>
                <th className="text-right px-4 py-2 text-muted-foreground text-xs font-medium">
                  Amount
                </th>
                <th className="text-right px-4 py-2 text-muted-foreground text-xs font-medium">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                >
                  {/* Order ID + timestamp */}
                  <td className="px-4 py-2.5">
                    <p className="text-primary font-mono text-xs">{order.id}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{order.date}</p>
                  </td>

                  {/* Customer name */}
                  <td className="px-4 py-2.5 text-sm">{order.customer}</td>

                  {/* Amount */}
                  <td className="px-4 py-2.5 text-right text-sm tabular-nums">
                    {order.amount}
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[order.status]}`}
                    >
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}

              {orders.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No recent orders.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
