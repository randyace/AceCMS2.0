import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Edit, Search, ChevronLeft, Truck, CheckCircle, Package, ExternalLink, Printer } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { ProductAutocomplete } from './shared/ProductAutocomplete';
import { NavigationContext } from '../../App';
import { toast } from 'sonner@2.0.3';

type POStatus = 'draft' | 'sent' | 'confirmed' | 'partial' | 'received' | 'cancelled';
interface POItem { sku: string; productName: string; qtyOrdered: number; qtyReceived: number; unitCost: number; subtotal: number; }

interface PurchaseOrder {
  id: string; orderNumber: string; supplierId: string; supplierName: string;
  status: POStatus; orderDate: string; expectedDelivery: string;
  warehouseId: string; warehouseName: string;
  items: POItem[]; remarks: string; totalCost: number;
  qualityCheckStatus: 'pending' | 'passed' | 'failed' | 'na';
}

const PO_STATUS_COLORS: Record<POStatus, string> = {
  draft: 'bg-muted text-muted-foreground', sent: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-purple-100 text-purple-700', partial: 'bg-amber-100 text-amber-700',
  received: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
};
const PO_STATUS_LABEL: Record<POStatus, string> = {
  draft: 'Draft', sent: 'Sent', confirmed: 'Confirmed',
  partial: 'Partial Receipt', received: 'Fully Received', cancelled: 'Cancelled',
};
const QC_COLORS: Record<string, string> = {
  na: 'bg-muted text-muted-foreground', pending: 'bg-amber-100 text-amber-700',
  passed: 'bg-green-100 text-green-700', failed: 'bg-red-100 text-red-700',
};

const SUPPLIERS = [
  { id: 's1', name: 'SoundMax Electronics Ltd.' },
  { id: 's2', name: 'StyleHouse Garment Co.' },
  { id: 's3', name: 'HomePlus Wholesale' },
];
const WAREHOUSES = [
  { id: 'w1', name: 'HK Central Warehouse' },
  { id: 'w2', name: 'Kowloon Distribution Centre' },
  { id: 'w3', name: 'NT Storage Hub' },
];

const INITIAL_POS: PurchaseOrder[] = [
  {
    id: 'po1', orderNumber: 'PO-2026-0052', supplierId: 's1', supplierName: 'SoundMax Electronics Ltd.',
    status: 'confirmed', orderDate: '2026-03-10', expectedDelivery: '2026-03-25',
    warehouseId: 'w1', warehouseName: 'HK Central Warehouse',
    items: [
      { sku: 'ELEC-0042', productName: 'Wireless Earbuds Pro X', qtyOrdered: 50, qtyReceived: 0, unitCost: 280, subtotal: 14000 },
      { sku: 'ELEC-0043', productName: 'Wireless Earbuds Lite', qtyOrdered: 30, qtyReceived: 0, unitCost: 180, subtotal: 5400 },
    ],
    remarks: 'Urgent restock. Contact supplier for ETA update.', totalCost: 19400, qualityCheckStatus: 'na',
  },
  {
    id: 'po2', orderNumber: 'PO-2026-0045', supplierId: 's2', supplierName: 'StyleHouse Garment Co.',
    status: 'partial', orderDate: '2026-02-20', expectedDelivery: '2026-03-10',
    warehouseId: 'w2', warehouseName: 'Kowloon Distribution Centre',
    items: [
      { sku: 'FASH-0118', productName: 'Slim Fit Blazer', qtyOrdered: 40, qtyReceived: 25, unitCost: 120, subtotal: 4800 },
      { sku: 'FASH-0119', productName: 'Dress Shirt', qtyOrdered: 60, qtyReceived: 60, unitCost: 65, subtotal: 3900 },
    ],
    remarks: 'Blazer shipment delayed. Waiting for remainder.', totalCost: 8700, qualityCheckStatus: 'passed',
  },
  {
    id: 'po3', orderNumber: 'PO-2026-0038', supplierId: 's3', supplierName: 'HomePlus Wholesale',
    status: 'received', orderDate: '2026-02-01', expectedDelivery: '2026-02-15',
    warehouseId: 'w1', warehouseName: 'HK Central Warehouse',
    items: [
      { sku: 'HOME-0201', productName: 'Smart Air Purifier', qtyOrdered: 20, qtyReceived: 20, unitCost: 980, subtotal: 19600 },
    ],
    remarks: '', totalCost: 19600, qualityCheckStatus: 'passed',
  },
];

