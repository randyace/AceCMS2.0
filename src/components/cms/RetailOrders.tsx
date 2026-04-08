import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus, Edit, Search, ChevronLeft, ShoppingBag, CheckCircle,
  CreditCard, Printer, ExternalLink, X, Receipt, User,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { ProductAutocomplete } from './shared/ProductAutocomplete';
import { NavigationContext } from '../../App';
import { toast } from 'sonner@2.0.3';

// ─── Types ───────────────────────────────────────────────────────────────────

type ROStatus = 'draft' | 'pending' | 'paid' | 'completed' | 'refunded' | 'cancelled';

type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'qr_pay' | 'member_points' | 'mixed';

interface ROItem {
  sku: string;
  productName: string;
  qty: number;
  unitPrice: number;
  itemDiscount: number; // percentage
  subtotal: number;
}

interface RetailOrder {
  id: string;
  orderNumber: string;
  status: ROStatus;
  saleDate: string;
  outletId: string;
  outletName: string;
  cashier: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: PaymentMethod;
  items: ROItem[];
  remarks: string;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  amountTendered: number;
  changeGiven: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RO_STATUS_COLORS: Record<ROStatus, string> = {
  draft:     'bg-muted text-muted-foreground',
  pending:   'bg-blue-100 text-blue-700',
  paid:      'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  refunded:  'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
};
const RO_STATUS_LABEL: Record<ROStatus, string> = {
  draft:     'Draft',
  pending:   'Pending Payment',
  paid:      'Paid',
  completed: 'Completed',
  refunded:  'Refunded',
  cancelled: 'Cancelled',
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash:          'Cash',
  credit_card:   'Credit Card',
  debit_card:    'Debit Card',
  qr_pay:        'QR Pay',
  member_points: 'Member Points',
  mixed:         'Mixed Payment',
};
const PAYMENT_METHOD_COLORS: Record<PaymentMethod, string> = {
  cash:          'bg-emerald-50 text-emerald-700',
  credit_card:   'bg-blue-50 text-blue-700',
  debit_card:    'bg-indigo-50 text-indigo-700',
  qr_pay:        'bg-violet-50 text-violet-700',
  member_points: 'bg-amber-50 text-amber-700',
  mixed:         'bg-slate-50 text-slate-700',
};

const OUTLETS = [
  { id: 'o1', name: 'Flagship Store — Central' },
  { id: 'o2', name: 'Branch — Causeway Bay' },
  { id: 'o3', name: 'Kiosk — Harbour City' },
];

const CASHIERS = ['Alice Chan', 'Bob Lee', 'Carol Wong', 'David Ng'];

const INITIAL_ORDERS: RetailOrder[] = [
  {
    id: 'ro1', orderNumber: 'RO-2026-0031',
    status: 'completed', saleDate: '2026-03-29',
    outletId: 'o1', outletName: 'Flagship Store — Central',
    cashier: 'Alice Chan',
    customerId: 'M-00024', customerName: 'Wong Ka Yan', customerPhone: '9123 4567',
    paymentMethod: 'credit_card',
    items: [
      { sku: 'ELEC-0042', productName: 'Wireless Earbuds Pro X', qty: 1, unitPrice: 620, itemDiscount: 0, subtotal: 620 },
      { sku: 'FASH-0119', productName: 'Dress Shirt', qty: 2, unitPrice: 399, itemDiscount: 10, subtotal: 718.2 },
    ],
    remarks: 'Member discount applied.',
    totalAmount: 1338.2, discountAmount: 79.8, finalAmount: 1258.4,
    amountTendered: 1258.4, changeGiven: 0,
  },
  {
    id: 'ro2', orderNumber: 'RO-2026-0030',
    status: 'completed', saleDate: '2026-03-29',
    outletId: 'o2', outletName: 'Branch — Causeway Bay',
    cashier: 'Bob Lee',
    customerId: '', customerName: 'Walk-in Customer', customerPhone: '',
    paymentMethod: 'cash',
    items: [
      { sku: 'HOME-0201', productName: 'Smart Air Purifier', qty: 1, unitPrice: 1580, itemDiscount: 0, subtotal: 1580 },
    ],
    remarks: '',
    totalAmount: 1580, discountAmount: 0, finalAmount: 1580,
    amountTendered: 2000, changeGiven: 420,
  },
  {
    id: 'ro3', orderNumber: 'RO-2026-0029',
    status: 'refunded', saleDate: '2026-03-28',
    outletId: 'o1', outletName: 'Flagship Store — Central',
    cashier: 'Carol Wong',
    customerId: 'M-00011', customerName: 'Chan Tai Man', customerPhone: '9876 5432',
    paymentMethod: 'qr_pay',
    items: [
      { sku: 'ELEC-0043', productName: 'Wireless Earbuds Lite', qty: 1, unitPrice: 420, itemDiscount: 0, subtotal: 420 },
    ],
    remarks: 'Customer returned — product defective.',
    totalAmount: 420, discountAmount: 0, finalAmount: 420,
    amountTendered: 420, changeGiven: 0,
  },
  {
    id: 'ro4', orderNumber: 'RO-2026-0028',
    status: 'paid', saleDate: '2026-03-28',
    outletId: 'o3', outletName: 'Kiosk — Harbour City',
    cashier: 'David Ng',
    customerId: '', customerName: 'Walk-in Customer', customerPhone: '',
    paymentMethod: 'mixed',
    items: [
      { sku: 'FASH-0118', productName: 'Slim Fit Blazer', qty: 1, unitPrice: 480, itemDiscount: 5, subtotal: 456 },
      { sku: 'FASH-0119', productName: 'Dress Shirt', qty: 1, unitPrice: 399, itemDiscount: 0, subtotal: 399 },
    ],
    remarks: 'Partial cash + QR Pay.',
    totalAmount: 879, discountAmount: 24, finalAmount: 855,
    amountTendered: 855, changeGiven: 0,
  },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function calcSubtotal(item: ROItem): number {
  return parseFloat((item.qty * item.unitPrice * (1 - item.itemDiscount / 100)).toFixed(2));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RetailOrders() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<RetailOrder[]>(INITIAL_ORDERS);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingOrder, setEditingOrder] = useState<RetailOrder | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOutlet, setFilterOutlet] = useState('');
  const { navigateTo } = useContext(NavigationContext);

