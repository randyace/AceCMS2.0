import React, { useState } from 'react';
import { Plus, Edit, Trash2, Search, ChevronLeft, Shield, Key, Activity, Lock } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { toast } from 'sonner@2.0.3';

type AdminRole = 'super_admin' | 'content_manager' | 'order_manager' | 'product_manager' | 'customer_service';
type AdminStatus = 'active' | 'inactive' | 'suspended';

interface Permission {
  module: string; read: boolean; write: boolean; delete: boolean;
}

interface AdminUser {
  id: string; name: string; email: string; role: AdminRole; status: AdminStatus;
  lastLogin: string; twoFAEnabled: boolean; ipWhitelist: string;
  permissions: Permission[]; createdAt: string;
}

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin', content_manager: 'Content Manager',
  order_manager: 'Order Manager', product_manager: 'Product Manager', customer_service: 'Customer Service',
};
const ROLE_COLORS: Record<AdminRole, string> = {
  super_admin: 'bg-primary/10 text-primary', content_manager: 'bg-blue-100 text-blue-700',
  order_manager: 'bg-purple-100 text-purple-700', product_manager: 'bg-amber-100 text-amber-700',
  customer_service: 'bg-green-100 text-green-700',
};
const STATUS_COLORS: Record<AdminStatus, string> = {
  active: 'bg-green-100 text-green-700', inactive: 'bg-muted text-muted-foreground', suspended: 'bg-red-100 text-red-700',
};

const DEFAULT_PERMISSIONS: Permission[] = [
  { module: 'Dashboard', read: true, write: false, delete: false },
  { module: 'Content Management', read: true, write: true, delete: false },
  { module: 'News Management', read: true, write: true, delete: false },
  { module: 'Products', read: true, write: true, delete: false },
  { module: 'Categories', read: true, write: true, delete: false },
  { module: 'Web Orders', read: true, write: true, delete: false },
  { module: 'Purchase Orders', read: true, write: false, delete: false },
  { module: 'Members', read: true, write: false, delete: false },
  { module: 'Suppliers', read: true, write: false, delete: false },
  { module: 'Admin Users', read: false, write: false, delete: false },
  { module: 'Website Settings', read: false, write: false, delete: false },
];

const SUPER_ADMIN_PERMISSIONS: Permission[] = DEFAULT_PERMISSIONS.map((p) => ({ ...p, read: true, write: true, delete: true }));

const INITIAL_ADMINS: AdminUser[] = [
  { id: 'a1', name: 'Super Admin', email: 'admin@shopco.com', role: 'super_admin', status: 'active', lastLogin: '2026-03-19 09:05', twoFAEnabled: true, ipWhitelist: '', permissions: SUPER_ADMIN_PERMISSIONS, createdAt: '2024-01-01' },
  { id: 'a2', name: 'Mary Cheung', email: 'mary@shopco.com', role: 'content_manager', status: 'active', lastLogin: '2026-03-19 08:30', twoFAEnabled: false, ipWhitelist: '', permissions: DEFAULT_PERMISSIONS, createdAt: '2024-03-15' },
  { id: 'a3', name: 'Kevin Ng', email: 'kevin@shopco.com', role: 'order_manager', status: 'active', lastLogin: '2026-03-18 17:00', twoFAEnabled: true, ipWhitelist: '203.0.113.0', permissions: DEFAULT_PERMISSIONS, createdAt: '2024-06-20' },
  { id: 'a4', name: 'Linda To', email: 'linda@shopco.com', role: 'customer_service', status: 'inactive', lastLogin: '2026-02-10 14:00', twoFAEnabled: false, ipWhitelist: '', permissions: DEFAULT_PERMISSIONS, createdAt: '2025-01-10' },
];

const ACTIVITY_LOG = [
  { admin: 'Super Admin', action: 'Updated product ELEC-0042 pricing', time: '2026-03-19 09:10', ip: '192.168.1.1' },
  { admin: 'Mary Cheung', action: 'Published article "Spring Collection 2026"', time: '2026-03-19 08:35', ip: '192.168.1.45' },
  { admin: 'Kevin Ng', action: 'Confirmed order ORD-20260001', time: '2026-03-18 16:55', ip: '203.0.113.0' },
  { admin: 'Super Admin', action: 'Added new member Chan Siu Fai', time: '2026-03-18 15:20', ip: '192.168.1.1' },
  { admin: 'Mary Cheung', action: 'Deleted news draft "Old Promotion"', time: '2026-03-18 14:00', ip: '192.168.1.45' },
];