export function PurchaseOrderManagement() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PurchaseOrder[]>(INITIAL_POS);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
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

  const goToPOList = () => {
    setView('list');
    setEditingOrder(null);
    navigate('/purchase-orders', { replace: true });
  };

  const openEdit = (o: PurchaseOrder) => { navigate(`/purchase-orders/${o.id}`); };
  const openCreate = () => {
    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`, orderNumber: `PO-2026-${String(orders.length + 53).padStart(4, '0')}`,
      supplierId: 's1', supplierName: SUPPLIERS[0].name, status: 'draft',
      orderDate: new Date().toISOString().split('T')[0], expectedDelivery: '',
      warehouseId: 'w1', warehouseName: WAREHOUSES[0].name,
      items: [{ sku: '', productName: '', qtyOrdered: 1, qtyReceived: 0, unitCost: 0, subtotal: 0 }],
      remarks: '', totalCost: 0, qualityCheckStatus: 'na',
    };
    setEditingOrder(newPO); setView('edit');
  };

  const handleSave = () => {
    if (!editingOrder) return;
    const total = editingOrder.items.reduce((sum, i) => sum + i.subtotal, 0);
    const updated = { ...editingOrder, totalCost: total };
    setOrders((prev) => {
      const existing = prev.find((o) => o.id === updated.id);
      return existing ? prev.map((o) => o.id === updated.id ? updated : o) : [...prev, updated];
    });
    toast.success('Purchase order saved');
    goToPOList();
  };

  const handleStockIn = () => {
    if (!editingOrder) return;
    const updatedItems = editingOrder.items.map((item) => ({ ...item, qtyReceived: item.qtyOrdered }));
    const allReceived = updatedItems.every((i) => i.qtyReceived >= i.qtyOrdered);
    setEditingOrder((prev) => prev ? { ...prev, items: updatedItems, status: allReceived ? 'received' : 'partial', qualityCheckStatus: 'passed' } : prev);
    toast.success('Stock-in recorded for all items');
  };

  const update = <K extends keyof PurchaseOrder>(field: K, value: PurchaseOrder[K]) =>
    setEditingOrder((prev) => prev ? { ...prev, [field]: value } : prev);

  const updateItem = (index: number, field: keyof POItem, value: string | number) => {
    setEditingOrder((prev) => {
      if (!prev) return prev;
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      if (field === 'qtyOrdered' || field === 'unitCost') {
        items[index].subtotal = items[index].qtyOrdered * items[index].unitCost;
      }
      return { ...prev, items };
    });
  };

  const addItem = () => setEditingOrder((prev) => prev ? { ...prev, items: [...prev.items, { sku: '', productName: '', qtyOrdered: 1, qtyReceived: 0, unitCost: 0, subtotal: 0 }] } : prev);
  const removeItem = (i: number) => setEditingOrder((prev) => prev ? { ...prev, items: prev.items.filter((_, idx) => idx !== i) } : prev);

  const filtered = orders.filter((o) =>
    (o.orderNumber.toLowerCase().includes(search.toLowerCase()) || o.supplierName.toLowerCase().includes(search.toLowerCase())) &&
    (filterStatus === '' || o.status === filterStatus)
  );

  if (view === 'edit' && editingOrder) {
    const total = editingOrder.items.reduce((sum, i) => sum + i.subtotal, 0);
    const totalReceived = editingOrder.items.reduce((sum, i) => sum + (i.qtyReceived * i.unitCost), 0);
    const isNew = editingOrder.id.startsWith('po-');

    return (
      <main className="min-h-full">
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-[#0f2942] to-[#1a3f5c] text-white px-6 py-5">
          <div className="flex items-center gap-2 text-sm text-white/70 mb-3">
            <button type="button" onClick={goToPOList} className="hover:text-white flex items-center gap-1 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Purchase Orders
            </button>
            <span>/</span>
            <span className="text-white">{editingOrder.orderNumber}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-white">{editingOrder.orderNumber}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs ${PO_STATUS_COLORS[editingOrder.status]}`}>{PO_STATUS_LABEL[editingOrder.status]}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs ${QC_COLORS[editingOrder.qualityCheckStatus]}`}>
                  QC: {editingOrder.qualityCheckStatus === 'na' ? 'N/A' : editingOrder.qualityCheckStatus}
                </span>
              </div>
              <p className="text-white/60 text-sm">{editingOrder.supplierName}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {editingOrder.status === 'draft' && (
                <Button variant="outline" onClick={() => { update('status', 'sent'); toast.success('PO sent to supplier'); }} className="border-white/30 text-white hover:bg-white/10 bg-transparent">
                  <Truck className="w-4 h-4 mr-1" /> Send to Supplier
                </Button>
              )}
              {['confirmed', 'sent', 'partial'].includes(editingOrder.status) && (
                <Button className="bg-green-500 hover:bg-green-600 text-white" onClick={handleStockIn}>
                  <Package className="w-4 h-4 mr-1" /> Stock In All
                </Button>
              )}
              <Button variant="outline" onClick={goToPOList} className="border-white/30 text-white hover:bg-white/10 bg-transparent">Cancel</Button>
              <Button onClick={handleSave} className="bg-[#cec18a] text-[#0f2942] hover:bg-[#d4c990]">Save PO</Button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Value', value: `HK$${total.toLocaleString()}`, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: '💰' },
              { label: 'Received Value', value: `HK$${totalReceived.toLocaleString()}`, color: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: '✅' },
              { label: 'Items', value: editingOrder.items.length, color: 'bg-purple-50 border-purple-200 text-purple-700', icon: '📦' },
              { label: 'Expected', value: editingOrder.expectedDelivery || 'Not set', color: 'bg-amber-50 border-amber-200 text-amber-700', icon: '📅' },
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* PO Information */}
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-blue-50 border-l-4 border-blue-400 py-3">
                <CardTitle className="text-sm text-blue-700">PO Information</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Supplier</label>
                  <select className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background"
                    value={editingOrder.supplierId}
                    onChange={(e) => {
                      const s = SUPPLIERS.find((sup) => sup.id === e.target.value);
                      if (s) { update('supplierId', s.id); update('supplierName', s.name); }
                    }}>
                    {SUPPLIERS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Supplier Profile</label>
                  <button
                    onClick={() => navigateTo('suppliers', editingOrder.supplierId)}
                    className="flex items-center gap-1.5 text-sm text-[#0f2942] hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View {editingOrder.supplierName}
                  </button>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Warehouse (Stock-In Destination)</label>
                  <select className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background"
                    value={editingOrder.warehouseId}
                    onChange={(e) => {
                      const w = WAREHOUSES.find((wh) => wh.id === e.target.value);
                      if (w) { update('warehouseId', w.id); update('warehouseName', w.name); }
                    }}>
                    {WAREHOUSES.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Order Date</label>
                    <Input type="date" value={editingOrder.orderDate} onChange={(e) => update('orderDate', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Expected Delivery</label>
                    <Input type="date" value={editingOrder.expectedDelivery} onChange={(e) => update('expectedDelivery', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Quality Check Status</label>
                  <select className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background" value={editingOrder.qualityCheckStatus} onChange={(e) => update('qualityCheckStatus', e.target.value as PurchaseOrder['qualityCheckStatus'])}>
                    <option value="na">N/A</option>
                    <option value="pending">Pending QC</option>
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Remarks</label>
                  <textarea className="w-full h-20 px-3 py-2 border border-border rounded-lg text-sm resize-none outline-none focus:ring-1 focus:ring-ring" value={editingOrder.remarks} onChange={(e) => update('remarks', e.target.value)} placeholder="Order remarks..." />
                </div>
              </CardContent>
            </Card>

            {/* Receipt Summary */}
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-emerald-50 border-l-4 border-emerald-400 py-3">
                <CardTitle className="text-sm text-emerald-700">Receipt Progress</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-4">
                {editingOrder.items.map((item, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium">{item.productName || item.sku || `Item ${i + 1}`}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        item.qtyReceived >= item.qtyOrdered ? 'bg-green-100 text-green-700' :
                        item.qtyReceived > 0 ? 'bg-amber-100 text-amber-700' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {item.qtyReceived}/{item.qtyOrdered}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${item.qtyReceived >= item.qtyOrdered ? 'bg-emerald-500' : 'bg-[#0f2942]'}`}
                          style={{ width: item.qtyOrdered > 0 ? `${Math.min((item.qtyReceived / item.qtyOrdered) * 100, 100)}%` : '0%' }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {item.qtyOrdered > 0 ? Math.round((item.qtyReceived / item.qtyOrdered) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t border-border space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total PO Value</span>
                    <span className="font-medium">HK${total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Received Value</span>
                    <span className="font-medium text-emerald-600">HK${totalReceived.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Items */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-500/10 to-purple-50 border-l-4 border-purple-400 py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-purple-700">Order Items</CardTitle>
                <Button size="sm" variant="outline" onClick={addItem} className="h-7 text-xs border-purple-300 text-purple-700 hover:bg-purple-50">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead className="border-b border-border bg-[#0f2942]/5">
                    <tr>
                      <th className="text-left px-4 py-2 text-[#0f2942] text-xs">SKU</th>
                      <th className="text-left px-4 py-2 text-[#0f2942] text-xs">Product Name</th>
                      <th className="text-center px-4 py-2 text-[#0f2942] text-xs">Qty Ordered</th>
                      <th className="text-center px-4 py-2 text-[#0f2942] text-xs">Qty Received</th>
                      <th className="text-right px-4 py-2 text-[#0f2942] text-xs">Unit Cost</th>
                      <th className="text-right px-4 py-2 text-[#0f2942] text-xs">Subtotal</th>
                      <th className="text-right px-4 py-2 text-[#0f2942] text-xs"></th>
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
                                items[i] = { ...items[i], sku: p.sku, productName: p.name, unitCost: p.purchasePrice, subtotal: items[i].qtyOrdered * p.purchasePrice };
                                return { ...prev, items };
                              });
                            }}
                            placeholder="SKU"
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
                                items[i] = { ...items[i], sku: p.sku, productName: p.name, unitCost: p.purchasePrice, subtotal: items[i].qtyOrdered * p.purchasePrice };
                                return { ...prev, items };
                              });
                            }}
                            placeholder="Product name"
                          />
                        </td>
                        <td className="px-3 py-2 text-center"><Input type="number" min={0} className="h-8 text-xs text-center w-20 mx-auto" value={item.qtyOrdered} onChange={(e) => updateItem(i, 'qtyOrdered', parseInt(e.target.value) || 0)} /></td>
                        <td className="px-3 py-2 text-center">
                          <Input type="number" min={0} max={item.qtyOrdered} className="h-8 text-xs text-center w-20 mx-auto" value={item.qtyReceived} onChange={(e) => updateItem(i, 'qtyReceived', parseInt(e.target.value) || 0)} />
                        </td>
                        <td className="px-3 py-2"><Input type="number" min={0} className="h-8 text-xs text-right w-24 ml-auto" value={item.unitCost} onChange={(e) => updateItem(i, 'unitCost', parseFloat(e.target.value) || 0)} /></td>
                        <td className="px-4 py-2 text-right font-medium">HK${item.subtotal.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">
                          <button className="w-7 h-7 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded-md transition-colors" onClick={() => removeItem(i)}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-[#0f2942]/10 bg-muted/20">
                    <tr>
                      <td colSpan={5} className="px-4 py-2.5 text-right font-medium">Total</td>
                      <td className="px-4 py-2.5 text-right font-medium text-[#0f2942]">HK${total.toLocaleString()}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full">
      <div className="bg-gradient-to-r from-[#0f2942] to-[#1a3f5c] text-white px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-white">Purchase Order Management</h1>
            <p className="text-white/60 text-sm">{orders.length} purchase orders · HK${orders.reduce((s, o) => s + o.totalCost, 0).toLocaleString()} total value</p>
          </div>
          <Button onClick={openCreate} className="bg-[#cec18a] text-[#0f2942] hover:bg-[#d4c990] self-start sm:self-auto">
            <Plus className="w-4 h-4 mr-1" /> New PO
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total POs', value: orders.length, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: '📋' },
            { label: 'Confirmed', value: orders.filter(o => o.status === 'confirmed').length, color: 'bg-purple-50 border-purple-200 text-purple-700', icon: '✅' },
            { label: 'Partial', value: orders.filter(o => o.status === 'partial').length, color: 'bg-amber-50 border-amber-200 text-amber-700', icon: '📦' },
            { label: 'Received', value: orders.filter(o => o.status === 'received').length, color: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: '🏭' },
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

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search PO or supplier..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="h-9 px-3 border border-border rounded-md text-sm bg-background" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {Object.entries(PO_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="border-b border-border bg-[#0f2942]/5">
                  <tr>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">PO Number</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Supplier</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Warehouse</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Status</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Order Date</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Expected</th>
                    <th className="text-right px-4 py-3 text-[#0f2942] text-xs">Total</th>
                    <th className="text-right px-4 py-3 text-[#0f2942] text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => (
                    <tr key={o.id} className="border-b border-border last:border-0 hover:bg-[#0f2942]/5 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-[#0f2942] font-medium">{o.orderNumber}</td>
                      <td className="px-4 py-3 font-medium">{o.supplierName}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{o.warehouseName}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${PO_STATUS_COLORS[o.status]}`}>{PO_STATUS_LABEL[o.status]}</span></td>
                      <td className="px-4 py-3 text-muted-foreground">{o.orderDate}</td>
                      <td className="px-4 py-3 text-muted-foreground">{o.expectedDelivery || '—'}</td>
                      <td className="px-4 py-3 text-right font-medium">HK${o.totalCost.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(o)} className="hover:bg-[#0f2942]/10 hover:text-[#0f2942]"><Edit className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => toast.success('Purchase order sent to printer')} className="hover:bg-amber-50 text-amber-600"><Printer className="w-3.5 h-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && <div className="py-12 text-center text-muted-foreground">No purchase orders found</div>}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}