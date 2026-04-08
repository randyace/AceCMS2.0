import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, ChevronLeft, CheckCircle, Clock, XCircle, Upload, ExternalLink, Package, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { NavigationContext } from '../../App';
import { toast } from 'sonner@2.0.3';
import { merchantService } from '../../services/api';
import { WholesaleOrderRef, INITIAL_WHOLESALE_ORDERS } from './WholesaleOrders';

// ─── Types ────────────────────────────────────────────────────────────────────

type VerificationStatus = 'pending' | 'verified' | 'rejected';

type MerchantTab = 'profile' | 'orders';

interface Merchant {
  id: string; companyName: string; contactPerson: string; email: string; phone: string;
  address: string; brNumber: string; brDocument: string;
  verificationStatus: VerificationStatus; creditLimit: number;
  notes: string; joinDate: string;
  wholesaleOrders: WholesaleOrderRef[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VERIFY_COLORS: Record<VerificationStatus, string> = {
  pending:  'bg-amber-100 text-amber-700',
  verified: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};
const VERIFY_LABELS: Record<VerificationStatus, string> = {
  pending:  'Pending',
  verified: 'Verified',
  rejected: 'Rejected',
};
const VERIFY_ICONS: Record<VerificationStatus, React.FC<{ className?: string }>> = {
  pending:  ({ className }) => <Clock className={className} />,
  verified: ({ className }) => <CheckCircle className={className} />,
  rejected: ({ className }) => <XCircle className={className} />,
};

const WO_STATUS_COLORS: Record<string, string> = {
  draft:     'bg-muted text-muted-foreground',
  confirmed: 'bg-blue-100 text-blue-700',
  invoiced:  'bg-violet-100 text-violet-700',
  paid:      'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  refunded:  'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
};
const WO_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', confirmed: 'Confirmed', invoiced: 'Invoiced',
  paid: 'Paid', completed: 'Completed', refunded: 'Refunded', cancelled: 'Cancelled',
};

// Build wholesale order refs from the shared initial data
function buildWholesaleRefs(merchantId: string): WholesaleOrderRef[] {
  return INITIAL_WHOLESALE_ORDERS
    .filter(o => o.merchantId === merchantId)
    .map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      orderDate: o.orderDate,
      totalAmount: o.finalAmount,
      itemCount: o.items.length,
    }));
}

