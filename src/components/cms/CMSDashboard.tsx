import React, { useState, useEffect } from 'react';
import {
  Users, ShoppingCart, DollarSign, Package, TrendingUp, TrendingDown,
  AlertTriangle, Clock, CheckCircle, ArrowRight, Loader2,
} from 'lucide-react';
import { adminService, orderService } from '../../services/api';
import type { Stats, Order, Member, LowStockAlert } from '../../services/api/types';
import CMSDashboardView from '../figma-ui/CMSDashboardView';
import { buildContainerContract } from '../containerContracts';

const statusColors: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700',
  Processing: 'bg-blue-100 text-blue-700',
  Shipped: 'bg-purple-100 text-purple-700',
  Delivered: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

const vipColors: Record<string, string> = {
  Gold: 'bg-amber-100 text-amber-700',
  Silver: 'bg-slate-100 text-slate-600',
  Bronze: 'bg-orange-100 text-orange-700',
};

const statIcons = [
  { icon: Users, color: 'bg-blue-50 text-blue-600' },
  { icon: TrendingUp, color: 'bg-green-50 text-green-600' },
  { icon: ShoppingCart, color: 'bg-purple-50 text-purple-600' },
  { icon: DollarSign, color: 'bg-amber-50 text-amber-600' },
  { icon: Clock, color: 'bg-orange-50 text-orange-500' },
  { icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
];

const statLabels = [
  'Total Members',
  'New Members (This Month)',
  'Web Orders Today',
  "Today's Revenue",
  'Pending Orders',
  'Low Stock Alerts',
];

export function CMSDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentMembers, setRecentMembers] = useState<Member[]>([]);
  const [lowStock, setLowStock] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, ordersData, membersData, lowStockData] = await Promise.all([
          adminService.getStats(),
          orderService.getOrders({ _limit: 5 }),
          adminService.getUsers({ _limit: 4 }),
          adminService.getLowStockAlerts(),
        ]);
        setStats(statsData);
        setRecentOrders(ordersData.data);
        setRecentMembers(membersData.data as unknown as Member[]);
        setLowStock(lowStockData.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);
  const containerContract = buildContainerContract({
    data: {
      stats,
      recentOrders,
      recentMembers,
      lowStock,
      error
    },
    uiState: {
      view: 'list'
    },
    asyncState: {
      loading: loading,
      saving: false,
      error: null,
    },
    callbacks: {
      noop: () => undefined
    },
    meta: {
      container: 'CMSDashboard'
    },
  });

  return <CMSDashboardView {...containerContract} />;
}

