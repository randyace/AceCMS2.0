import React from 'react';
import { Button } from '../../ui/button';
import { StatCard, StatCardProps } from './StatCard';
import { RecentOrdersTable, OrderRow } from './RecentOrdersTable';
import { LowStockAlerts, StockAlertItem } from './LowStockAlerts';
import { RecentMembersTable, MemberRow } from './RecentMembersTable';

// ─── Re-exports ───────────────────────────────────────────────────────────────
// Consumers can import all data-shape types from this single entry-point file
// without reaching into the individual atomic component files.
export type { StatCardProps, StatTrend }         from './StatCard';
export type { OrderRow, OrderStatus }            from './RecentOrdersTable';
export type { StockAlertItem }                   from './LowStockAlerts';
export type { MemberRow, VipLevel, MemberStatus } from './RecentMembersTable';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardViewProps {
  // ── Page header ─────────────────────────────────────────────────────────────
  /** Main heading text, e.g. "Dashboard". */
  pageTitle: string;
  /** Contextual subtitle, e.g. "Thursday, 19 March 2026 — Welcome back, Admin". */
  pageSubtitle: string;

  // ── KPI strip ───────────────────────────────────────────────────────────────
  /**
   * Ordered array of KPI card configurations.
   * Rendered in a responsive grid: 2 cols → 3 cols → 6 cols.
   */
  stats: StatCardProps[];

  // ── Recent orders ────────────────────────────────────────────────────────────
  /** Most recent orders to display in the orders table, most recent first. */
  recentOrders: OrderRow[];

  // ── Low-stock alerts ────────────────────────────────────────────────────────
  /** Products currently below their reorder threshold. */
  lowStockItems: StockAlertItem[];

  // ── Recent members ───────────────────────────────────────────────────────────
  /** Most recently registered member accounts, most recent first. */
  recentMembers: MemberRow[];

  // ── Callbacks ────────────────────────────────────────────────────────────────
  /** "Export Report" header button. */
  onExportReport: () => void;
  /** "View All Orders" header button and "View All" inside the orders card. */
  onViewAllOrders: () => void;
  /** "Manage Stock" CTA inside the low-stock card. */
  onManageStock: () => void;
  /** "View All" CTA inside the members card. */
  onViewAllMembers: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * DashboardView — the complete main-dashboard page layout.
 *
 * Purely a presentational assembler: zero internal state, zero side-effects.
 * Every piece of data and every user interaction is injected through props.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────────┐
 *   │  Page header + action buttons                       │
 *   ├─────────────────────────────────────────────────────┤
 *   │  KPI strip  (responsive 2 → 3 → 6 column grid)     │
 *   ├───────────────────────────┬─────────────────────────┤
 *   │  RecentOrdersTable        │  LowStockAlerts         │
 *   ├─────────────────────────────────────────────────────┤
 *   │  RecentMembersTable  (full width)                   │
 *   └─────────────────────────────────────────────────────┘
 */
export function DashboardView({
  pageTitle,
  pageSubtitle,
  stats,
  recentOrders,
  lowStockItems,
  recentMembers,
  onExportReport,
  onViewAllOrders,
  onManageStock,
  onViewAllMembers,
}: DashboardViewProps): React.ReactElement {
  return (
    <div className="px-6 py-6 space-y-6">

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground">{pageTitle}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{pageSubtitle}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onExportReport}>
            Export Report
          </Button>
          <Button size="sm" onClick={onViewAllOrders}>
            View All Orders
          </Button>
        </div>
      </div>

      {/* ── KPI Strip ────────────────────────────────────────────────────────── */}
      <div
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4"
        role="region"
        aria-label="Key performance indicators"
      >
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* ── Mid-Row: Orders + Low Stock ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentOrdersTable
          orders={recentOrders}
          onViewAll={onViewAllOrders}
        />
        <LowStockAlerts
          items={lowStockItems}
          onManageStock={onManageStock}
        />
      </div>

      {/* ── Recent Members ────────────────────────────────────────────────────── */}
      <RecentMembersTable
        members={recentMembers}
        onViewAll={onViewAllMembers}
      />

    </div>
  );
}
