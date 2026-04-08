import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, ChevronLeft, Key, CreditCard, ShoppingBag, MessageSquare, ExternalLink, Users, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { NavigationContext } from '../../App';
import { toast } from 'sonner@2.0.3';
import { memberService } from '../../services/api';

type MemberStatus = 'active' | 'inactive' | 'suspended';
type Gender = 'M' | 'F' | 'Other' | '';
type VIPLevel = 0 | 1 | 2 | 3;

interface CreditHistory { date: string; amount: number; reason: string; balance: number; }
interface OrderHistory { id: string; date: string; amount: number; status: string; items: number; }

interface Member {
  id: string; firstName: string; lastName: string; email: string;
  telephone: string; gender: Gender; vipLevel: VIPLevel; birthday: string;
  status: MemberStatus; registerTime: string; credits: number;
  emailOptIn: boolean; smsOptIn: boolean; notes: string;
  creditHistory: CreditHistory[]; orderHistory: OrderHistory[];
}

const VIP_LABELS: Record<VIPLevel, string> = { 0: 'Standard', 1: 'Bronze', 2: 'Silver', 3: 'Gold' };
const VIP_COLORS: Record<VIPLevel, string> = {
  0: 'bg-slate-100 text-slate-600',
  1: 'bg-orange-100 text-orange-700',
  2: 'bg-slate-200 text-slate-700',
  3: 'bg-amber-100 text-amber-700'
};
const VIP_BADGE_COLORS: Record<VIPLevel, string> = {
  0: 'bg-slate-500',
  1: 'bg-orange-500',
  2: 'bg-slate-500',
  3: 'bg-amber-500'
};
const STATUS_COLORS: Record<MemberStatus, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-muted text-muted-foreground',
  suspended: 'bg-red-100 text-red-700'
};
const ORDER_STATUS_COLORS: Record<string, string> = {
  'Pending': 'bg-amber-100 text-amber-700',
  'Confirmed': 'bg-blue-100 text-blue-700',
  'Processing': 'bg-purple-100 text-purple-700',
  'Shipped': 'bg-indigo-100 text-indigo-700',
  'Delivered': 'bg-green-100 text-green-700',
  'Cancelled': 'bg-red-100 text-red-700',
};

const INITIAL_MEMBERS: Member[] = [
  {
    id: 'm1', firstName: 'Tai Man', lastName: 'Chan', email: 'taiman.chan@email.com',
    telephone: '9123 4567', gender: 'M', vipLevel: 3, birthday: '1985-04-15',
    status: 'active', registerTime: '2024-06-10 09:30', credits: 4200,
    emailOptIn: true, smsOptIn: true, notes: 'VIP customer, handle with care.',
    creditHistory: [
      { date: '2026-03-10', amount: 200, reason: 'Purchase bonus', balance: 4200 },
      { date: '2026-02-28', amount: -500, reason: 'Credit redemption', balance: 4000 },
      { date: '2026-02-15', amount: 300, reason: 'Purchase bonus', balance: 4500 },
    ],
    orderHistory: [
      { id: 'ORD-20260001', date: '2026-03-19', amount: 1280, status: 'Pending', items: 2 },
      { id: 'ORD-20260003', date: '2026-03-18', amount: 3200, status: 'Shipped', items: 2 },
      { id: 'ORD-20259876', date: '2026-02-05', amount: 1560, status: 'Delivered', items: 3 },
    ],
  },
  {
    id: 'm2', firstName: 'Siu Ming', lastName: 'Lee', email: 'siuming@email.com',
    telephone: '6234 5678', gender: 'M', vipLevel: 2, birthday: '1992-08-22',
    status: 'active', registerTime: '2025-01-14 14:20', credits: 1800,
    emailOptIn: true, smsOptIn: false, notes: '',
    creditHistory: [
      { date: '2026-03-01', amount: 100, reason: 'Purchase bonus', balance: 1800 },
    ],
    orderHistory: [
      { id: 'ORD-20260002', date: '2026-03-19', amount: 560, status: 'Processing', items: 1 },
    ],
  },
  {
    id: 'm3', firstName: 'Ka Yan', lastName: 'Wong', email: 'kayan.wong@email.com',
    telephone: '5678 9012', gender: 'F', vipLevel: 1, birthday: '1998-12-03',
    status: 'inactive', registerTime: '2025-07-20 11:00', credits: 350,
    emailOptIn: false, smsOptIn: false, notes: 'No recent activity.',
    creditHistory: [],
    orderHistory: [],
  },
];

