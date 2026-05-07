/**
 * dashboard.mocks.ts
 *
 * Fixture data for the Dashboard slice.
 * This file is the ONLY place mock/seed data may live.
 * It is imported exclusively as default-prop values; it must never be
 * referenced from production runtime code paths.
 *
 * Icon components (lucide-react) are included here because StatCardProps
 * requires a React.ComponentType — they are not "hardcoded UI", they are
 * part of the data contract for the KPI card shape.
 */

import {
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import type { StatCardProps }  from '../StatCard';
import type { OrderRow }       from '../RecentOrdersTable';
import type { StockAlertItem } from '../LowStockAlerts';
import type { MemberRow }      from '../RecentMembersTable';

// ─── Page header ──────────────────────────────────────────────────────────────

export const mockPageTitle    = 'Dashboard';
export const mockPageSubtitle = 'Thursday, 19 March 2026 — Welcome back, Admin';

// ─── KPI stat cards ───────────────────────────────────────────────────────────

export const mockStats: StatCardProps[] = [
  {
    label:                  'Total Members',
    value:                  '12,483',
    change:                 '+8.2%',
    trend:                  'up',
    icon:                   Users,
    iconContainerClassName: 'bg-blue-50 text-blue-600',
  },
  {
    label:                  'New Members (This Month)',
    value:                  '341',
    change:                 '+14%',
    trend:                  'up',
    icon:                   TrendingUp,
    iconContainerClassName: 'bg-emerald-50 text-emerald-600',
  },
  {
    label:                  'Web Orders Today',
    value:                  '58',
    change:                 '+3',
    trend:                  'up',
    icon:                   ShoppingCart,
    iconContainerClassName: 'bg-purple-50 text-purple-600',
  },
  {
    label:                  "Today's Revenue",
    value:                  'HK$24,160',
    change:                 '+11%',
    trend:                  'up',
    icon:                   DollarSign,
    iconContainerClassName: 'bg-amber-50 text-amber-600',
  },
  {
    label:                  'Pending Orders',
    value:                  '17',
    change:                 '-4',
    trend:                  'down',
    icon:                   Clock,
    iconContainerClassName: 'bg-orange-50 text-orange-500',
  },
  {
    label:                  'Low Stock Alerts',
    value:                  '9',
    change:                 '+3',
    trend:                  'down',
    icon:                   AlertTriangle,
    iconContainerClassName: 'bg-red-50 text-red-600',
  },
];

// ─── Recent orders ────────────────────────────────────────────────────────────

export const mockRecentOrders: OrderRow[] = [
  { id: 'ORD-20260001', customer: 'Chan Tai Man',  amount: 'HK$1,280', status: 'Pending',    date: '2026-03-19 09:14' },
  { id: 'ORD-20260002', customer: 'Lee Siu Ming',  amount: 'HK$560',   status: 'Processing', date: '2026-03-19 08:52' },
  { id: 'ORD-20260003', customer: 'Wong Ka Yan',   amount: 'HK$3,200', status: 'Shipped',    date: '2026-03-19 08:30' },
  { id: 'ORD-20260004', customer: 'Lam Wai Keung', amount: 'HK$980',   status: 'Delivered',  date: '2026-03-18 17:45' },
  { id: 'ORD-20260005', customer: 'Ng Mei Ling',   amount: 'HK$2,140', status: 'Cancelled',  date: '2026-03-18 16:20' },
];

// ─── Low-stock alerts ─────────────────────────────────────────────────────────

export const mockLowStockItems: StockAlertItem[] = [
  { sku: 'ELEC-0042', name: 'Wireless Earbuds Pro',  currentStock: 3, threshold: 10 },
  { sku: 'FASH-0118', name: 'Slim Fit Blazer (L)',   currentStock: 1, threshold: 5  },
  { sku: 'HOME-0205', name: 'Bamboo Chopping Board', currentStock: 4, threshold: 10 },
  { sku: 'ELEC-0099', name: 'USB-C Hub 7-in-1',      currentStock: 2, threshold: 8  },
  { sku: 'FASH-0237', name: 'Canvas Tote Bag',       currentStock: 5, threshold: 15 },
];

// ─── Recent members ───────────────────────────────────────────────────────────

export const mockRecentMembers: MemberRow[] = [
  { name: 'Chan Siu Fai',   email: 'siu.fai@email.com',   vipLevel: 'Gold',   joinDate: '2026-03-19', status: 'Active' },
  { name: 'Ho Kin Ming',    email: 'kin.ming@email.com',  vipLevel: 'Silver', joinDate: '2026-03-18', status: 'Active' },
  { name: 'Yeung Mei Kuen', email: 'mei.kuen@email.com',  vipLevel: 'Bronze', joinDate: '2026-03-18', status: 'Active' },
  { name: 'Tsang Wai Lun',  email: 'wai.lun@email.com',   vipLevel: 'Gold',   joinDate: '2026-03-17', status: 'Active' },
];
