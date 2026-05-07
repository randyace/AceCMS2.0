import React from 'react';
import {
  Users, ShoppingCart, DollarSign, Package, TrendingUp, TrendingDown,
  AlertTriangle, Clock, CheckCircle, XCircle, ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

const stats = [
  { label: 'Total Members', value: '12,483', change: '+8.2%', up: true, icon: Users, color: 'bg-blue-50 text-blue-600' },
  { label: 'New Members (This Month)', value: '341', change: '+14%', up: true, icon: TrendingUp, color: 'bg-green-50 text-green-600' },
  { label: 'Web Orders Today', value: '58', change: '+3', up: true, icon: ShoppingCart, color: 'bg-purple-50 text-purple-600' },
  { label: "Today's Revenue", value: 'HK$24,160', change: '+11%', up: true, icon: DollarSign, color: 'bg-amber-50 text-amber-600' },
  { label: 'Pending Orders', value: '17', change: '-4', up: false, icon: Clock, color: 'bg-orange-50 text-orange-500' },
  { label: 'Low Stock Alerts', value: '9', change: '+3', up: false, icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
];

const recentOrders = [
  { id: 'ORD-20260001', customer: 'Chan Tai Man', amount: 'HK$1,280', status: 'Pending', date: '2026-03-19 09:14' },
  { id: 'ORD-20260002', customer: 'Lee Siu Ming', amount: 'HK$560', status: 'Processing', date: '2026-03-19 08:52' },
  { id: 'ORD-20260003', customer: 'Wong Ka Yan', amount: 'HK$3,200', status: 'Shipped', date: '2026-03-19 08:30' },
  { id: 'ORD-20260004', customer: 'Lam Wai Keung', amount: 'HK$980', status: 'Delivered', date: '2026-03-18 17:45' },
  { id: 'ORD-20260005', customer: 'Ng Mei Ling', amount: 'HK$2,140', status: 'Cancelled', date: '2026-03-18 16:20' },
];

const recentMembers = [
  { name: 'Chan Siu Fai', email: 'siu.fai@email.com', level: 'Gold', joined: '2026-03-19' },
  { name: 'Ho Kin Ming', email: 'kin.ming@email.com', level: 'Silver', joined: '2026-03-18' },
  { name: 'Yeung Mei Kuen', email: 'mei.kuen@email.com', level: 'Bronze', joined: '2026-03-18' },
  { name: 'Tsang Wai Lun', email: 'wai.lun@email.com', level: 'Gold', joined: '2026-03-17' },
];

const lowStock = [
  { sku: 'ELEC-0042', name: 'Wireless Earbuds Pro', stock: 3, threshold: 10 },
  { sku: 'FASH-0118', name: 'Slim Fit Blazer (L)', stock: 1, threshold: 5 },
  { sku: 'HOME-0205', name: 'Bamboo Chopping Board', stock: 4, threshold: 10 },
  { sku: 'ELEC-0099', name: 'USB-C Hub 7-in-1', stock: 2, threshold: 8 },
  { sku: 'FASH-0237', name: 'Canvas Tote Bag', stock: 5, threshold: 15 },
];

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

export function CMSDashboard() {
  return (
    <div className="px-6 py-6 space-y-6">
      {/* Page Header */}
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

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center mb-3`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-muted-foreground text-xs mb-1 leading-tight">{s.label}</p>
                <p className="text-xl">{s.value}</p>
                <p className={`text-xs mt-1 flex items-center gap-0.5 ${s.up ? 'text-green-600' : 'text-red-500'}`}>
                  {s.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {s.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
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
                      <p className="text-primary">{order.id}</p>
                      <p className="text-xs text-muted-foreground">{order.date}</p>
                    </td>
                    <td className="px-4 py-2.5">{order.customer}</td>
                    <td className="px-4 py-2.5 text-right">{order.amount}</td>
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

        {/* Low Stock Alerts */}
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

      {/* Recent Members */}
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
                <tr key={m.email} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-2.5">{m.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{m.email}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${vipColors[m.level]}`}>
                      {m.level}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{m.joined}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                      <CheckCircle className="w-3.5 h-3.5" /> Active
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