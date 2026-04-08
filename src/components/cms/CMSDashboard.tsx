import React, { useState, useEffect } from 'react';
import {
  Users, ShoppingCart, DollarSign, Package, TrendingUp, TrendingDown,
  AlertTriangle, Clock, CheckCircle, ArrowRight, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { adminService, orderService } from '../../services/api';
import type { Stats, Order, Member, LowStockAlert } from '../../services/api/types';

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        Error: {error}
      </div>
    );
  }

  const statValues = stats
    ? [
        stats.totalMembers.toLocaleString(),
        stats.newMembersThisMonth.toLocaleString(),
        stats.webOrdersToday.toLocaleString(),
        `HK$${stats.todaysRevenue.toLocaleString()}`,
        stats.pendingOrders.toLocaleString(),
        stats.lowStockAlerts.toLocaleString(),
      ]
    : Array(6).fill('—');

  const statChanges = ['+8.2%', '+14%', '+3', '+11%', '-4', '+3'];
  const statUp = [true, true, true, true, false, false];

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Thursday, 19 March 2026 — Welcome back, Admin</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Export Report</Button>
          <Button size="sm">View All Orders</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statLabels.map((label, i) => {
          const Icon = statIcons[i].icon;
          return (
            <Card key={label} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className={`w-9 h-9 rounded-lg ${statIcons[i].color} flex items-center justify-center mb-3`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-muted-foreground text-xs mb-1 leading-tight">{label}</p>
                <p className="text-xl">{statValues[i]}</p>
                <p className={`text-xs mt-1 flex items-center gap-0.5 ${statUp[i] ? 'text-green-600' : 'text-red-500'}`}>
                  {statUp[i] ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {statChanges[i]}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Orders</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary">
              View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-muted-foreground text-xs">Order</th>
                  <th className="text-left px-4 py-2 text-muted-foreground text-xs">Customer</th>
                  <th className="text-right px-4 py-2 text-muted-foreground text-xs">Amount</th>
                  <th className="text-right px-4 py-2 text-muted-foreground text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="text-primary">{order.orderId}</p>
                      <p className="text-xs text-muted-foreground">{order.date}</p>
                    </td>
                    <td className="px-4 py-2.5">{order.customer}</td>
                    <td className="px-4 py-2.5 text-right">HK${order.amount.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${statusColors[order.status]}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Low Stock Alerts
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-primary">
              Manage Stock <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStock.map((item) => (
              <div key={item.sku} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.sku}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${Math.min((item.stock / item.threshold) * 100, 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium w-14 text-right ${item.stock <= 2 ? 'text-red-600' : 'text-amber-600'}`}>
                    {item.stock} / {item.threshold}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recently Registered Members</CardTitle>
          <Button variant="ghost" size="sm" className="text-primary">
            View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2 text-muted-foreground text-xs">Name</th>
                <th className="text-left px-4 py-2 text-muted-foreground text-xs">Email</th>
                <th className="text-left px-4 py-2 text-muted-foreground text-xs">VIP Level</th>
                <th className="text-left px-4 py-2 text-muted-foreground text-xs">Join Date</th>
                <th className="text-right px-4 py-2 text-muted-foreground text-xs">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentMembers.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-2.5">{m.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{m.email}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${vipColors[m.level]}`}>
                      {m.level}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{m.joinDate}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                      <CheckCircle className="w-3.5 h-3.5" /> {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}