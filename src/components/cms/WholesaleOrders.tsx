import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus, Edit, Search, ChevronLeft, ShoppingBag, CheckCircle,
  FileText, Printer, ExternalLink, X, Receipt, Building2, RotateCcw,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { ProductAutocomplete } from './shared/ProductAutocomplete';
import { NavigationContext } from '../../App';
import { toast } from 'sonner@2.0.3';

// ─── Types ────────────────────────────────────────────────────────────────────

type WOStatus = 'draft' | 'confirmed' | 'invoiced' | 'paid' | 'completed' | 'refunded' | 'cancelled';

type WOPayment = 'bank_transfer' | 'cheque' | 'credit_net30' | 'credit_net60' | 'credit_net90' | 'paynow' | 'cash';

interface WOItem {
  sku: string;
  productName: string;
  qty: number;
  unitPrice: number;    // wholesale price
  itemDiscount: number; // %
  subtotal: number;
}

export interface WholesaleOrderRef {
  id: string;
  orderNumber: string;
  status: WOStatus;
  orderDate: string;
  totalAmount: number;
  itemCount: number;
}

interface WholesaleOrder {
  id: string;
  orderNumber: string;
  merchantId: string;
  merchantName: string;
  merchantBR: string;
  salesRep: string;
  channel: string;
  orderDate: string;
  dueDate: string;
  paymentMethod: WOPayment;
  status: WOStatus;
  items: WOItem[];
  remarks: string;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WO_STATUS_COLORS: Record<WOStatus, string> = {
  draft:     'bg-muted text-muted-foreground',
  confirmed: 'bg-blue-100 text-blue-700',
  invoiced:  'bg-violet-100 text-violet-700',
  paid:      'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  refunded:  'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
};
const WO_STATUS_LABEL: Record<WOStatus, string> = {
  draft:     'Draft',
  confirmed: 'Confirmed',
  invoiced:  'Invoiced',
  paid:      'Paid',
  completed: 'Completed',
  refunded:  'Refunded',
  cancelled: 'Cancelled',
};
const WO_STATUS_FLOW: WOStatus[] = ['draft', 'confirmed', 'invoiced', 'paid', 'completed'];

const WO_PAYMENT_LABEL: Record<WOPayment, string> = {
  bank_transfer:  'Bank Transfer',
  cheque:         'Cheque',
  credit_net30:   'Credit — Net 30',
  credit_net60:   'Credit — Net 60',
  credit_net90:   'Credit — Net 90',
  paynow:         'PayNow / FPS',
  cash:           'Cash',
};
const WO_PAYMENT_COLORS: Record<WOPayment, string> = {
  bank_transfer:  'bg-blue-50 text-blue-700',
  cheque:         'bg-slate-50 text-slate-700',
  credit_net30:   'bg-amber-50 text-amber-700',
  credit_net60:   'bg-orange-50 text-orange-700',
  credit_net90:   'bg-rose-50 text-rose-700',
  paynow:         'bg-violet-50 text-violet-700',
  cash:           'bg-emerald-50 text-emerald-700',
};

const SALES_REPS = ['Alice Chan', 'Bob Lee', 'Carol Wong', 'David Ng'];
const CHANNELS   = ['Email', 'Phone', 'In-Person', 'Online Portal'];

// Sample data — merchant IDs match MerchantManagement INITIAL_MERCHANTS
export const INITIAL_WHOLESALE_ORDERS: WholesaleOrder[] = [
  {
    id: 'wo1', orderNumber: 'WO-2026-0012',
    merchantId: 'm1', merchantName: 'TechRetail HK Ltd.', merchantBR: 'BR-12345678',
    salesRep: 'Alice Chan', channel: 'Email',
    orderDate: '2026-03-20', dueDate: '2026-04-19',
    paymentMethod: 'credit_net30', status: 'completed',
    items: [
      { sku: 'ELEC-0042', productName: 'Wireless Earbuds Pro X', qty: 20, unitPrice: 480, itemDiscount: 5, subtotal: 9120 },
      { sku: 'ELEC-0012', productName: 'USB-C Cable (2m)', qty: 50, unitPrice: 28, itemDiscount: 0, subtotal: 1400 },
    ],
    remarks: 'Bulk order — priority fulfillment.',
    totalAmount: 10520, discountAmount: 480, finalAmount: 10040,
  },
  {
    id: 'wo2', orderNumber: 'WO-2026-0011',
    merchantId: 'm3', merchantName: 'Green Living Store', merchantBR: 'BR-11223344',
    salesRep: 'Carol Wong', channel: 'Phone',
    orderDate: '2026-03-18', dueDate: '2026-04-17',
    paymentMethod: 'credit_net30', status: 'invoiced',
    items: [
      { sku: 'HOME-0201', productName: 'Smart Air Purifier', qty: 5, unitPrice: 2100, itemDiscount: 0, subtotal: 10500 },
      { sku: 'HOME-0202', productName: 'Replacement Filter', qty: 10, unitPrice: 150, itemDiscount: 0, subtotal: 1500 },
    ],
    remarks: '',
    totalAmount: 12000, discountAmount: 0, finalAmount: 12000,
  },
  {
    id: 'wo3', orderNumber: 'WO-2026-0010',
    merchantId: 'm1', merchantName: 'TechRetail HK Ltd.', merchantBR: 'BR-12345678',
    salesRep: 'Bob Lee', channel: 'In-Person',
    orderDate: '2026-03-10', dueDate: '2026-04-09',
    paymentMethod: 'bank_transfer', status: 'paid',
    items: [
      { sku: 'FASH-0118', productName: 'Slim Fit Blazer', qty: 10, unitPrice: 280, itemDiscount: 10, subtotal: 2520 },
      { sku: 'FASH-0119', productName: 'Dress Shirt',     qty: 15, unitPrice: 161, itemDiscount: 0,  subtotal: 2415 },
    ],
    remarks: 'Bank remittance received Mar 12.',
    totalAmount: 5215, discountAmount: 280, finalAmount: 4935,
  },
  {
    id: 'wo4', orderNumber: 'WO-2026-0009',
    merchantId: 'm3', merchantName: 'Green Living Store', merchantBR: 'BR-11223344',
    salesRep: 'Alice Chan', channel: 'Email',
    orderDate: '2026-02-25', dueDate: '2026-03-27',
    paymentMethod: 'cheque', status: 'completed',
    items: [
      { sku: 'HOME-0201', productName: 'Smart Air Purifier', qty: 3, unitPrice: 2100, itemDiscount: 0, subtotal: 6300 },
    ],
    remarks: 'Cheque received.',
    totalAmount: 6300, discountAmount: 0, finalAmount: 6300,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcSubtotal(item: WOItem): number {
  return parseFloat((item.qty * item.unitPrice * (1 - item.itemDiscount / 100)).toFixed(2));
}

function recalcTotals(items: WOItem[]) {
  const total    = items.reduce((s, i) => s + i.subtotal, 0);
  const original = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const discount = parseFloat((original - total).toFixed(2));
  const final    = parseFloat(total.toFixed(2));
  return { totalAmount: total, discountAmount: discount, finalAmount: final };
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function generateWOPDF(order: WholesaleOrder) {
  const w = window.open('', '_blank');
  if (!w) { toast.error('Please allow popups to generate PDF'); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>${order.orderNumber}</title><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:12px;color:#333;padding:30px}
    .header{background:#0f2942;color:white;padding:20px 24px;border-radius:8px;margin-bottom:24px}
    .header h1{font-size:20px;margin-bottom:4px}
    .header p{opacity:.75;font-size:11px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
    .card{border:1px solid #e5e7eb;border-radius:8px;padding:16px}
    .card h3{font-size:13px;color:#0f2942;margin-bottom:10px;border-bottom:2px solid #cec18a;padding-bottom:6px}
    .row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f3f4f6}
    .row:last-child{border:none}
    .label{color:#6b7280}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    thead{background:#0f2942;color:white}
    th{padding:10px 12px;text-align:left;font-size:11px}
    td{padding:9px 12px;border-bottom:1px solid #e5e7eb;font-size:12px}
    tfoot td{background:#f0f9f6;font-weight:bold}
    .footer{text-align:center;color:#9ca3af;font-size:11px;margin-top:30px;border-top:1px solid #e5e7eb;padding-top:16px}
    @media print{body{padding:15px}@page{margin:1cm}}
  </style></head><body>
    <div class="header">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div><h1>${order.orderNumber}</h1>
          <p>Wholesale Order &nbsp;|&nbsp; ${WO_STATUS_LABEL[order.status]} &nbsp;|&nbsp; ${WO_PAYMENT_LABEL[order.paymentMethod]}</p>
        </div>
        <div style="text-align:right;font-size:11px;opacity:.8"><p>ACE CMS</p><p>Generated: ${new Date().toLocaleDateString()}</p></div>
      </div>
    </div>
    <div class="grid">
      <div class="card"><h3>Merchant</h3>
        <div class="row"><span class="label">Company</span><span>${order.merchantName}</span></div>
        <div class="row"><span class="label">BR Number</span><span>${order.merchantBR}</span></div>
      </div>
      <div class="card"><h3>Order Details</h3>
        <div class="row"><span class="label">Order Date</span><span>${order.orderDate}</span></div>
        <div class="row"><span class="label">Due Date</span><span>${order.dueDate}</span></div>
        <div class="row"><span class="label">Sales Rep</span><span>${order.salesRep}</span></div>
        <div class="row"><span class="label">Channel</span><span>${order.channel}</span></div>
      </div>
    </div>
    <table>
      <thead><tr><th>SKU</th><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:center">Disc.%</th><th style="text-align:right">Subtotal</th></tr></thead>
      <tbody>${order.items.map(i => `<tr>
        <td style="font-family:monospace">${i.sku}</td><td>${i.productName}</td>
        <td style="text-align:center">${i.qty}</td>
        <td style="text-align:right">HK$${i.unitPrice.toLocaleString()}</td>
        <td style="text-align:center">${i.itemDiscount > 0 ? i.itemDiscount + '%' : '—'}</td>
        <td style="text-align:right">HK$${i.subtotal.toLocaleString()}</td>
      </tr>`).join('')}</tbody>
      <tfoot>
        <tr><td colspan="5" style="text-align:right;padding:8px 12px">Discount</td><td style="text-align:right;padding:8px 12px">− HK$${order.discountAmount.toLocaleString()}</td></tr>
        <tr><td colspan="5" style="text-align:right;padding:8px 12px">Final Amount</td><td style="text-align:right;padding:8px 12px">HK$${order.finalAmount.toLocaleString()}</td></tr>
      </tfoot>
    </table>
    ${order.remarks ? `<div class="card" style="margin-bottom:20px"><h3>Remarks</h3><p>${order.remarks}</p></div>` : ''}
    <div class="footer"><p>Confidential — ACE CMS &nbsp;|&nbsp; ${new Date().toLocaleDateString()}</p></div>
    <script>window.onload=function(){window.print()}<\/script>
  </body></html>`);
  w.document.close();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WholesaleOrders() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<WholesaleOrder[]>(INITIAL_WHOLESALE_ORDERS);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingOrder, setEditingOrder] = useState<WholesaleOrder | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const { navigateTo } = useContext(NavigationContext);

  useEffect(() => {
    if (itemId && orders.length > 0) {
      const found = orders.find(o => o.orderNumber === itemId || o.id === itemId || o.merchantId === itemId);
      if (found) {
        setEditingOrder(JSON.parse(JSON.stringify(found)));
        setView('edit');
      }
    }
  }, [itemId, orders]);

  const openEdit = (o: WholesaleOrder) => {
    setEditingOrder(JSON.parse(JSON.stringify(o)));
    setView('edit');
    navigate(`/wholesale-orders/${o.id}`);
  };

  const openCreate = () => {
    const newWO: WholesaleOrder = {
      id: `wo-${Date.now()}`,
      orderNumber: `WO-2026-${String(orders.length + 13).padStart(4, '0')}`,
      merchantId: '', merchantName: '', merchantBR: '',
      salesRep: SALES_REPS[0], channel: CHANNELS[0],
      orderDate: new Date().toISOString().split('T')[0],
      dueDate: addDays(new Date().toISOString().split('T')[0], 30),
      paymentMethod: 'credit_net30', status: 'draft',
      items: [{ sku: '', productName: '', qty: 1, unitPrice: 0, itemDiscount: 0, subtotal: 0 }],
      remarks: '',
      totalAmount: 0, discountAmount: 0, finalAmount: 0,
    };
    setEditingOrder(newWO);
    setView('edit');
  };

  const handleSave = () => {
    if (!editingOrder) return;
    const calcs = recalcTotals(editingOrder.items);
    const updated = { ...editingOrder, ...calcs };
    setOrders(prev => {
      const ex = prev.find(o => o.id === updated.id);
      return ex ? prev.map(o => o.id === updated.id ? updated : o) : [...prev, updated];
    });
    toast.success('Wholesale order saved');
    navigate('/wholesale-orders');
  };

  const updateStatus = (status: WOStatus) => {
    if (!editingOrder) return;
    setEditingOrder(prev => prev ? { ...prev, status } : prev);
    toast.success(`Status updated to ${WO_STATUS_LABEL[status]}`);
  };

  const update = <K extends keyof WholesaleOrder>(f: K, v: WholesaleOrder[K]) =>
    setEditingOrder(prev => prev ? { ...prev, [f]: v } : prev);

  const updateItem = (index: number, field: keyof WOItem, value: string | number) => {
    setEditingOrder(prev => {
      if (!prev) return prev;
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      items[index].subtotal = calcSubtotal(items[index]);
      return { ...prev, items };
    });
  };

  const addItem = () =>
    setEditingOrder(prev => prev
      ? { ...prev, items: [...prev.items, { sku: '', productName: '', qty: 1, unitPrice: 0, itemDiscount: 0, subtotal: 0 }] }
      : prev);

  const removeItem = (i: number) =>
    setEditingOrder(prev => prev ? { ...prev, items: prev.items.filter((_, idx) => idx !== i) } : prev);

  const filtered = orders.filter(o =>
    (o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
     o.merchantName.toLowerCase().includes(search.toLowerCase()) ||
     o.salesRep.toLowerCase().includes(search.toLowerCase())) &&
    (filterStatus === '' || o.status === filterStatus)
  );

  // ─── Edit View ──────────────────────────────────────────────────────────────

  if (view === 'edit' && editingOrder) {
    const calcs = recalcTotals(editingOrder.items);
    const isNew = editingOrder.id.startsWith('wo-');
    const isEditable = ['draft', 'confirmed'].includes(editingOrder.status);
    const currentStepIndex = WO_STATUS_FLOW.indexOf(editingOrder.status);

    return (
      <div className="min-h-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0f2942] to-[#1a3f5c] text-white px-6 py-5">
          <div className="flex items-center gap-2 text-sm text-white/70 mb-3">
            <button onClick={() => navigate('/wholesale-orders')} className="hover:text-white flex items-center gap-1 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Wholesale Orders
            </button>
            <span>/</span>
            <span className="text-white">{editingOrder.orderNumber}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-white">{editingOrder.orderNumber}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${WO_STATUS_COLORS[editingOrder.status]}`}>
                  {WO_STATUS_LABEL[editingOrder.status]}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${WO_PAYMENT_COLORS[editingOrder.paymentMethod]}`}>
                  {WO_PAYMENT_LABEL[editingOrder.paymentMethod]}
                </span>
              </div>
              <p className="text-white/60 text-sm">{editingOrder.merchantName || 'No merchant selected'} · Rep: {editingOrder.salesRep}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {['invoiced', 'paid', 'completed'].includes(editingOrder.status) && (
                <Button variant="outline" onClick={() => generateWOPDF(editingOrder)} className="border-white/30 text-white hover:bg-white/10 bg-transparent">
                  <Printer className="w-4 h-4 mr-1" /> Export PDF
                </Button>
              )}
              {['paid', 'completed'].includes(editingOrder.status) && (
                <Button variant="outline" className="border-orange-300 text-orange-200 hover:bg-orange-500/20 bg-transparent" onClick={() => updateStatus('refunded')}>
                  <RotateCcw className="w-4 h-4 mr-1" /> Refund
                </Button>
              )}
              {!['cancelled', 'refunded', 'completed'].includes(editingOrder.status) && (
                <Button variant="outline" className="border-red-300 text-red-200 hover:bg-red-500/20 bg-transparent" onClick={() => updateStatus('cancelled')}>
                  <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate('/wholesale-orders')} className="border-white/30 text-white hover:bg-white/10 bg-transparent">Back</Button>
              <Button onClick={handleSave} className="bg-[#cec18a] text-[#0f2942] hover:bg-[#d4c990]">Save Order</Button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-5">

          {/* Status Timeline */}
          {!['cancelled', 'refunded'].includes(editingOrder.status) && (
            <Card className="shadow-sm overflow-hidden">
              <CardContent className="py-5 px-6">
                <div className="flex items-center gap-0">
                  {WO_STATUS_FLOW.map((step, i) => (
                    <React.Fragment key={step}>
                      <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                        <button
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border-2 transition-colors flex-shrink-0 ${
                            i <= currentStepIndex
                              ? 'bg-[#0f2942] border-[#0f2942] text-white'
                              : 'bg-background border-border text-muted-foreground hover:border-[#0f2942]/40'
                          }`}
                          onClick={() => isEditable || i === currentStepIndex + 1 ? updateStatus(WO_STATUS_FLOW[i]) : undefined}
                          title={`Set to ${WO_STATUS_LABEL[step]}`}
                        >
                          {i < currentStepIndex ? <CheckCircle className="w-4 h-4" /> : i + 1}
                        </button>
                        <span className="text-xs text-muted-foreground text-center hidden sm:block">{WO_STATUS_LABEL[step]}</span>
                      </div>
                      {i < WO_STATUS_FLOW.length - 1 && (
                        <div className={`flex-1 h-0.5 mb-5 sm:mb-4 transition-colors ${i < currentStepIndex ? 'bg-[#0f2942]' : 'bg-border'}`} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                  {WO_STATUS_FLOW.filter(s => s !== editingOrder.status).map(s => (
                    <Button key={s} size="sm" variant="outline" onClick={() => updateStatus(s)}
                      className="text-xs h-7">
                      → {WO_STATUS_LABEL[s]}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Subtotal', value: `HK$${(calcs.totalAmount + calcs.discountAmount).toLocaleString()}`, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: '🧾' },
              { label: 'Discount', value: `HK$${calcs.discountAmount.toLocaleString()}`, color: 'bg-rose-50 border-rose-200 text-rose-700', icon: '🏷️' },
              { label: 'Final Amount', value: `HK$${calcs.finalAmount.toLocaleString()}`, color: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: '💰' },
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Order Information */}
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-blue-50 border-l-4 border-blue-400 py-3">
                <CardTitle className="text-sm text-blue-700 flex items-center gap-2">
                  <Receipt className="w-4 h-4" /> Order Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Order Date</label>
                    <Input type="date" value={editingOrder.orderDate}
                      onChange={(e) => {
                        update('orderDate', e.target.value);
                        // auto-update due date based on payment terms
                        const days = editingOrder.paymentMethod === 'credit_net60' ? 60 : editingOrder.paymentMethod === 'credit_net90' ? 90 : 30;
                        update('dueDate', addDays(e.target.value, days));
                      }}
                      disabled={!isEditable} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Due Date</label>
                    <Input type="date" value={editingOrder.dueDate}
                      onChange={(e) => update('dueDate', e.target.value)}
                      disabled={!isEditable} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Status</label>
                  <select className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background"
                    value={editingOrder.status}
                    onChange={(e) => update('status', e.target.value as WOStatus)}>
                    {Object.entries(WO_STATUS_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Payment Method / Terms</label>
                  <select className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background"
                    value={editingOrder.paymentMethod}
                    onChange={(e) => {
                      const pm = e.target.value as WOPayment;
                      update('paymentMethod', pm);
                      const days = pm === 'credit_net60' ? 60 : pm === 'credit_net90' ? 90 : pm === 'credit_net30' ? 30 : 0;
                      if (days > 0) update('dueDate', addDays(editingOrder.orderDate, days));
                    }}
                    disabled={!isEditable}>
                    {Object.entries(WO_PAYMENT_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Sales Rep</label>
                    <select className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background"
                      value={editingOrder.salesRep}
                      onChange={(e) => update('salesRep', e.target.value)}
                      disabled={!isEditable}>
                      {SALES_REPS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Order Channel</label>
                    <select className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background"
                      value={editingOrder.channel}
                      onChange={(e) => update('channel', e.target.value)}
                      disabled={!isEditable}>
                      {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Remarks</label>
                  <textarea
                    className="w-full h-16 px-3 py-2 border border-border rounded-lg text-sm resize-none outline-none focus:ring-1 focus:ring-ring"
                    value={editingOrder.remarks}
                    onChange={(e) => update('remarks', e.target.value)}
                    placeholder="Internal remarks..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Merchant Info */}
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-violet-500/10 to-violet-50 border-l-4 border-violet-400 py-3">
                <CardTitle className="text-sm text-violet-700 flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Merchant Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Company Name</label>
                  <Input value={editingOrder.merchantName}
                    onChange={(e) => update('merchantName', e.target.value)}
                    placeholder="Merchant company name"
                    disabled={!isEditable} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">BR Number</label>
                    <Input value={editingOrder.merchantBR}
                      onChange={(e) => update('merchantBR', e.target.value)}
                      placeholder="BR-XXXXXXXX"
                      className="font-mono"
                      disabled={!isEditable} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Merchant ID</label>
                    <div className="flex gap-1.5">
                      <Input value={editingOrder.merchantId}
                        onChange={(e) => update('merchantId', e.target.value)}
                        placeholder="m1, m2 …"
                        disabled={!isEditable} />
                      {editingOrder.merchantId && (
                        <button
                          onClick={() => navigateTo('merchants', editingOrder.merchantId)}
                          className="w-9 h-9 flex items-center justify-center text-[#0f2942] hover:bg-[#0f2942]/10 rounded-md border border-border transition-colors flex-shrink-0"
                          title="View merchant profile"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border space-y-1.5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Payment Summary</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal (before discounts)</span>
                    <span>HK${(calcs.totalAmount + calcs.discountAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-rose-600">
                    <span>Total Discounts</span>
                    <span>− HK${calcs.discountAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium border-t border-border pt-1.5">
                    <span>Invoice Amount</span>
                    <span className="text-[#0f2942]">HK${calcs.finalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Due Date</span>
                    <span className={new Date(editingOrder.dueDate) < new Date() && !['paid','completed','refunded'].includes(editingOrder.status) ? 'text-rose-600 font-medium' : ''}>
                      {editingOrder.dueDate}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Items */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-emerald-50 border-l-4 border-emerald-400 py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-emerald-700 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" /> Order Items
                  <span className="text-xs text-muted-foreground font-normal ml-1">(wholesale price)</span>
                </CardTitle>
                {isEditable && (
                  <Button size="sm" variant="outline" onClick={addItem} className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[750px]">
                  <thead className="border-b border-border bg-[#0f2942]/5">
                    <tr>
                      <th className="text-left px-4 py-2 text-[#0f2942] text-xs">SKU</th>
                      <th className="text-left px-4 py-2 text-[#0f2942] text-xs">Product Name</th>
                      <th className="text-center px-4 py-2 text-[#0f2942] text-xs">Qty</th>
                      <th className="text-right px-4 py-2 text-[#0f2942] text-xs">Wholesale Price</th>
                      <th className="text-center px-4 py-2 text-[#0f2942] text-xs">Disc. %</th>
                      <th className="text-right px-4 py-2 text-[#0f2942] text-xs">Subtotal</th>
                      {isEditable && <th className="px-3 py-2" />}
                    </tr>
                  </thead>
                  <tbody>
                    {editingOrder.items.map((item, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-3 py-2 w-32">
                          <ProductAutocomplete
                            mode="sku" value={item.sku}
                            onChange={(v) => updateItem(i, 'sku', v)}
                            onSelect={(p) => {
                              setEditingOrder(prev => {
                                if (!prev) return prev;
                                const items = [...prev.items];
                                const ni = { ...items[i], sku: p.sku, productName: p.name, unitPrice: p.wholePrice };
                                ni.subtotal = calcSubtotal(ni);
                                items[i] = ni;
                                return { ...prev, items };
                              });
                            }}
                            placeholder="SKU" disabled={!isEditable}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <ProductAutocomplete
                            mode="name" value={item.productName}
                            onChange={(v) => updateItem(i, 'productName', v)}
                            onSelect={(p) => {
                              setEditingOrder(prev => {
                                if (!prev) return prev;
                                const items = [...prev.items];
                                const ni = { ...items[i], sku: p.sku, productName: p.name, unitPrice: p.wholePrice };
                                ni.subtotal = calcSubtotal(ni);
                                items[i] = ni;
                                return { ...prev, items };
                              });
                            }}
                            placeholder="Product name" disabled={!isEditable}
                          />
                        </td>
                        <td className="px-3 py-2 w-20">
                          <Input type="number" min={1} value={item.qty}
                            onChange={(e) => updateItem(i, 'qty', parseInt(e.target.value) || 1)}
                            className="text-center" disabled={!isEditable} />
                        </td>
                        <td className="px-3 py-2 w-32">
                          <Input type="number" min={0} step="0.1" value={item.unitPrice}
                            onChange={(e) => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="text-right" disabled={!isEditable} />
                        </td>
                        <td className="px-3 py-2 w-24">
                          <Input type="number" min={0} max={100} value={item.itemDiscount}
                            onChange={(e) => updateItem(i, 'itemDiscount', parseFloat(e.target.value) || 0)}
                            className="text-center" disabled={!isEditable} />
                        </td>
                        <td className="px-4 py-2 text-right font-medium whitespace-nowrap">HK${item.subtotal.toLocaleString()}</td>
                        {isEditable && (
                          <td className="px-3 py-2">
                            <button onClick={() => removeItem(i)}
                              className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-border bg-muted/10">
                    <tr>
                      <td colSpan={isEditable ? 5 : 5} className="px-4 py-2.5 text-right text-sm text-muted-foreground">Invoice Total</td>
                      <td className="px-4 py-2.5 text-right font-medium text-emerald-600">HK${calcs.finalAmount.toLocaleString()}</td>
                      {isEditable && <td />}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── List View ──────────────────────────────────────────────────────────────

  const totalValue = orders.filter(o => ['paid', 'completed'].includes(o.status)).reduce((s, o) => s + o.finalAmount, 0);
  const pendingValue = orders.filter(o => o.status === 'invoiced').reduce((s, o) => s + o.finalAmount, 0);

  return (
    <div className="min-h-full">
      <div className="bg-gradient-to-r from-[#0f2942] to-[#1a3f5c] text-white px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-white">Wholesale Orders</h1>
            <p className="text-white/60 text-sm">{orders.length} orders · HK${totalValue.toLocaleString()} settled · HK${pendingValue.toLocaleString()} outstanding</p>
          </div>
          <Button onClick={openCreate} className="bg-[#cec18a] text-[#0f2942] hover:bg-[#d4c990] self-start sm:self-auto">
            <Plus className="w-4 h-4 mr-1" /> New Wholesale Order
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Orders', value: orders.length, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: '📦' },
            { label: 'Invoiced (Due)', value: orders.filter(o => o.status === 'invoiced').length, color: 'bg-violet-50 border-violet-200 text-violet-700', icon: '📄' },
            { label: 'Paid / Completed', value: orders.filter(o => ['paid','completed'].includes(o.status)).length, color: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: '✅' },
            { label: 'Draft / Confirmed', value: orders.filter(o => ['draft','confirmed'].includes(o.status)).length, color: 'bg-amber-50 border-amber-200 text-amber-700', icon: '✏️' },
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
            <Input className="pl-9" placeholder="Search order, merchant, sales rep…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="h-9 px-3 border border-border rounded-md text-sm bg-background" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {Object.entries(WO_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Table */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="border-b border-border bg-[#0f2942]/5">
                  <tr>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Order #</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Merchant</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Sales Rep</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Payment</th>
                    <th className="text-right px-4 py-3 text-[#0f2942] text-xs">Amount</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Status</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Date</th>
                    <th className="text-right px-4 py-3 text-[#0f2942] text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(o => (
                    <tr key={o.id} className="border-b border-border last:border-0 hover:bg-[#0f2942]/5 transition-colors">
                      <td className="px-4 py-3 text-[#0f2942] font-mono text-xs font-medium">{o.orderNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{o.merchantName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{o.merchantBR}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{o.salesRep}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${WO_PAYMENT_COLORS[o.paymentMethod]}`}>
                          {WO_PAYMENT_LABEL[o.paymentMethod]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">HK${o.finalAmount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${WO_STATUS_COLORS[o.status]}`}>
                          {WO_STATUS_LABEL[o.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{o.orderDate}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(o)} className="hover:bg-[#0f2942]/10 hover:text-[#0f2942]"><Edit className="w-3.5 h-3.5" /></Button>
                          {['invoiced', 'paid', 'completed'].includes(o.status) && (
                            <Button variant="ghost" size="sm" onClick={() => generateWOPDF(o)} className="hover:bg-amber-50 text-amber-600">
                              <Printer className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && <div className="py-12 text-center text-muted-foreground">No wholesale orders found</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
