/**
 * DashboardView.tsx
 *
 * Pure presentational assembler for the main CMS dashboard page.
 *
 * Rules enforced in this file:
 *   ✓  Zero hardcoded data — all data arrives via props
 *   ✓  Zero internal state (no useState / useReducer)
 *   ✓  Zero side-effects (no useEffect / useLayoutEffect)
 *   ✓  Mock data is injected ONLY as default parameter values,
 *      sourced exclusively from __fixtures__/dashboard.mocks.ts
 */
import React from 'react';
import { Button } from '../../ui/button';
import { StatCard, StatCardProps } from './StatCard';
import { RecentOrdersTable, OrderRow } from './RecentOrdersTable';
import { LowStockAlerts, StockAlertItem } from './LowStockAlerts';
import { RecentMembersTable, MemberRow } from './RecentMembersTable';
import {
  mockPageTitle,
  mockPageSubtitle,
  mockStats,
  mockRecentOrders,
  mockLowStockItems,
  mockRecentMembers,
} from './__fixtures__/dashboard.mocks';

// ─── Re-exports ───────────────────────────────────────────────────────────────
// Consumers can import every data-shape type from this single file.
export type { StatCardProps, StatTrend }          from './StatCard';
export type { OrderRow, OrderStatus }             from './RecentOrdersTable';
export type { StockAlertItem }                    from './LowStockAlerts';
export type { MemberRow, VipLevel, MemberStatus } from './RecentMembersTable';

// ─── Props interface ──────────────────────────────────────────────────────────

export interface DashboardViewProps {
  // ── Page header ─────────────────────────────────────────────────────────────
  /** Main heading text. Default: fixture value. */
  pageTitle?: string;
  /** Contextual subtitle shown beneath the heading. Default: fixture value. */
  pageSubtitle?: string;

  // ── KPI strip ───────────────────────────────────────────────────────────────
  /**
   * Ordered array of KPI card configurations.
   * Rendered in a responsive grid: 2 cols → 3 cols → 6 cols.
   * Default: fixture value.
   */
  stats?: StatCardProps[];

  // ── Recent orders ────────────────────────────────────────────────────────────
  /** Most-recent orders, newest first. Default: fixture value. */
  recentOrders?: OrderRow[];

  // ── Low-stock alerts ────────────────────────────────────────────────────────
  /** Products currently below their reorder threshold. Default: fixture value. */
  lowStockItems?: StockAlertItem[];

  // ── Recent members ───────────────────────────────────────────────────────────
  /** Most-recently registered members, newest first. Default: fixture value. */
  recentMembers?: MemberRow[];

  // ── Callbacks ────────────────────────────────────────────────────────────────
  /** Fired when the user clicks "Export Report". */
  onExportReport?: () => void;
  /** Fired when the user clicks "View All Orders" (header or table CTA). */
  onViewAllOrders?: () => void;
  /** Fired when the user clicks "Manage Stock". */
  onManageStock?: () => void;
  /** Fired when the user clicks "View All" in the members card. */
  onViewAllMembers?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * DashboardView
 *
 * Assembles the full dashboard page from its atomic child components.
 * All props are optional — fixtures supply the defaults so the component
 * renders correctly in Storybook / standalone preview with no props at all.
 *
 * Layout
 * ──────
 *   ┌─────────────────────────────────────────────────────┐
 *   │  Page header + action buttons                       │
 *   ├─────────────────────────────────────────────────────┤
 *   │  KPI strip  (2 → 3 → 6 column responsive grid)     │
 *   ├───────────────────────────┬─────────────────────────┤
 *   │  RecentOrdersTable        │  LowStockAlerts         │
 *   ├─────────────────────────────────────────────────────┤
 *   │  RecentMembersTable  (full width)                   │
 *   └─────────────────────────────────────────────────────┘
 */
export function DashboardView({
  // ── Data props — fixture defaults applied here, never inside the body ───────
  pageTitle     = mockPageTitle,
  pageSubtitle  = mockPageSubtitle,
  stats         = mockStats,
  recentOrders  = mockRecentOrders,
  lowStockItems = mockLowStockItems,
  recentMembers = mockRecentMembers,
  // ── Callback props — safe no-ops for standalone preview ─────────────────────
  onExportReport  = () => {},
  onViewAllOrders = () => {},
  onManageStock   = () => {},
  onViewAllMembers = () => {},
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