export function MembershipManagement() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'credits' | 'orders'>('info');
  const [creditAdjust, setCreditAdjust] = useState({ amount: '', reason: '' });
  const [showResetPwd, setShowResetPwd] = useState(false);
  const { navigateTo } = useContext(NavigationContext);

  useEffect(() => {
    async function fetchMembers() {
      try {
        const res = await memberService.getMembers();
        const membersData = (res.data as any)?.data || res.data;
        if (membersData && Array.isArray(membersData) && membersData.length > 0) {
          const mapped = membersData.filter((m: any) => m && m.name).map((m: any) => ({
            id: String(m.id || ''),
            firstName: (m.name || '').split(' ')[0] || m.name || '',
            lastName: (m.name || '').split(' ').slice(1).join(' ') || '',
            email: m.email || '',
            telephone: m.phone || '',
            gender: '' as Gender,
            vipLevel: m.level === 'Gold' ? 3 : m.level === 'Silver' ? 2 : m.level === 'Bronze' ? 1 : 0,
            birthday: '',
            status: (m.status || 'active').toLowerCase() as MemberStatus,
            registerTime: (m.joinDate || '') + ' 00:00',
            credits: 0,
            emailOptIn: true,
            smsOptIn: true,
            notes: '',
            creditHistory: [],
            orderHistory: [],
          }));
          if (mapped.length > 0) {
            setMembers(mapped);
          }
        }
      } catch (error) {
        console.warn('Using fallback data, API unavailable');
      }
    }
    fetchMembers();
  }, []);

  useEffect(() => {
    if (itemId && members.length > 0) {
      const found = members.find(m => m.id === itemId);
      if (found) {
        setEditingMember(JSON.parse(JSON.stringify(found)));
        setView('edit');
        setActiveTab('orders');
      }
    }
  }, [itemId, members]);

  const openEdit = (m: Member) => { navigate(`/members/${m.id}`); };
  const openCreate = () => {
    const newM: Member = {
      id: `mem-${Date.now()}`, firstName: '', lastName: '', email: '', telephone: '',
      gender: '', vipLevel: 0, birthday: '', status: 'active',
      registerTime: new Date().toISOString().replace('T', ' ').slice(0, 16),
      credits: 0, emailOptIn: true, smsOptIn: false, notes: '',
      creditHistory: [], orderHistory: [],
    };
    setEditingMember(newM); setView('edit'); setActiveTab('info');
  };

  const handleSave = () => {
    if (!editingMember) return;
    setMembers((prev) => {
      const existing = prev.find((m) => m.id === editingMember.id);
      return existing ? prev.map((m) => m.id === editingMember.id ? editingMember : m) : [...prev, editingMember];
    });
    toast.success('Member profile saved');
    setView('list');
  };

  const handleDelete = (id: string) => { setMembers((prev) => prev.filter((m) => m.id !== id)); toast.success('Member deleted'); };

  const handleCreditAdjust = () => {
    if (!editingMember || !creditAdjust.amount || !creditAdjust.reason) return;
    const amount = parseInt(creditAdjust.amount);
    const newBalance = editingMember.credits + amount;
    const entry: CreditHistory = { date: new Date().toISOString().split('T')[0], amount, reason: creditAdjust.reason, balance: newBalance };
    setEditingMember((prev) => prev ? { ...prev, credits: newBalance, creditHistory: [entry, ...prev.creditHistory] } : prev);
    setCreditAdjust({ amount: '', reason: '' });
    toast.success(`Credits ${amount > 0 ? 'added' : 'deducted'} successfully`);
  };

  const update = <K extends keyof Member>(field: K, value: Member[K]) =>
    setEditingMember((prev) => prev ? { ...prev, [field]: value } : prev);

  const filtered = members.filter((m) =>
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase()) ||
    m.telephone.includes(search)
  );

  if (view === 'edit' && editingMember) {
    const tabs = [
      { id: 'info', label: 'Profile Info', color: 'blue' },
      { id: 'credits', label: `Credits (${editingMember.credits.toLocaleString()})`, color: 'amber' },
      { id: 'orders', label: `Orders (${editingMember.orderHistory.length})`, color: 'emerald' },
    ] as const;

    const totalSpend = editingMember.orderHistory.reduce((sum, o) => sum + o.amount, 0);

    return (
      <main className="min-h-full">
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-[#0f2942] to-[#1a3f5c] text-white px-6 py-5">
          <div className="flex items-center gap-2 text-sm text-white/70 mb-3">
            <button onClick={() => navigate('/members')} className="hover:text-white flex items-center gap-1 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Members
            </button>
            <span>/</span>
            <span className="text-white">{editingMember.firstName || 'New Member'} {editingMember.lastName}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-white">{editingMember.id.startsWith('mem-') ? 'New Member' : `${editingMember.firstName} ${editingMember.lastName}`}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${VIP_COLORS[editingMember.vipLevel]}`}>{VIP_LABELS[editingMember.vipLevel]}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs capitalize ${STATUS_COLORS[editingMember.status]}`}>{editingMember.status}</span>
              </div>
              <p className="text-white/60 text-sm">{editingMember.email}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setShowResetPwd(true)} className="border-amber-300/60 text-amber-200 hover:bg-white/10 bg-transparent">
                <Key className="w-3.5 h-3.5 mr-1" /> Reset Password
              </Button>
              <Button variant="outline" onClick={() => setView('list')} className="border-white/30 text-white hover:bg-white/10 bg-transparent">Cancel</Button>
              <Button onClick={handleSave} className="bg-[#cec18a] text-[#0f2942] hover:bg-[#d4c990]">Save Member</Button>
            </div>
          </div>
        </div>

        <div className="py-4 sm:py-6 space-y-5">
          {showResetPwd && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-amber-800">Reset Password</p>
                <p className="text-xs text-amber-700">A password reset email will be sent to {editingMember.email}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowResetPwd(false)}>Cancel</Button>
                <Button size="sm" onClick={() => { toast.success('Password reset email sent'); setShowResetPwd(false); }}>Send Email</Button>
              </div>
            </div>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Orders', value: editingMember.orderHistory.length, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: '🛒' },
              { label: 'Total Spend', value: `HK$${totalSpend.toLocaleString()}`, color: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: '💰' },
              { label: 'Credits', value: `${editingMember.credits.toLocaleString()} pts`, color: 'bg-amber-50 border-amber-200 text-amber-700', icon: '⭐' },
              { label: 'VIP Level', value: VIP_LABELS[editingMember.vipLevel], color: 'bg-purple-50 border-purple-200 text-purple-700', icon: '👑' },
            ].map((stat) => (
              <div key={stat.label} className={`p-3 rounded-xl border ${stat.color}`}>
                <div className="flex items-center gap-2">
                  <span>{stat.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs opacity-70">{stat.label}</p>
                    <p className="font-medium truncate">{stat.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-0 border-b border-border overflow-x-auto">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-2.5 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-[#0f2942] text-[#0f2942]' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'info' && (
            <div className="space-y-5">
              <Card className="shadow-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500/10 to-blue-50 border-l-4 border-blue-400 py-3">
                  <CardTitle className="text-sm text-blue-700">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">First Name</label>
                      <Input value={editingMember.firstName} onChange={(e) => update('firstName', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Last Name</label>
                      <Input value={editingMember.lastName} onChange={(e) => update('lastName', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Email</label>
                      <Input type="email" value={editingMember.email} onChange={(e) => update('email', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Telephone</label>
                      <Input value={editingMember.telephone} onChange={(e) => update('telephone', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Gender</label>
                      <select className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background" value={editingMember.gender} onChange={(e) => update('gender', e.target.value as Gender)}>
                        <option value="">Not specified</option>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Birthday</label>
                      <Input type="date" value={editingMember.birthday} onChange={(e) => update('birthday', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">VIP Level</label>
                      <select className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background" value={editingMember.vipLevel} onChange={(e) => update('vipLevel', parseInt(e.target.value) as VIPLevel)}>
                        {([0, 1, 2, 3] as VIPLevel[]).map((l) => <option key={l} value={l}>{VIP_LABELS[l]}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Status</label>
                      <select className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background" value={editingMember.status} onChange={(e) => update('status', e.target.value as MemberStatus)}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-6 pt-2">
                    <div className="flex items-center gap-3">
                      <label className="text-sm">Email Marketing Opt-in</label>
                      <Switch checked={editingMember.emailOptIn} onCheckedChange={(v) => update('emailOptIn', v)} />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-sm">SMS Opt-in</label>
                      <Switch checked={editingMember.smsOptIn} onCheckedChange={(v) => update('smsOptIn', v)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Internal Notes</label>
                    <textarea className="w-full h-20 px-3 py-2 border border-border rounded-lg text-sm resize-none outline-none focus:ring-1 focus:ring-ring" value={editingMember.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Internal notes (not visible to customer)" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'credits' && (
            <div className="space-y-5">
              <Card className="shadow-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-amber-500/10 to-amber-50 border-l-4 border-amber-400 py-3">
                  <CardTitle className="text-sm text-amber-700">Credit Adjustment</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#0f2942]/5 to-[#cec18a]/10 border border-[#cec18a]/30 rounded-xl">
                    <div>
                      <p className="text-muted-foreground text-sm">Current Balance</p>
                      <p className="text-3xl font-medium text-[#0f2942]">{editingMember.credits.toLocaleString()} <span className="text-base font-normal text-muted-foreground">pts</span></p>
                    </div>
                    <CreditCard className="w-10 h-10 text-[#cec18a]" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Amount (+ add / - deduct)</label>
                      <Input type="number" value={creditAdjust.amount} onChange={(e) => setCreditAdjust((p) => ({ ...p, amount: e.target.value }))} placeholder="e.g. 100 or -50" />
                    </div>
                    <div className="space-y-1 col-span-1 sm:col-span-2">
                      <label className="text-sm text-muted-foreground">Reason</label>
                      <div className="flex gap-2">
                        <Input value={creditAdjust.reason} onChange={(e) => setCreditAdjust((p) => ({ ...p, reason: e.target.value }))} placeholder="Reason for adjustment" />
                        <Button onClick={handleCreditAdjust} disabled={!creditAdjust.amount || !creditAdjust.reason}>Apply</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-amber-500/10 to-amber-50 border-l-4 border-amber-200 py-3">
                  <CardTitle className="text-sm text-amber-700">Credit History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {editingMember.creditHistory.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">No credit history</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-border bg-muted/30">
                          <tr>
                            <th className="text-left px-4 py-2 text-xs text-muted-foreground">Date</th>
                            <th className="text-left px-4 py-2 text-xs text-muted-foreground">Reason</th>
                            <th className="text-right px-4 py-2 text-xs text-muted-foreground">Amount</th>
                            <th className="text-right px-4 py-2 text-xs text-muted-foreground">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editingMember.creditHistory.map((h, i) => (
                            <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
                              <td className="px-4 py-2.5 text-muted-foreground">{h.date}</td>
                              <td className="px-4 py-2.5">{h.reason}</td>
                              <td className={`px-4 py-2.5 text-right font-medium ${h.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>{h.amount > 0 ? '+' : ''}{h.amount}</td>
                              <td className="px-4 py-2.5 text-right">{h.balance.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'orders' && (
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-emerald-50 border-l-4 border-emerald-400 py-3">
                <CardTitle className="text-sm text-emerald-700 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" /> Order History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {editingMember.orderHistory.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                    No orders yet
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[500px]">
                        <thead className="border-b border-border bg-muted/30">
                          <tr>
                            <th className="text-left px-4 py-2 text-xs text-muted-foreground">Order ID</th>
                            <th className="text-left px-4 py-2 text-xs text-muted-foreground">Date</th>
                            <th className="text-center px-4 py-2 text-xs text-muted-foreground">Items</th>
                            <th className="text-right px-4 py-2 text-xs text-muted-foreground">Amount</th>
                            <th className="text-center px-4 py-2 text-xs text-muted-foreground">Status</th>
                            <th className="text-right px-4 py-2 text-xs text-muted-foreground">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editingMember.orderHistory.map((o) => (
                            <tr key={o.id} className="border-b border-border last:border-0 hover:bg-[#0f2942]/5 transition-colors">
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => navigateTo('web-orders', o.id)}
                                  className="text-[#0f2942] hover:underline font-mono text-xs font-medium flex items-center gap-1"
                                >
                                  {o.id} <ExternalLink className="w-3 h-3" />
                                </button>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{o.date}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{o.items} items</span>
                              </td>
                              <td className="px-4 py-3 text-right font-medium">HK${o.amount.toLocaleString()}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${ORDER_STATUS_COLORS[o.status] || 'bg-muted text-muted-foreground'}`}>{o.status}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => navigateTo('web-orders', o.id)}
                                  className="h-7 text-xs hover:bg-[#0f2942]/10 hover:text-[#0f2942]"
                                >
                                  View Order
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t-2 border-[#0f2942]/10 bg-emerald-50/50">
                          <tr>
                            <td colSpan={3} className="px-4 py-2.5 text-sm text-muted-foreground">Total spending</td>
                            <td className="px-4 py-2.5 text-right font-medium text-emerald-600">HK${totalSpend.toLocaleString()}</td>
                            <td colSpan={2} />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-full">
      <div className="bg-gradient-to-r from-[#0f2942] to-[#1a3f5c] text-white px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-white">Membership Management</h1>
            <p className="text-white/60 text-sm">{members.length} members · {members.filter((m) => m.status === 'active').length} active</p>
          </div>
          <Button onClick={openCreate} className="bg-[#cec18a] text-[#0f2942] hover:bg-[#d4c990] self-start sm:self-auto">
            <Plus className="w-4 h-4 mr-1" /> New Member
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Members', value: members.length, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: '👥' },
            { label: 'Active', value: members.filter(m => m.status === 'active').length, color: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: '✅' },
            { label: 'Gold VIP', value: members.filter(m => m.vipLevel === 3).length, color: 'bg-amber-50 border-amber-200 text-amber-700', icon: '🥇' },
            { label: 'Suspended', value: members.filter(m => m.status === 'suspended').length, color: 'bg-red-50 border-red-200 text-red-700', icon: '🚫' },
          ].map((stat) => (
            <div key={stat.label} className={`p-3 rounded-xl border ${stat.color}`}>
              <div className="flex items-center gap-2">
                <span>{stat.icon}</span>
                <div>
                  <p className="text-xs opacity-70">{stat.label}</p>
                  <p className="text-xl font-medium">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="border-b border-border bg-[#0f2942]/5">
                  <tr>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Name</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Email</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Phone</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">VIP</th>
                    <th className="text-right px-4 py-3 text-[#0f2942] text-xs">Credits</th>
                    <th className="text-center px-4 py-3 text-[#0f2942] text-xs">Orders</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Status</th>
                    <th className="text-right px-4 py-3 text-[#0f2942] text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr key={m.id} className="border-b border-border last:border-0 hover:bg-[#0f2942]/5 transition-colors">
                      <td className="px-4 py-3 font-medium">{m.firstName} {m.lastName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.telephone}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${VIP_COLORS[m.vipLevel]}`}>{VIP_LABELS[m.vipLevel]}</span></td>
                      <td className="px-4 py-3 text-right font-medium text-amber-600">{m.credits.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{m.orderHistory.length}</span></td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs capitalize ${STATUS_COLORS[m.status]}`}>{m.status}</span></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(m)} className="hover:bg-[#0f2942]/10 hover:text-[#0f2942]"><Edit className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(m.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && <div className="py-12 text-center text-muted-foreground">No members found</div>}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}