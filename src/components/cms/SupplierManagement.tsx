import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, ChevronLeft, Star, Printer, ExternalLink, Truck, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { NavigationContext } from '../../App';
import { toast } from 'sonner@2.0.3';
import { supplierService } from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PurchaseOrderRef {
  id: string; orderNumber: string; status: string;
  orderDate: string; totalCost: number; itemCount: number;
}

interface Supplier {
  id: string; name: string; contactPerson: string; email: string; phone: string;
  address: string; paymentTerms: string; creditLimit: number;
  categories: string[]; notes: string; currency: string;
  purchaseOrders: PurchaseOrderRef[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PO_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground', sent: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-purple-100 text-purple-700', partial: 'bg-amber-100 text-amber-700',
  received: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
};
const PO_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', sent: 'Sent', confirmed: 'Confirmed',
  partial: 'Partial Receipt', received: 'Fully Received', cancelled: 'Cancelled',
};

const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 's1', name: 'SoundMax Electronics Ltd.', contactPerson: 'Danny Lam', email: 'danny@soundmax.com',
    phone: '+852 2345 6789', address: '18/F Tower A, Hunghom Commercial Centre', paymentTerms: 'Net 30',
    creditLimit: 500000, categories: ['Electronics', 'Audio'],
    notes: 'Reliable supplier since 2019. Priority partner.', currency: 'HKD',
    purchaseOrders: [
      { id: 'PO-2026-0052', orderNumber: 'PO-2026-0052', status: 'confirmed', orderDate: '2026-03-10', totalCost: 19400, itemCount: 2 },
      { id: 'PO-2026-0045', orderNumber: 'PO-2026-0045', status: 'received', orderDate: '2026-02-15', totalCost: 14000, itemCount: 1 },
      { id: 'PO-2025-0198', orderNumber: 'PO-2025-0198', status: 'received', orderDate: '2025-12-01', totalCost: 27500, itemCount: 2 },
    ],
  },
  {
    id: 's2', name: 'StyleHouse Garment Co.', contactPerson: 'Wendy Chan', email: 'wendy@stylehouse.com.hk',
    phone: '+852 3456 7890', address: '12 Fa Yuen Street, Mong Kok', paymentTerms: 'Net 45',
    creditLimit: 300000, categories: ['Fashion', 'Apparel'],
    notes: 'Occasional delivery delays.', currency: 'HKD',
    purchaseOrders: [
      { id: 'PO-2026-0045', orderNumber: 'PO-2026-0045', status: 'partial', orderDate: '2026-02-20', totalCost: 8700, itemCount: 2 },
    ],
  },
  {
    id: 's3', name: 'HomePlus Wholesale', contactPerson: 'David Wong', email: 'david@homeplus.com',
    phone: '+852 4567 8901', address: '23rd Floor, Manulife Place, Kwun Tong', paymentTerms: 'Net 60',
    creditLimit: 200000, categories: ['Home & Living'],
    notes: '', currency: 'USD',
    purchaseOrders: [
      { id: 'PO-2026-0038', orderNumber: 'PO-2026-0038', status: 'received', orderDate: '2026-02-01', totalCost: 19600, itemCount: 1 },
    ],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function generateSupplierPDF(supplier: Supplier) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) { toast.error('Please allow popups to generate PDF'); return; }
  const totalPOValue = supplier.purchaseOrders.reduce((sum, po) => sum + po.totalCost, 0);
  printWindow.document.write(`
    <!DOCTYPE html><html><head>
      <title>Supplier Profile - ${supplier.name}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:Arial,sans-serif; font-size:12px; color:#333; padding:30px; }
        .header { background:#0f2942; color:white; padding:20px 24px; border-radius:8px; margin-bottom:24px; }
        .header h1 { font-size:20px; margin-bottom:4px; }
        .header p { opacity:0.75; font-size:11px; }
        .grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px; }
        .card { border:1px solid #e5e7eb; border-radius:8px; padding:16px; }
        .card h3 { font-size:13px; color:#0f2942; margin-bottom:10px; border-bottom:2px solid #cec18a; padding-bottom:6px; }
        .row { display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #f3f4f6; }
        .row:last-child { border:none; }
        .label { color:#6b7280; }
        .stars { color:#f59e0b; font-size:16px; }
        table { width:100%; border-collapse:collapse; margin-bottom:20px; }
        thead { background:#0f2942; color:white; }
        th { padding:10px 12px; text-align:left; font-size:11px; }
        td { padding:9px 12px; border-bottom:1px solid #e5e7eb; font-size:12px; }
        .badge { display:inline-block; padding:2px 8px; border-radius:20px; font-size:10px; background:#e0f2fe; color:#0369a1; }
        .badge.received { background:#dcfce7; color:#15803d; }
        .badge.partial { background:#fef3c7; color:#b45309; }
        tfoot td { background:#f0f9f6; font-weight:bold; }
        .footer { text-align:center; color:#9ca3af; font-size:11px; margin-top:30px; border-top:1px solid #e5e7eb; padding-top:16px; }
        @media print { body { padding:15px; } @page { margin:1cm; } }
      </style>
    </head><body>
      <div class="header">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div><h1>${supplier.name}</h1><p>Supplier Profile &nbsp;|&nbsp; ${supplier.paymentTerms} &nbsp;|&nbsp; ${supplier.currency}</p></div>
          <div style="text-align:right;font-size:11px;opacity:0.8;"><p>ACE CMS</p><p>Generated: ${new Date().toLocaleDateString()}</p></div>
        </div>
      </div>
      <div class="grid">
        <div class="card">
          <h3>Contact Information</h3>
          <div class="row"><span class="label">Contact Person</span><span>${supplier.contactPerson}</span></div>
          <div class="row"><span class="label">Email</span><span>${supplier.email}</span></div>
          <div class="row"><span class="label">Phone</span><span>${supplier.phone}</span></div>
          <div class="row"><span class="label">Address</span><span style="max-width:180px;text-align:right;">${supplier.address}</span></div>
        </div>
        <div class="card">
          <h3>Business Details</h3>
          <div class="row"><span class="label">Payment Terms</span><span>${supplier.paymentTerms}</span></div>
          <div class="row"><span class="label">Currency</span><span>${supplier.currency}</span></div>
          <div class="row"><span class="label">Credit Limit</span><span><strong>HK$${supplier.creditLimit.toLocaleString()}</strong></span></div>
          <div class="row"><span class="label">Categories</span><span>${supplier.categories.join(', ')}</span></div>
        </div>
      </div>
      ${supplier.purchaseOrders.length > 0 ? `
      <h3 style="color:#0f2942;margin-bottom:12px;font-size:14px;">Purchase Order History</h3>
      <table>
        <thead><tr><th>PO Number</th><th>Order Date</th><th>Items</th><th>Status</th><th style="text-align:right">Total Cost</th></tr></thead>
        <tbody>${supplier.purchaseOrders.map(po => `
          <tr>
            <td style="font-family:monospace">${po.orderNumber}</td>
            <td>${po.orderDate}</td><td>${po.itemCount} items</td>
            <td><span class="badge ${po.status}">${PO_STATUS_LABEL[po.status] || po.status}</span></td>
            <td style="text-align:right">HK$${po.totalCost.toLocaleString()}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot><tr><td colspan="4" style="text-align:right;padding:10px 12px;">Total PO Value</td><td style="text-align:right;padding:10px 12px;">HK$${totalPOValue.toLocaleString()}</td></tr></tfoot>
      </table>` : ''}
      ${supplier.notes ? `<div class="card"><h3>Internal Notes</h3><p>${supplier.notes}</p></div>` : ''}
      <div class="footer"><p>Confidential — ACE CMS &nbsp;|&nbsp; ${new Date().toLocaleDateString()}</p></div>
      <script>window.onload = function() { window.print(); }<\/script>
    </body></html>
  `);
  printWindow.document.close();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SupplierManagement() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierTab, setSupplierTab] = useState<'profile' | 'pos'>('profile');
  const [search, setSearch] = useState('');
  const { navigateTo } = useContext(NavigationContext);

  useEffect(() => {
    async function fetchSuppliers() {
      try {
        const res = await supplierService.getSuppliers();
        const suppliersData = (res.data as any)?.data || res.data;
        if (suppliersData && Array.isArray(suppliersData) && suppliersData.length > 0) {
          const mapped = suppliersData.filter((s: any) => s && s.name).map((s: any) => ({
            id: String(s.id || ''),
            name: s.name || '',
            contactPerson: s.contact || '',
            email: s.email || '',
            phone: s.phone || '',
            address: s.address || '',
            paymentTerms: 'Net 30',
            creditLimit: 0,
            rating: 4.0,
            categories: s.productsSupplied || [],
            notes: '',
            currency: 'HKD',
            purchaseOrders: [],
          }));
          if (mapped.length > 0) {
            setSuppliers(mapped);
          }
        }
      } catch (error) {
        console.warn('Using fallback data, API unavailable');
      }
    }
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (itemId && suppliers.length > 0) {
      const found = suppliers.find(s => s.id === itemId || s.name === itemId);
      if (found) {
        setEditingSupplier(JSON.parse(JSON.stringify(found)));
        setSupplierTab('pos');
        setView('edit');
      }
    }
  }, [itemId, suppliers]);

  const openEdit = (s: Supplier) => {
    navigate(`/suppliers/${s.id}`);
  };

  const openCreate = () => {
    setEditingSupplier({
      id: `sup-${Date.now()}`, name: '', contactPerson: '', email: '', phone: '',
      address: '', paymentTerms: 'Net 30', creditLimit: 0,
      categories: [], notes: '', currency: 'HKD', purchaseOrders: [],
    });
    setSupplierTab('profile');
    setView('edit');
  };

  const handleSave = () => {
    if (!editingSupplier) return;
    setSuppliers(prev => {
      const ex = prev.find(s => s.id === editingSupplier.id);
      return ex ? prev.map(s => s.id === editingSupplier.id ? editingSupplier : s) : [...prev, editingSupplier];
    });
    toast.success('Supplier saved');
    navigate('/suppliers');
    setEditingSupplier(null);
  };

  const handleDelete = (id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
    toast.success('Supplier deleted');
  };

  const update = <K extends keyof Supplier>(f: K, v: Supplier[K]) =>
    setEditingSupplier(prev => prev ? { ...prev, [f]: v } : prev);

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
    s.categories.some(c => c.toLowerCase().includes(search.toLowerCase()))
  );

  // ─── Edit View ──────────────────────────────────────────────────────────────

  if (view === 'edit' && editingSupplier) {
    const totalPOValue = editingSupplier.purchaseOrders.reduce((sum, po) => sum + po.totalCost, 0);
    const isNew = editingSupplier.id.startsWith('sup-');

    return (
      <main className="min-h-full">
        <div className="bg-gradient-to-r from-[#0f2942] to-[#1a3f5c] text-white px-6 py-5">
          <div className="flex items-center gap-2 text-sm text-white/70 mb-3">
            <button onClick={() => { navigate('/suppliers'); setEditingSupplier(null); }} className="hover:text-white flex items-center gap-1 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Suppliers
            </button>
            <span>/</span>
            <span className="text-white">{editingSupplier.name || 'New Supplier'}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-white">{isNew ? 'New Supplier' : editingSupplier.name}</h1>
              {!isNew && <p className="text-white/60 text-sm">{editingSupplier.contactPerson} · {editingSupplier.email}</p>}
            </div>
            <div className="flex gap-2 flex-wrap">
              {!isNew && (
                <Button variant="outline" onClick={() => generateSupplierPDF(editingSupplier)} className="border-white/30 text-white hover:bg-white/10 bg-transparent">
                  <Printer className="w-4 h-4 mr-1" /> Export PDF
                </Button>
              )}
              <Button variant="outline" onClick={() => { navigate('/suppliers'); setEditingSupplier(null); }} className="border-white/30 text-white hover:bg-white/10 bg-transparent">Cancel</Button>
              <Button onClick={handleSave} className="bg-[#cec18a] text-[#0f2942] hover:bg-[#d4c990]">Save Supplier</Button>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        {!isNew && (
          <div className="px-6 pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total POs', value: editingSupplier.purchaseOrders.length, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: '📋' },
                { label: 'Total PO Value', value: `HK$${totalPOValue.toLocaleString()}`, color: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: '💰' },
                { label: 'Credit Limit', value: `HK$${editingSupplier.creditLimit.toLocaleString()}`, color: 'bg-purple-50 border-purple-200 text-purple-700', icon: '💳' },
                { label: 'Payment Terms', value: editingSupplier.paymentTerms, color: 'bg-amber-50 border-amber-200 text-amber-700', icon: '📅' },
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

        {/* Tabs */}
        {!isNew && (
          <div className="flex gap-0 border-b border-border mx-6 mt-4 overflow-x-auto">
            {[
              { id: 'profile', label: 'Supplier Profile' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setSupplierTab(tab.id as typeof supplierTab)}
                className={`px-5 py-2.5 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap ${supplierTab === tab.id ? 'border-[#0f2942] text-[#0f2942]' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="p-4 sm:p-6 space-y-5">
          {/* Profile Tab */}
          {(isNew || supplierTab === 'profile') && (
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-[#0f2942]/10 to-transparent border-l-4 border-[#0f2942] py-3">
                <CardTitle className="text-sm text-[#0f2942]">Supplier Profile</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {([['Company Name', 'name'], ['Contact Person', 'contactPerson'], ['Email', 'email'], ['Phone', 'phone']] as const).map(([label, field]) => (
                    <div key={field} className="space-y-1">
                      <label className="text-sm text-muted-foreground">{label}</label>
                      <Input value={editingSupplier[field]} onChange={(e) => update(field, e.target.value)} />
                    </div>
                  ))}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-sm text-muted-foreground">Address</label>
                    <Input value={editingSupplier.address} onChange={(e) => update('address', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Payment Terms</label>
                    <select className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background" value={editingSupplier.paymentTerms} onChange={(e) => update('paymentTerms', e.target.value)}>
                      {['Cash on Delivery', 'Net 30', 'Net 45', 'Net 60', 'Net 90'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Currency</label>
                    <select className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background" value={editingSupplier.currency} onChange={(e) => update('currency', e.target.value)}>
                      {['HKD', 'USD', 'CNY', 'EUR', 'GBP'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Credit Limit (HKD)</label>
                    <Input type="number" value={editingSupplier.creditLimit} onChange={(e) => update('creditLimit', parseInt(e.target.value) || 0)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Internal Notes</label>
                  <textarea className="w-full h-20 px-3 py-2 border border-border rounded-lg text-sm resize-none outline-none focus:ring-1 focus:ring-ring" value={editingSupplier.notes} onChange={(e) => update('notes', e.target.value)} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* PO History — shown inline in profile tab */}
          {!isNew && (
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-[#cec18a]/20 to-amber-50 border-l-4 border-[#cec18a] py-3">
                <CardTitle className="text-sm text-amber-800 flex items-center gap-2">
                  <Truck className="w-4 h-4" /> Purchase Order History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {editingSupplier.purchaseOrders.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Truck className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm">No purchase orders found for this supplier.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[500px]">
                      <thead className="border-b border-border bg-[#0f2942]/5">
                        <tr>
                          <th className="text-left px-4 py-3 text-[#0f2942] text-xs">PO Number</th>
                          <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Order Date</th>
                          <th className="text-center px-4 py-3 text-[#0f2942] text-xs">Items</th>
                          <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Status</th>
                          <th className="text-right px-4 py-3 text-[#0f2942] text-xs">Total Cost</th>
                          <th className="text-right px-4 py-3 text-[#0f2942] text-xs">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editingSupplier.purchaseOrders.map(po => (
                          <tr key={po.id} className="border-b border-border last:border-0 hover:bg-[#0f2942]/5 transition-colors">
                            <td className="px-4 py-3">
                              <button onClick={() => navigateTo('purchase-orders', po.orderNumber)}
                                className="text-[#0f2942] hover:underline font-mono text-xs font-medium flex items-center gap-1">
                                {po.orderNumber} <ExternalLink className="w-3 h-3" />
                              </button>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{po.orderDate}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{po.itemCount} items</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${PO_STATUS_COLORS[po.status] || 'bg-muted text-muted-foreground'}`}>
                                {PO_STATUS_LABEL[po.status] || po.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">HK${po.totalCost.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">
                              <Button size="sm" variant="ghost" onClick={() => navigateTo('purchase-orders', po.orderNumber)}
                                className="h-7 text-xs hover:bg-[#0f2942]/10 hover:text-[#0f2942]">
                                View PO
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 border-[#cec18a]/30 bg-amber-50/50">
                        <tr>
                          <td colSpan={4} className="px-4 py-2.5 text-sm text-muted-foreground">Total PO Value</td>
                          <td className="px-4 py-2.5 text-right font-medium text-emerald-600">HK${totalPOValue.toLocaleString()}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
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

  const totalPOCount = suppliers.reduce((s, sup) => s + sup.purchaseOrders.length, 0);
  const totalCreditLimit = suppliers.reduce((s, sup) => s + sup.creditLimit, 0);

  return (
    <main className="min-h-full">
      <div className="bg-gradient-to-r from-[#0f2942] to-[#1a3f5c] text-white px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-white">Supplier Management</h1>
            <p className="text-white/60 text-sm">{suppliers.length} suppliers · {totalPOCount} purchase orders total</p>
          </div>
          <Button onClick={openCreate} className="bg-[#cec18a] text-[#0f2942] hover:bg-[#d4c990] self-start sm:self-auto">
            <Plus className="w-4 h-4 mr-1" /> New Supplier
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Suppliers', value: suppliers.length, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: '🏭' },
            { label: 'Total POs', value: totalPOCount, color: 'bg-purple-50 border-purple-200 text-purple-700', icon: '📋' },
            { label: 'Total Credit', value: `HK$${totalCreditLimit.toLocaleString()}`, color: 'bg-amber-50 border-amber-200 text-amber-700', icon: '💳' },
            { label: 'Currencies', value: [...new Set(suppliers.map(s => s.currency))].join(', '), color: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: '💱' },
          ].map(stat => (
            <div key={stat.label} className={`p-3 rounded-xl border ${stat.color}`}>
              <div className="flex items-center gap-2">
                <span>{stat.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs opacity-70">{stat.label}</p>
                  <p className="text-xl font-medium truncate">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search supplier, contact, category..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
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
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Payment Terms</th>
                    <th className="text-right px-4 py-3 text-[#0f2942] text-xs">Credit Limit</th>
                    <th className="text-center px-4 py-3 text-[#0f2942] text-xs">POs</th>
                    <th className="text-right px-4 py-3 text-[#0f2942] text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-[#0f2942]/5 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.currency} · {s.categories.join(', ')}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{s.contactPerson}</p>
                        <p className="text-xs text-muted-foreground">{s.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs">{s.paymentTerms}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">HK${s.creditLimit.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{s.purchaseOrders.length}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(s)} className="hover:bg-[#0f2942]/10 hover:text-[#0f2942]"><Edit className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => generateSupplierPDF(s)} className="hover:bg-amber-50 text-amber-600"><Printer className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && <div className="py-12 text-center text-muted-foreground">No suppliers found</div>}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}