const INITIAL_MERCHANTS: Merchant[] = [
  {
    id: 'm1', companyName: 'TechRetail HK Ltd.', contactPerson: 'Peter Ho', email: 'peter@techretailhk.com',
    phone: '+852 5678 9012', address: 'Shop 4, G/F, Pacific Place, Admiralty',
    brNumber: 'BR-12345678', brDocument: 'br_techretail.pdf',
    verificationStatus: 'verified', creditLimit: 150000, notes: 'Wholesale B2B client.', joinDate: '2024-03-15',
    wholesaleOrders: buildWholesaleRefs('m1'),
  },
  {
    id: 'm2', companyName: 'Fashion Forward Co.', contactPerson: 'Alice Leung', email: 'alice@fashionforward.com',
    phone: '+852 6789 0123', address: "2/F, 88 Queen's Road Central",
    brNumber: 'BR-87654321', brDocument: '',
    verificationStatus: 'pending', creditLimit: 0, notes: 'New merchant application.', joinDate: '2026-03-10',
    wholesaleOrders: [],
  },
  {
    id: 'm3', companyName: 'Green Living Store', contactPerson: 'Simon Yip', email: 'simon@greenlivingstore.com',
    phone: '+852 7890 1234', address: 'Unit 8, 3/F, Olympian City, Tai Kok Tsui',
    brNumber: 'BR-11223344', brDocument: 'br_greenliving.pdf',
    verificationStatus: 'verified', creditLimit: 80000, notes: 'Eco-friendly products partner.', joinDate: '2025-01-20',
    wholesaleOrders: buildWholesaleRefs('m3'),
  },
  {
    id: 'm4', companyName: 'Digital Hub Ltd.', contactPerson: 'Karen Fong', email: 'karen@digitalhub.hk',
    phone: '+852 8901 2345', address: '15/F, iSquare, Tsim Sha Tsui',
    brNumber: 'BR-55667788', brDocument: '',
    verificationStatus: 'rejected', creditLimit: 0, notes: 'Application rejected — incomplete documents.', joinDate: '2026-02-28',
    wholesaleOrders: [],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function MerchantManagement() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState<Merchant[]>(INITIAL_MERCHANTS);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [activeTab, setActiveTab] = useState<MerchantTab>('profile');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const { navigateTo } = useContext(NavigationContext);

  useEffect(() => {
    async function fetchMerchants() {
      try {
        const res = await merchantService.getMerchants();
        const merchantsData = (res.data as any)?.data || res.data;
        if (merchantsData && Array.isArray(merchantsData) && merchantsData.length > 0) {
          const mapped = merchantsData.filter((m: any) => m && m.name).map((m: any) => ({
            id: String(m.id || ''),
            companyName: m.name || '',
            contactPerson: m.contact || '',
            email: m.email || '',
            phone: m.phone || '',
            address: m.address || '',
            brNumber: '',
            brDocument: '',
            verificationStatus: 'verified' as VerificationStatus,
            creditLimit: 0,
            notes: '',
            joinDate: '2024-01-01',
            wholesaleOrders: [],
          }));
          if (mapped.length > 0) {
            setMerchants(mapped);
          }
        }
      } catch (error) {
        console.warn('Using fallback data, API unavailable');
      }
    }
    fetchMerchants();
  }, []);

  useEffect(() => {
    if (itemId && merchants.length > 0) {
      const found = merchants.find(m => m.id === itemId || m.companyName === itemId);
      if (found) {
        setEditingMerchant(JSON.parse(JSON.stringify(found)));
        setActiveTab('orders');
        setView('edit');
      }
    }
  }, [itemId, merchants]);

  const openEdit = (m: Merchant, tab: MerchantTab = 'profile') => {
    navigate(`/merchants/${m.id}`);
  };

  const openCreate = () => {
    setEditingMerchant({
      id: `mer-${Date.now()}`, companyName: '', contactPerson: '', email: '', phone: '',
      address: '', brNumber: '', brDocument: '', verificationStatus: 'pending',
      creditLimit: 0, notes: '', joinDate: new Date().toISOString().split('T')[0],
      wholesaleOrders: [],
    });
    setActiveTab('profile');
    setView('edit');
  };

  const handleSave = () => {
    if (!editingMerchant) return;
    setMerchants(prev => {
      const ex = prev.find(m => m.id === editingMerchant.id);
      return ex ? prev.map(m => m.id === editingMerchant.id ? editingMerchant : m) : [...prev, editingMerchant];
    });
    toast.success('Merchant saved');
    navigate('/merchants');
    setEditingMerchant(null);
  };

  const handleDelete = (id: string) => {
    setMerchants(prev => prev.filter(m => m.id !== id));
    toast.success('Merchant deleted');
  };

  const update = <K extends keyof Merchant>(f: K, v: Merchant[K]) =>
    setEditingMerchant(prev => prev ? { ...prev, [f]: v } : prev);

  const filtered = merchants.filter(m =>
    (m.companyName.toLowerCase().includes(search.toLowerCase()) ||
     m.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
     m.brNumber.toLowerCase().includes(search.toLowerCase())) &&
    (filterStatus === '' || m.verificationStatus === filterStatus)
  );

  // ─── Edit View ──────────────────────────────────────────────────────────────

  if (view === 'edit' && editingMerchant) {
    const isNew = editingMerchant.id.startsWith('mer-');
    const StatusIcon = VERIFY_ICONS[editingMerchant.verificationStatus];
    const totalWOValue = editingMerchant.wholesaleOrders.reduce((s, o) => s + o.totalAmount, 0);

    const TABS: { id: MerchantTab; label: string }[] = [
      { id: 'profile', label: 'Merchant Profile' },
      { id: 'orders', label: `Wholesale Orders (${editingMerchant.wholesaleOrders.length})` },
    ];

    return (
      <main className="min-h-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0f2942] to-[#1a3f5c] text-white px-6 py-5">
          <div className="flex items-center gap-2 text-sm text-white/70 mb-3">
            <button onClick={() => { navigate('/merchants'); setEditingMerchant(null); }} className="hover:text-white flex items-center gap-1 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Merchants
            </button>
            <span>/</span>
            <span className="text-white">{editingMerchant.companyName || 'New Merchant'}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-white">{isNew ? 'New Merchant' : editingMerchant.companyName}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs flex items-center gap-1 font-medium ${VERIFY_COLORS[editingMerchant.verificationStatus]}`}>
                <StatusIcon className="w-3 h-3" />
                {VERIFY_LABELS[editingMerchant.verificationStatus]}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { navigate('/merchants'); setEditingMerchant(null); }} className="border-white/30 text-white hover:bg-white/10 bg-transparent">Cancel</Button>
              <Button onClick={handleSave} className="bg-[#cec18a] text-[#0f2942] hover:bg-[#d4c990]">Save Merchant</Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        {!isNew && (
          <div className="px-6 pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Credit Limit', value: editingMerchant.creditLimit > 0 ? `HK$${editingMerchant.creditLimit.toLocaleString()}` : 'Not set', color: 'bg-purple-50 border-purple-200 text-purple-700', icon: '💳' },
                { label: 'Total WO Value', value: `HK$${totalWOValue.toLocaleString()}`, color: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: '💰' },
                { label: 'Wholesale Orders', value: editingMerchant.wholesaleOrders.length, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: '📦' },
                { label: 'BR Document', value: editingMerchant.brDocument ? 'Uploaded' : 'Not uploaded', color: editingMerchant.brDocument ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700', icon: editingMerchant.brDocument ? '✅' : '⚠️' },
              ].map(stat => (
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
          </div>
        )}

        {/* Tabs (only for existing merchants) */}
        {!isNew && (
          <div className="flex gap-0 border-b border-border mx-6 mt-4 overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? 'border-[#0f2942] text-[#0f2942]' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="p-4 sm:p-6 space-y-5">

          {/* ── Profile Tab ──────────────────────────────────────────────── */}
          {(isNew || activeTab === 'profile') && (
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-[#0f2942]/10 to-transparent border-l-4 border-[#0f2942] py-3">
                <CardTitle className="text-sm text-[#0f2942]">Merchant Profile</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {([['Company Name', 'companyName'], ['Contact Person', 'contactPerson'], ['Email', 'email'], ['Phone', 'phone']] as const).map(([label, field]) => (
                    <div key={field} className="space-y-1">
                      <label className="text-sm text-muted-foreground">{label}</label>
                      <Input value={editingMerchant[field]} onChange={(e) => update(field, e.target.value)} />
                    </div>
                  ))}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-sm text-muted-foreground">Address</label>
                    <Input value={editingMerchant.address} onChange={(e) => update('address', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">BR Number</label>
                    <Input value={editingMerchant.brNumber} onChange={(e) => update('brNumber', e.target.value)} placeholder="Business Registration Number" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Credit Limit (HKD)</label>
                    <Input type="number" value={editingMerchant.creditLimit} onChange={(e) => update('creditLimit', parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Verification Status</label>
                    <select className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background" value={editingMerchant.verificationStatus} onChange={(e) => update('verificationStatus', e.target.value as VerificationStatus)}>
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Join Date</label>
                    <Input type="date" value={editingMerchant.joinDate} onChange={(e) => update('joinDate', e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">BR Document</label>
                  {editingMerchant.brDocument ? (
                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm text-green-700 flex-1 truncate">{editingMerchant.brDocument}</span>
                      <Button size="sm" variant="ghost" className="text-xs flex-shrink-0" onClick={() => update('brDocument', '')}>Remove</Button>
                    </div>
                  ) : (
                    <button
                      className="w-full border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-2 hover:border-[#0f2942] hover:bg-[#0f2942]/5 transition-colors"
                      onClick={() => { update('brDocument', 'br_document.pdf'); toast.success('Document uploaded'); }}>
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Click to upload BR document (PDF)</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Internal Notes</label>
                  <textarea className="w-full h-20 px-3 py-2 border border-border rounded-lg text-sm resize-none outline-none focus:ring-1 focus:ring-ring" value={editingMerchant.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Internal notes..." />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Wholesale Orders Tab ─────────────────────────────────────── */}
          {!isNew && activeTab === 'orders' && (
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-[#cec18a]/20 to-amber-50 border-l-4 border-[#cec18a] py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-amber-800 flex items-center gap-2">
                    <Package className="w-4 h-4" /> Wholesale Order History
                  </CardTitle>
                  <Button size="sm" variant="outline"
                    onClick={() => navigateTo('wholesale-orders', editingMerchant.merchantId)}
                    className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50">
                    <Plus className="w-3 h-3 mr-1" /> New Order
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {editingMerchant.wholesaleOrders.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm">No wholesale orders for this merchant yet.</p>
                    <Button size="sm" variant="outline" className="mt-3"
                      onClick={() => navigateTo('wholesale-orders')}>
                      Go to Wholesale Orders
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[540px]">
                        <thead className="border-b border-border bg-[#0f2942]/5">
                          <tr>
                            <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Order #</th>
                            <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Date</th>
                            <th className="text-center px-4 py-3 text-[#0f2942] text-xs">Items</th>
                            <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Status</th>
                            <th className="text-right px-4 py-3 text-[#0f2942] text-xs">Amount</th>
                            <th className="text-right px-4 py-3 text-[#0f2942] text-xs">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editingMerchant.wholesaleOrders.map(wo => (
                            <tr key={wo.id} className="border-b border-border last:border-0 hover:bg-[#0f2942]/5 transition-colors">
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => navigateTo('wholesale-orders', wo.orderNumber)}
                                  className="text-[#0f2942] hover:underline font-mono text-xs font-medium flex items-center gap-1">
                                  {wo.orderNumber} <ExternalLink className="w-3 h-3" />
                                </button>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground text-xs">{wo.orderDate}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{wo.itemCount} items</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${WO_STATUS_COLORS[wo.status] || 'bg-muted text-muted-foreground'}`}>
                                  {WO_STATUS_LABEL[wo.status] || wo.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-medium">HK${wo.totalAmount.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right">
                                <Button size="sm" variant="ghost"
                                  onClick={() => navigateTo('wholesale-orders', wo.orderNumber)}
                                  className="h-7 text-xs hover:bg-[#0f2942]/10 hover:text-[#0f2942]">
                                  View Order
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t-2 border-[#cec18a]/30 bg-amber-50/50">
                          <tr>
                            <td colSpan={4} className="px-4 py-2.5 text-sm text-muted-foreground">Total Order Value</td>
                            <td className="px-4 py-2.5 text-right font-medium text-emerald-600">
                              HK${editingMerchant.wholesaleOrders.reduce((s, o) => s + o.totalAmount, 0).toLocaleString()}
                            </td>
                            <td />
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

  // ─── List View ──────────────────────────────────────────────────────────────

  return (
    <main className="min-h-full">
      <div className="bg-gradient-to-r from-[#0f2942] to-[#1a3f5c] text-white px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-white">Merchant Management</h1>
            <p className="text-white/60 text-sm">
              {merchants.length} merchants · {merchants.filter(m => m.verificationStatus === 'verified').length} verified · {merchants.filter(m => m.verificationStatus === 'pending').length} pending
            </p>
          </div>
          <Button onClick={openCreate} className="bg-[#cec18a] text-[#0f2942] hover:bg-[#d4c990] self-start sm:self-auto">
            <Plus className="w-4 h-4 mr-1" /> New Merchant
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Merchants', value: merchants.length, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: '🏪' },
            { label: 'Verified', value: merchants.filter(m => m.verificationStatus === 'verified').length, color: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: '✅' },
            { label: 'Pending Review', value: merchants.filter(m => m.verificationStatus === 'pending').length, color: 'bg-amber-50 border-amber-200 text-amber-700', icon: '⏳' },
            { label: 'Rejected', value: merchants.filter(m => m.verificationStatus === 'rejected').length, color: 'bg-red-50 border-red-200 text-red-700', icon: '❌' },
          ].map(stat => (
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search company, contact, BR number..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="h-9 px-3 border border-border rounded-md text-sm bg-background" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Table */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="border-b border-border bg-[#0f2942]/5">
                  <tr>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Company</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Contact</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">BR Number</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Verification</th>
                    <th className="text-right px-4 py-3 text-[#0f2942] text-xs">Credit Limit</th>
                    <th className="text-center px-4 py-3 text-[#0f2942] text-xs">WOs</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Join Date</th>
                    <th className="text-right px-4 py-3 text-[#0f2942] text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(m => {
                    const Icon = VERIFY_ICONS[m.verificationStatus];
                    return (
                      <tr key={m.id} className="border-b border-border last:border-0 hover:bg-[#0f2942]/5 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium">{m.companyName}</p>
                          {m.brDocument && <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> BR uploaded</p>}
                        </td>
                        <td className="px-4 py-3">
                          <p>{m.contactPerson}</p>
                          <p className="text-xs text-muted-foreground">{m.email}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{m.brNumber || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 w-fit font-medium ${VERIFY_COLORS[m.verificationStatus]}`}>
                            <Icon className="w-3 h-3" /> {VERIFY_LABELS[m.verificationStatus]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{m.creditLimit > 0 ? `HK$${m.creditLimit.toLocaleString()}` : '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => openEdit(m, 'orders')}
                            className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs hover:bg-blue-100 transition-colors">
                            {m.wholesaleOrders.length}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{m.joinDate}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(m)} className="hover:bg-[#0f2942]/10 hover:text-[#0f2942]"><Edit className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(m.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && <div className="py-12 text-center text-muted-foreground">No merchants found</div>}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