  useEffect(() => {
    if (itemId) {
      const found = orders.find(o => o.orderNumber === itemId || o.id === itemId);
      if (found) {
        setEditingOrder(JSON.parse(JSON.stringify(found)));
        setView('edit');
      }
    }
  }, [itemId]);

  const openEdit = (o: RetailOrder) => {
    navigate(`/retail-orders/${o.id}`);
  };

  const openCreate = () => {
    const newRO: RetailOrder = {
      id: `ro-${Date.now()}`,
      orderNumber: `RO-2026-${String(orders.length + 32).padStart(4, '0')}`,
      status: 'draft',
      saleDate: new Date().toISOString().split('T')[0],
      outletId: 'o1', outletName: OUTLETS[0].name,
      cashier: CASHIERS[0],
      customerId: '', customerName: '', customerPhone: '',
      paymentMethod: 'cash',
      items: [{ sku: '', productName: '', qty: 1, unitPrice: 0, itemDiscount: 0, subtotal: 0 }],
      remarks: '',
      totalAmount: 0, discountAmount: 0, finalAmount: 0,
      amountTendered: 0, changeGiven: 0,
    };
    setEditingOrder(newRO);
    setView('edit');
  };

  const recalcTotals = (items: ROItem[], tendered: number) => {
    const total = items.reduce((s, i) => s + i.subtotal, 0);
    const originalTotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
    const discount = parseFloat((originalTotal - total).toFixed(2));
    const final = parseFloat(total.toFixed(2));
    const change = parseFloat(Math.max(0, tendered - final).toFixed(2));
    return { totalAmount: total, discountAmount: discount, finalAmount: final, changeGiven: change };
  };

