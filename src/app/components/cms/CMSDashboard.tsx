/**
 * CMSDashboard — Container component.
 *
 * This is the ONLY file in the dashboard slice that is allowed to:
 *   • Define / own mock/seed data (or in production: call hooks / selectors)
 *   • Read from context (NavigationContext)
 *   • Construct the StatCardProps[] array (icon components live here, not in the view)
 *
 * It delegates ALL rendering to the stateless <DashboardView /> presentational tree.
 */
import React, { useContext } from 'react';
import {
  Users, ShoppingCart, DollarSign, TrendingUp,
  Clock, AlertTriangle,
} from 'lucide-react';
import { NavigationContext } from '../../App';
import { DashboardView } from './dashboard/DashboardView';
import type { StatCardProps }  from './dashboard/StatCard';
import type { OrderRow }       from './dashboard/RecentOrdersTable';
import type { StockAlertItem } from './dashboard/LowStockAlerts';
import type { MemberRow }      from './dashboard/RecentMembersTable';

// ─── Seed data ────────────────────────────────────────────────────────────────
// In a real application these would come from an API hook / global store.
// They live here — in the container — never inside the presentational components.

const STATS: StatCardProps[] = [
  {
    label: 'Total Members',
    value: '12,483',
    change: '+8.2%',
    trend: 'up',
    icon: Users,
    iconContainerClassName: 'bg-blue-50 text-blue-600',
  },
  {
    label: 'New Members (This Month)',
    value: '341',
    change: '+14%',
    trend: 'up',
    icon: TrendingUp,
    iconContainerClassName: 'bg-emerald-50 text-emerald-600',
  },
  {
    label: 'Web Orders Today',
    value: '58',
    change: '+3',
    trend: 'up',
    icon: ShoppingCart,
    iconContainerClassName: 'bg-purple-50 text-purple-600',
  },
  {
    label: "Today's Revenue",
    value: 'HK$24,160',
    change: '+11%',
    trend: 'up',
    icon: DollarSign,
    iconContainerClassName: 'bg-amber-50 text-amber-600',
  },
  {
    label: 'Pending Orders',
    value: '17',
    change: '-4',
    trend: 'down',
    icon: Clock,
    iconContainerClassName: 'bg-orange-50 text-orange-500',
  },
  {
    label: 'Low Stock Alerts',
    value: '9',
    change: '+3',
    trend: 'down',
    icon: AlertTriangle,
    iconContainerClassName: 'bg-red-50 text-red-600',
  },
];

const RECENT_ORDERS: OrderRow[] = [
  { id: 'ORD-20260001', customer: 'Chan Tai Man',  amount: 'HK$1,280', status: 'Pending',    date: '2026-03-19 09:14' },
  { id: 'ORD-20260002', customer: 'Lee Siu Ming',  amount: 'HK$560',   status: 'Processing', date: '2026-03-19 08:52' },
  { id: 'ORD-20260003', customer: 'Wong Ka Yan',   amount: 'HK$3,200', status: 'Shipped',    date: '2026-03-19 08:30' },
  { id: 'ORD-20260004', customer: 'Lam Wai Keung', amount: 'HK$980',   status: 'Delivered',  date: '2026-03-18 17:45' },
  { id: 'ORD-20260005', customer: 'Ng Mei Ling',   amount: 'HK$2,140', status: 'Cancelled',  date: '2026-03-18 16:20' },
];

const LOW_STOCK_ITEMS: StockAlertItem[] = [
  { sku: 'ELEC-0042', name: 'Wireless Earbuds Pro',    currentStock: 3,  threshold: 10 },
  { sku: 'FASH-0118', name: 'Slim Fit Blazer (L)',     currentStock: 1,  threshold: 5  },
  { sku: 'HOME-0205', name: 'Bamboo Chopping Board',   currentStock: 4,  threshold: 10 },
  { sku: 'ELEC-0099', name: 'USB-C Hub 7-in-1',        currentStock: 2,  threshold: 8  },
  { sku: 'FASH-0237', name: 'Canvas Tote Bag',         currentStock: 5,  threshold: 15 },
];

const RECENT_MEMBERS: MemberRow[] = [
  { name: 'Chan Siu Fai',   email: 'siu.fai@email.com',   vipLevel: 'Gold',   joinDate: '2026-03-19', status: 'Active' },
  { name: 'Ho Kin Ming',    email: 'kin.ming@email.com',  vipLevel: 'Silver', joinDate: '2026-03-18', status: 'Active' },
  { name: 'Yeung Mei Kuen', email: 'mei.kuen@email.com',  vipLevel: 'Bronze', joinDate: '2026-03-18', status: 'Active' },
  { name: 'Tsang Wai Lun',  email: 'wai.lun@email.com',   vipLevel: 'Gold',   joinDate: '2026-03-17', status: 'Active' },
];

// ─── Container ────────────────────────────────────────────────────────────────

export function CMSDashboard(): React.ReactElement {
  const { navigateTo } = useContext(NavigationContext);

  return (
    <DashboardView
      // ── Header ──────────────────────────────────────────────────────────────
      pageTitle="Dashboard"
      pageSubtitle="Thursday, 19 March 2026 — Welcome back, Admin"

      // ── KPI data ─────────────────────────────────────────────────────────────
      stats={STATS}

      // ── Table / list data ────────────────────────────────────────────────────
      recentOrders={RECENT_ORDERS}
      lowStockItems={LOW_STOCK_ITEMS}
      recentMembers={RECENT_MEMBERS}

      // ── Callbacks ────────────────────────────────────────────────────────────
      onExportReport={() => { /* TODO: trigger report export */ }}
      onViewAllOrders={() => navigateTo('web-orders')}
      onManageStock={() => navigateTo('products')}
      onViewAllMembers={() => navigateTo('members')}
    />
  );
}