export function AdminUsers() {
  const [admins, setAdmins] = useState<AdminUser[]>(INITIAL_ADMINS);
  const [view, setView] = useState<'list' | 'edit' | 'log'>('list');
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'permissions' | 'security'>('profile');

  const openEdit = (a: AdminUser) => { setEditingAdmin(JSON.parse(JSON.stringify(a))); setView('edit'); setActiveTab('profile'); };
  const openCreate = () => {
    setEditingAdmin({
      id: `admin-${Date.now()}`, name: '', email: '', role: 'content_manager', status: 'active',
      lastLogin: '—', twoFAEnabled: false, ipWhitelist: '',
      permissions: JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)), createdAt: new Date().toISOString().split('T')[0],
    });
    setView('edit'); setActiveTab('profile');
  };

  const handleSave = () => {
    if (!editingAdmin) return;
    setAdmins((prev) => {
      const ex = prev.find((a) => a.id === editingAdmin.id);
      return ex ? prev.map((a) => a.id === editingAdmin.id ? editingAdmin : a) : [...prev, editingAdmin];
    });
    toast.success('Admin user saved'); setView('list');
  };

  const handleDelete = (id: string) => {
    if (id === 'a1') { toast.error('Cannot delete Super Admin'); return; }
    setAdmins((prev) => prev.filter((a) => a.id !== id));
    toast.success('Admin user deleted');
  };

  const update = <K extends keyof AdminUser>(f: K, v: AdminUser[K]) => setEditingAdmin((prev) => prev ? { ...prev, [f]: v } : prev);
  const updatePermission = (module: string, field: 'read' | 'write' | 'delete', value: boolean) =>
    setEditingAdmin((prev) => prev ? { ...prev, permissions: prev.permissions.map((p) => p.module === module ? { ...p, [field]: value } : p) } : prev);

  const filtered = admins.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase()));

  if (view === 'log') {
    return (
      <main className="px-6 py-6 space-y-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => setView('list')} className="hover:text-primary flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Admin Users</button>
          <span>/</span><span className="text-foreground">Activity Log</span>
        </div>
        <h1>System Activity Log</h1>
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground">Admin</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground">Action</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground">Time</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {ACTIVITY_LOG.map((log, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-medium">{log.admin}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{log.action}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{log.time}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{log.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (view === 'edit' && editingAdmin) {
    return (
      <main className="px-6 py-6 space-y-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <button onClick={() => setView('list')} className="hover:text-primary flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Admin Users</button>
          <span>/</span><span className="text-foreground">{editingAdmin.name || 'New Admin'}</span>
        </div>
        <div className="flex items-center justify-between px-6">
          <h1>{editingAdmin.id.startsWith('admin-') ? 'New Admin User' : editingAdmin.name}</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setView('list')}>Cancel</Button>
            <Button onClick={handleSave}>Save Admin</Button>
          </div>
        </div>

        <div className="flex gap-0 border-b border-border">
          {[['profile', 'Profile'], ['permissions', 'Permissions'], ['security', 'Security']] .map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id as typeof activeTab)} className={`px-5 py-2.5 text-sm border-b-2 -mb-px transition-colors ${activeTab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{label}</button>
          ))}
        </div>

        {activeTab === 'profile' && (
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Full Name</label>
                  <Input value={editingAdmin.name} onChange={(e) => update('name', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Email</label>
                  <Input type="email" value={editingAdmin.email} onChange={(e) => update('email', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Role</label>
                  <select className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background" value={editingAdmin.role} onChange={(e) => update('role', e.target.value as AdminRole)}>
                    {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Status</label>
                  <select className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background" value={editingAdmin.status} onChange={(e) => update('status', e.target.value as AdminStatus)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'permissions' && (
          <Card>
            <CardHeader><CardTitle className="text-base">Module Permissions</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs text-muted-foreground">Module</th>
                    <th className="text-center px-4 py-2 text-xs text-muted-foreground">Read</th>
                    <th className="text-center px-4 py-2 text-xs text-muted-foreground">Write</th>
                    <th className="text-center px-4 py-2 text-xs text-muted-foreground">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {editingAdmin.permissions.map((perm) => (
                    <tr key={perm.module} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5">{perm.module}</td>
                      <td className="px-4 py-2.5 text-center"><Switch checked={perm.read} onCheckedChange={(v) => updatePermission(perm.module, 'read', v)} /></td>
                      <td className="px-4 py-2.5 text-center"><Switch checked={perm.write} disabled={!perm.read} onCheckedChange={(v) => updatePermission(perm.module, 'write', v)} /></td>
                      <td className="px-4 py-2.5 text-center"><Switch checked={perm.delete} disabled={!perm.write} onCheckedChange={(v) => updatePermission(perm.module, 'delete', v)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {activeTab === 'security' && (
          <Card>
            <CardHeader><CardTitle className="text-base">Security Settings</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Two-Factor Authentication (2FA)</p>
                  <p className="text-xs text-muted-foreground">Require 2FA for this admin account</p>
                </div>
                <Switch checked={editingAdmin.twoFAEnabled} onCheckedChange={(v) => update('twoFAEnabled', v)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">IP Whitelist</label>
                <Input value={editingAdmin.ipWhitelist} onChange={(e) => update('ipWhitelist', e.target.value)} placeholder="e.g. 203.0.113.0, 192.168.1.0/24 (leave blank for no restriction)" />
                <p className="text-xs text-muted-foreground">Comma-separated IP addresses or CIDR ranges</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => toast.success('Password reset email sent')}>
                  <Key className="w-3.5 h-3.5 mr-1" /> Send Password Reset
                </Button>
                <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={() => toast.success('All sessions terminated')}>
                  <Lock className="w-3.5 h-3.5 mr-1" /> Force Logout All Sessions
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    );
  }

  return (
    <main className="px-6 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1>Admin User Management</h1>
          <p className="text-muted-foreground text-sm">{admins.length} admins · {admins.filter((a) => a.status === 'active').length} active</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setView('log')}><Activity className="w-4 h-4 mr-1" /> Activity Log</Button>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> New Admin</Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search admins..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground">Status</th>
                <th className="text-center px-4 py-3 text-xs text-muted-foreground">2FA</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground">Last Login</th>
                <th className="text-right px-4 py-3 text-xs text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs">
                        {a.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      {a.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.email}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${ROLE_COLORS[a.role]}`}>{ROLE_LABELS[a.role]}</span></td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[a.status]}`}>{a.status}</span></td>
                  <td className="px-4 py-3 text-center">
                    {a.twoFAEnabled ? <Shield className="w-4 h-4 text-green-600 mx-auto" /> : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{a.lastLogin}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(a)}><Edit className="w-3.5 h-3.5" /></Button>
                      {a.id !== 'a1' && <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(a.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </main>
  );
}