  const handleSave = () => {
    if (!editingOrder) return;
    const calcs = recalcTotals(editingOrder.items, editingOrder.amountTendered);
    const updated = { ...editingOrder, ...calcs };
    setOrders(prev => {
      const exists = prev.find(o => o.id === updated.id);
      return exists ? prev.map(o => o.id === updated.id ? updated : o) : [...prev, updated];
    });
    toast.success('Retail order saved');
    navigate('/retail-orders');
  };

  const handleCompleteSale = () => {
    if (!editingOrder) return;
    const calcs = recalcTotals(editingOrder.items, editingOrder.amountTendered);
    const updated: RetailOrder = { ...editingOrder, ...calcs, status: 'completed' };
    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    setEditingOrder(updated);
    toast.success('Sale completed & stock deducted');
  };

  const handleMarkPaid = () => {
    if (!editingOrder) return;
    const updated = { ...editingOrder, status: 'paid' as ROStatus };
    setEditingOrder(updated);
    toast.success('Order marked as paid');
  };

  const handleRefund = () => {
    if (!editingOrder) return;
    const updated = { ...editingOrder, status: 'refunded' as ROStatus };
    setEditingOrder(updated);
    toast.success('Refund processed');
  };

  const update = <K extends keyof RetailOrder>(field: K, value: RetailOrder[K]) =>
    setEditingOrder(prev => prev ? { ...prev, [field]: value } : prev);

  const updateItem = (index: number, field: keyof ROItem, value: string | number) => {
    setEditingOrder(prev => {
      if (!prev) return prev;
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      items[index].subtotal = calcSubtotal(items[index]);
      return { ...prev, items };
    });
  };

  const addItem = () =>
    setEditingOrder(prev =>
      prev ? { ...prev, items: [...prev.items, { sku: '', productName: '', qty: 1, unitPrice: 0, itemDiscount: 0, subtotal: 0 }] } : prev
    );

  const removeItem = (i: number) =>
    setEditingOrder(prev => prev ? { ...prev, items: prev.items.filter((_, idx) => idx !== i) } : prev);

  const filtered = orders.filter(o =>
    (o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
     o.customerName.toLowerCase().includes(search.toLowerCase()) ||
     o.cashier.toLowerCase().includes(search.toLowerCase())) &&
    (filterStatus === '' || o.status === filterStatus) &&
    (filterOutlet === '' || o.outletId === filterOutlet)
  );

  const todaySales = orders.filter(o =>
    o.saleDate === new Date().toISOString().split('T')[0] &&
    ['paid', 'completed'].includes(o.status)
  );

  // ─── Edit View ──────────────────────────────────────────────────────────────

