import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, ChevronLeft, Shield, Key, Activity, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { adminService } from '../../services/api';
import AdminUsersView from '../figma-ui/AdminUsersView';
import { buildContainerContract } from '../containerContracts';

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
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'edit' | 'log'>('list');
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'permissions' | 'security'>('profile');

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await adminService.getUsers();
        const mapped = res.data.map((u: any) => ({
          id: String(u.id),
          name: u.name,
          email: u.email,
          role: 'order_manager' as AdminRole,
          status: u.status.toLowerCase() as AdminStatus,
          lastLogin: u.lastLogin,
          twoFAEnabled: false,
          ipWhitelist: '',
          permissions: DEFAULT_PERMISSIONS,
          createdAt: '2024-01-01',
        }));
        setAdmins(mapped);
      } catch (error) {
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

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
  const containerContract = buildContainerContract({
    data: {
      admins,
      view,
      editingAdmin,
      search,
      activeTab
    },
    uiState: {
      view,
      search,
      activeTab
    },
    asyncState: {
      loading: loading,
      saving: false,
      error: null,
    },
    callbacks: {
      openEdit,
      openCreate,
      handleSave,
      handleDelete,
      updatePermission,
      setSearch,
      setView,
      setActiveTab
    },
    meta: {
      container: 'AdminUsers'
    },
  });

  return <AdminUsersView {...containerContract} />;
}