  if (view === 'edit' && editingOrder) {
    const calcs = recalcTotals(editingOrder.items, editingOrder.amountTendered);
    const isNew = editingOrder.id.startsWith('ro-');
    const isEditable = ['draft', 'pending'].includes(editingOrder.status);

    return (
      <div className="min-h-full">
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-[#0f2942] to-[#1a3f5c] text-white px-6 py-5">
          <div className="flex items-center gap-2 text-sm text-white/70 mb-3">
            <button onClick={() => navigate('/retail-orders')} className="hover:text-white flex items-center gap-1 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Retail Orders
            </button>
            <span>/</span>
            <span className="text-white">{editingOrder.orderNumber}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-white">{editingOrder.orderNumber}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${RO_STATUS_COLORS[editingOrder.status]}`}>
                  {RO_STATUS_LABEL[editingOrder.status]}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${PAYMENT_METHOD_COLORS[editingOrder.paymentMethod]}`}>
                  {PAYMENT_METHOD_LABEL[editingOrder.paymentMethod]}
                </span>
              </div>
              <p className="text-white/60 text-sm">{editingOrder.outletName} · Cashier: {editingOrder.cashier}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {editingOrder.status === 'draft' && (
                <Button variant="outline" onClick={handleMarkPaid} className="border-white/30 text-white hover:bg-white/10 bg-transparent">
                  <CreditCard className="w-4 h-4 mr-1" /> Mark as Paid
                </Button>
              )}
              {['paid'].includes(editingOrder.status) && (
                <Button className="bg-green-500 hover:bg-green-600 text-white" onClick={handleCompleteSale}>
                  <CheckCircle className="w-4 h-4 mr-1" /> Complete Sale
                </Button>
              )}
              {['paid', 'completed'].includes(editingOrder.status) && (
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 bg-transparent" onClick={() => toast.success('Receipt sent to printer')}>
                  <Printer className="w-4 h-4 mr-1" /> Print Receipt
                </Button>
              )}
              {['paid', 'completed'].includes(editingOrder.status) && (
                <Button variant="outline" className="border-orange-300 text-orange-200 hover:bg-orange-500/20 bg-transparent" onClick={handleRefund}>
                  <X className="w-4 h-4 mr-1" /> Refund
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate('/retail-orders')} className="border-white/30 text-white hover:bg-white/10 bg-transparent">Cancel</Button>
              <Button onClick={handleSave} className="bg-[#cec18a] text-[#0f2942] hover:bg-[#d4c990]">Save Order</Button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Subtotal', value: `HK$${calcs.totalAmount.toLocaleString()}`, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: '🧾' },
              { label: 'Discount', value: `HK$${calcs.discountAmount.toLocaleString()}`, color: 'bg-rose-50 border-rose-200 text-rose-700', icon: '🏷️' },
              { label: 'Final Amount', value: `HK$${calcs.finalAmount.toLocaleString()}`, color: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: '💰' },
              { label: 'Change Given', value: `HK$${calcs.changeGiven.toLocaleString()}`, color: 'bg-amber-50 border-amber-200 text-amber-700', icon: '🪙' },
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
                    <label className="text-sm text-muted-foreground">Sale Date</label>
                    <Input type="date" value={editingOrder.saleDate} onChange={(e) => update('saleDate', e.target.value)} disabled={!isEditable} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Order Status</label>
                    <select
                      className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background"
                      value={editingOrder.status}
                      onChange={(e) => update('status', e.target.value as ROStatus)}
                    >
                      {Object.entries(RO_STATUS_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Sales Outlet</label>
                  <select
                    className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background"
                    value={editingOrder.outletId}
                    onChange={(e) => {
                      const o = OUTLETS.find(x => x.id === e.target.value);
                      if (o) { update('outletId', o.id); update('outletName', o.name); }
                    }}
                    disabled={!isEditable}
                  >
                    {OUTLETS.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Cashier</label>
                  <select
                    className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background"
                    value={editingOrder.cashier}
                    onChange={(e) => update('cashier', e.target.value)}
                    disabled={!isEditable}
                  >
                    {CASHIERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Payment Method</label>
                  <select
                    className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background"
                    value={editingOrder.paymentMethod}
                    onChange={(e) => update('paymentMethod', e.target.value as PaymentMethod)}
                    disabled={!isEditable}
                  >
                    {Object.entries(PAYMENT_METHOD_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Remarks</label>
                  <textarea
                    className="w-full h-16 px-3 py-2 border border-border rounded-lg text-sm resize-none outline-none focus:ring-1 focus:ring-ring"
                    value={editingOrder.remarks}
                    onChange={(e) => update('remarks', e.target.value)}
                    placeholder="Order remarks..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Customer & Payment */}
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-violet-500/10 to-violet-50 border-l-4 border-violet-400 py-3">
                <CardTitle className="text-sm text-violet-700 flex items-center gap-2">
                  <User className="w-4 h-4" /> Customer & Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Customer Name</label>
                  <Input
                    value={editingOrder.customerName}
                    onChange={(e) => update('customerName', e.target.value)}
                    placeholder="Walk-in Customer"
                    disabled={!isEditable}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Phone</label>
                    <Input
                      value={editingOrder.customerPhone}
                      onChange={(e) => update('customerPhone', e.target.value)}
                      placeholder="Optional"
                      disabled={!isEditable}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Member ID</label>
                    <div className="flex gap-1.5">
                      <Input
                        value={editingOrder.customerId}
                        onChange={(e) => update('customerId', e.target.value)}
                        placeholder="M-XXXXX"
                        disabled={!isEditable}
                      />
                      {editingOrder.customerId && (
                        <button
                          onClick={() => navigateTo('members', editingOrder.customerId)}
                          className="w-9 h-9 flex items-center justify-center text-[#0f2942] hover:bg-[#0f2942]/10 rounded-md border border-border transition-colors flex-shrink-0"
                          title="View member profile"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border space-y-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Payment Summary</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Amount Tendered (HK$)</label>
                      <Input
                        type="number" min={0} step="0.1"
                        value={editingOrder.amountTendered}
                        onChange={(e) => update('amountTendered', parseFloat(e.target.value) || 0)}
                        disabled={!isEditable}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Change Given (HK$)</label>
                      <div className={`h-9 px-3 flex items-center rounded-md border text-sm font-medium ${
                        calcs.changeGiven > 0 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-muted border-border text-muted-foreground'
                      }`}>
                        HK${calcs.changeGiven.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal (before discounts)</span>
                      <span>HK${(calcs.totalAmount + calcs.discountAmount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-rose-600">
                      <span>Total Discounts</span>
                      <span>− HK${calcs.discountAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium border-t border-border pt-1.5">
                      <span>Final Amount</span>
                      <span className="text-[#0f2942]">HK${calcs.finalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sale Items */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-emerald-50 border-l-4 border-emerald-400 py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-emerald-700 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" /> Sale Items
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
                <table className="w-full text-sm min-w-[700px]">
                  <thead className="border-b border-border bg-[#0f2942]/5">
                    <tr>
                      <th className="text-left px-4 py-2 text-[#0f2942] text-xs">SKU</th>
                      <th className="text-left px-4 py-2 text-[#0f2942] text-xs">Product Name</th>
                      <th className="text-center px-4 py-2 text-[#0f2942] text-xs">Qty</th>
                      <th className="text-right px-4 py-2 text-[#0f2942] text-xs">Unit Price</th>
                      <th className="text-center px-4 py-2 text-[#0f2942] text-xs">Disc. %</th>
                      <th className="text-right px-4 py-2 text-[#0f2942] text-xs">Subtotal</th>
                      {isEditable && <th className="px-3 py-2" />}
                    </tr>
                  </thead>
                  <tbody>
                    {editingOrder.items.map((item, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-3 py-2">
                          <ProductAutocomplete
                            mode="sku"
                            value={item.sku}
                            onChange={(v) => updateItem(i, 'sku', v)}
                            onSelect={(p) => {
                              setEditingOrder((prev) => {
                                if (!prev) return prev;
                                const items = [...prev.items];
                                const newItem = { ...items[i], sku: p.sku, productName: p.name, unitPrice: p.retailPrice };
                                newItem.subtotal = calcSubtotal(newItem);
                                items[i] = newItem;
                                return { ...prev, items };
                              });
                            }}
                            placeholder="SKU"
                            disabled={!isEditable}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <ProductAutocomplete
                            mode="name"
                            value={item.productName}
                            onChange={(v) => updateItem(i, 'productName', v)}
                            onSelect={(p) => {
                              setEditingOrder((prev) => {
                                if (!prev) return prev;
                                const items = [...prev.items];
                                const newItem = { ...items[i], sku: p.sku, productName: p.name, unitPrice: p.retailPrice };
                                newItem.subtotal = calcSubtotal(newItem);
                                items[i] = newItem;
                                return { ...prev, items };
                              });
                            }}
                            placeholder="Product name"
                            disabled={!isEditable}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Input type="number" min={1} className="h-8 text-xs text-center w-16 mx-auto" value={item.qty} onChange={(e) => updateItem(i, 'qty', parseInt(e.target.value) || 1)} disabled={!isEditable} />
                        </td>
                        <td className="px-3 py-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                            <Input type="number" min={0} className="h-8 text-xs text-right w-24 ml-auto pl-5" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} disabled={!isEditable} />
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Input type="number" min={0} max={100} className="h-8 text-xs text-center w-16 mx-auto" value={item.itemDiscount} onChange={(e) => updateItem(i, 'itemDiscount', parseFloat(e.target.value) || 0)} disabled={!isEditable} />
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          <span className={item.itemDiscount > 0 ? 'text-emerald-600' : ''}>
                            HK${item.subtotal.toLocaleString()}
                          </span>
                          {item.itemDiscount > 0 && (
                            <span className="block text-[10px] text-rose-400 line-through">
                              HK${(item.qty * item.unitPrice).toLocaleString()}
                            </span>
                          )}
                        </td>
                        {isEditable && (
                          <td className="px-3 py-2 text-right">
                            <button
                              className="w-7 h-7 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                              onClick={() => removeItem(i)}
                            >×</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-[#0f2942]/10 bg-muted/20">
                    {calcs.discountAmount > 0 && (
                      <tr>
                        <td colSpan={isEditable ? 5 : 4} className="px-4 py-1.5 text-right text-sm text-rose-500">Total Discounts</td>
                        <td className="px-4 py-1.5 text-right text-sm text-rose-500">− HK${calcs.discountAmount.toLocaleString()}</td>
                        {isEditable && <td />}
                      </tr>
                    )}
                    <tr>
                      <td colSpan={isEditable ? 5 : 4} className="px-4 py-2.5 text-right font-medium">Final Total</td>
                      <td className="px-4 py-2.5 text-right font-medium text-[#0f2942]">HK${calcs.finalAmount.toLocaleString()}</td>
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

  const todayRevenue = todaySales.reduce((s, o) => s + o.finalAmount, 0);

  return (
    <div className="min-h-full">
      <div className="bg-gradient-to-r from-[#0f2942] to-[#1a3f5c] text-white px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-white">Retail Orders (POS)</h1>
            <p className="text-white/60 text-sm">
              {orders.length} orders · Today HK${todayRevenue.toLocaleString()} revenue
            </p>
          </div>
          <Button onClick={openCreate} className="bg-[#cec18a] text-[#0f2942] hover:bg-[#d4c990] self-start sm:self-auto">
            <Plus className="w-4 h-4 mr-1" /> New Sale
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Today's Sales", value: todaySales.length, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: '🛍️' },
            { label: "Today's Revenue", value: `HK$${todayRevenue.toLocaleString()}`, color: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: '💰' },
            { label: 'Pending Payment', value: orders.filter(o => o.status === 'pending').length, color: 'bg-amber-50 border-amber-200 text-amber-700', icon: '⏳' },
            { label: 'Refunded', value: orders.filter(o => o.status === 'refunded').length, color: 'bg-orange-50 border-orange-200 text-orange-700', icon: '↩️' },
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search order, customer, cashier..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="h-9 px-3 border border-border rounded-md text-sm bg-background" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {Object.entries(RO_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="h-9 px-3 border border-border rounded-md text-sm bg-background" value={filterOutlet} onChange={(e) => setFilterOutlet(e.target.value)}>
            <option value="">All Outlets</option>
            {OUTLETS.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>

        {/* Table */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="border-b border-border bg-[#0f2942]/5">
                  <tr>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Order No.</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Customer</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Outlet</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Cashier</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Status</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Payment</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Date</th>
                    <th className="text-right px-4 py-3 text-[#0f2942] text-xs">Amount</th>
                    <th className="text-right px-4 py-3 text-[#0f2942] text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(o => (
                    <tr key={o.id} className="border-b border-border last:border-0 hover:bg-[#0f2942]/5 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-[#0f2942] font-medium">{o.orderNumber}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-sm">{o.customerName}</p>
                          {o.customerId && <p className="text-xs text-muted-foreground">{o.customerId}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{o.outletName}</td>
                      <td className="px-4 py-3 text-sm">{o.cashier}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RO_STATUS_COLORS[o.status]}`}>
                          {RO_STATUS_LABEL[o.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_METHOD_COLORS[o.paymentMethod]}`}>
                          {PAYMENT_METHOD_LABEL[o.paymentMethod]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{o.saleDate}</td>
                      <td className="px-4 py-3 text-right font-medium">HK${o.finalAmount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(o)} className="hover:bg-[#0f2942]/10 hover:text-[#0f2942]">
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => toast.success('Receipt sent to printer')} className="hover:bg-amber-50 text-amber-600">
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">No retail orders found</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}