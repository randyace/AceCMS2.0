import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, CheckCircle, XCircle, Truck, Package, RotateCcw, AlertTriangle, Printer, ExternalLink, ShoppingBag, Loader2, Edit } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { NavigationContext } from '../../App';
import { toast } from 'sonner@2.0.3';
import { orderService } from '../../services/api';

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

interface OrderItem { sku: string; name: string; qty: number; unitPrice: number; subtotal: number; }
interface DeliveryDetails { recipient: string; phone: string; address: string; courier: string; trackingNo: string; }

interface WebOrder {
  id: string; orderNumber: string; customerId: string; customerName: string; customerEmail: string;
  totalAmount: number; status: OrderStatus; orderDate: string;
  deliveryDetails: DeliveryDetails; items: OrderItem[];
  customerRemarks: string; internalRemarks: string; tags: string[];
}

// Related POs for order items (by SKU)
const SKU_TO_PO: Record<string, { po: string; supplier: string }> = {
  'ELEC-0042': { po: 'PO-2026-0052', supplier: 'SoundMax Electronics Ltd.' },
  'ELEC-0012': { po: 'PO-2026-0038', supplier: 'HomePlus Wholesale' },
  'FASH-0118': { po: 'PO-2026-0045', supplier: 'StyleHouse Garment Co.' },
  'FASH-0119': { po: 'PO-2026-0045', supplier: 'StyleHouse Garment Co.' },
  'HOME-0201': { po: 'PO-2026-0038', supplier: 'HomePlus Wholesale' },
  'HOME-0202': { po: 'PO-2026-0038', supplier: 'HomePlus Wholesale' },
};

const STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700', confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700', shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700', refunded: 'bg-slate-100 text-slate-600',
};
const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending', confirmed: 'Confirmed', processing: 'Processing',
  shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded',
};

function generateOrderPDF(order: WebOrder) {
  const relatedPos = Array.from(new Set(order.items.map(i => i.sku).filter(sku => SKU_TO_PO[sku]).map(sku => SKU_TO_PO[sku].po)));
  const printWindow = window.open('', '_blank');
  if (!printWindow) { toast.error('Please allow popups to generate PDF'); return; }
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Order ${order.orderNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #333; padding: 30px; }
        .header { background: #0f2942; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .header h1 { font-size: 22px; margin-bottom: 4px; }
        .header p { opacity: 0.8; font-size: 12px; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; background: rgba(255,255,255,0.2); }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
        .card h3 { font-size: 13px; color: #0f2942; margin-bottom: 10px; border-bottom: 2px solid #cec18a; padding-bottom: 6px; }
        .row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f3f4f6; }
        .row:last-child { border: none; }
        .label { color: #6b7280; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        thead { background: #0f2942; color: white; }
        th { padding: 10px 12px; text-align: left; font-size: 11px; }
        td { padding: 9px 12px; border-bottom: 1px solid #e5e7eb; }
        tfoot td { background: #f9fafb; font-weight: bold; }
        .total-row { background: #f0f9f6; }
        .po-section { background: #fef9ed; border: 1px solid #cec18a; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
        .po-section h3 { color: #0f2942; margin-bottom: 10px; }
        .po-tag { display: inline-block; background: #0f2942; color: white; padding: 3px 10px; border-radius: 4px; margin: 3px; font-size: 11px; }
        .footer { text-align: center; color: #9ca3af; font-size: 11px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 16px; }
        @media print { body { padding: 15px; } @page { margin: 1cm; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h1>${order.orderNumber}</h1>
            <p>Order Date: ${order.orderDate} &nbsp;|&nbsp; <span class="badge">${STATUS_LABEL[order.status]}</span></p>
          </div>
          <div style="text-align:right; font-size:11px; opacity:0.8;">
            <p>ACE CMS</p><p>admin@shopco.com</p>
          </div>
        </div>
      </div>
      <div class="grid">
        <div class="card">
          <h3>Customer Information</h3>
          <div class="row"><span class="label">Name</span><span>${order.customerName}</span></div>
          <div class="row"><span class="label">Email</span><span>${order.customerEmail}</span></div>
          <div class="row"><span class="label">Order Total</span><span><strong>HK$${order.totalAmount.toLocaleString()}</strong></span></div>
        </div>
        <div class="card">
          <h3>Delivery Details</h3>
          <div class="row"><span class="label">Recipient</span><span>${order.deliveryDetails.recipient}</span></div>
          <div class="row"><span class="label">Phone</span><span>${order.deliveryDetails.phone}</span></div>
          <div class="row"><span class="label">Address</span><span style="max-width:180px; text-align:right;">${order.deliveryDetails.address}</span></div>
          ${order.deliveryDetails.courier ? `<div class="row"><span class="label">Courier</span><span>${order.deliveryDetails.courier}</span></div>` : ''}
          ${order.deliveryDetails.trackingNo ? `<div class="row"><span class="label">Tracking</span><span>${order.deliveryDetails.trackingNo}</span></div>` : ''}
        </div>
      </div>
      <table>
        <thead><tr><th>SKU</th><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Subtotal</th></tr></thead>
        <tbody>
          ${order.items.map(i => `<tr><td style="font-family:monospace">${i.sku}</td><td>${i.name}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">HK$${i.unitPrice.toLocaleString()}</td><td style="text-align:right">HK$${i.subtotal.toLocaleString()}</td></tr>`).join('')}
        </tbody>
        <tfoot><tr><td colspan="4" style="text-align:right; padding:10px 12px;">Total</td><td style="text-align:right; padding:10px 12px;">HK$${order.totalAmount.toLocaleString()}</td></tr></tfoot>
      </table>
      ${relatedPos.length > 0 ? `
      <div class="po-section">
        <h3>Related Purchase Orders</h3>
        <p style="font-size:11px; color:#6b7280; margin-bottom:8px;">The following POs supplied the items in this order:</p>
        ${relatedPos.map(po => `<span class="po-tag">${po}</span>`).join('')}
      </div>` : ''}
      ${order.customerRemarks ? `<div class="card" style="margin-bottom:20px;"><h3>Customer Remarks</h3><p style="color:#374151;">${order.customerRemarks}</p></div>` : ''}
      <div class="footer"><p>Generated by ACE CMS &nbsp;|&nbsp; ${new Date().toLocaleDateString()}</p></div>
      <script>window.onload = function() { window.print(); }<\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

const INITIAL_WEB_ORDERS: WebOrder[] = [
  {
    id: 'wo1', orderNumber: 'ORD-20260001', customerId: 'c1', customerName: 'Tai Man Chan', customerEmail: 'taiman.chan@email.com',
    totalAmount: 1280, status: 'pending', orderDate: '2026-03-19',
    deliveryDetails: { recipient: 'Tai Man Chan', phone: '9123 4567', address: 'Flat A, 23/F, Building 5, Hong Kong', courier: '', trackingNo: '' },
    items: [{ sku: 'ELEC-0042', name: 'Wireless Earbuds Pro X', qty: 1, unitPrice: 1280, subtotal: 1280 }],
    customerRemarks: '', internalRemarks: '', tags: [],
  },
  {
    id: 'wo2', orderNumber: 'ORD-20260002', customerId: 'c2', customerName: 'Siu Ming Lee', customerEmail: 'siuming@email.com',
    totalAmount: 560, status: 'processing', orderDate: '2026-03-19',
    deliveryDetails: { recipient: 'Siu Ming Lee', phone: '6234 5678', address: 'Room B, 12/F, Tower 2, Kowloon', courier: '', trackingNo: '' },
    items: [{ sku: 'ELEC-0012', name: 'USB-C Cable (2m)', qty: 2, unitPrice: 280, subtotal: 560 }],
    customerRemarks: '', internalRemarks: '', tags: [],
  },
  {
    id: 'wo3', orderNumber: 'ORD-20260003', customerId: 'c3', customerName: 'ABC Company', customerEmail: 'order@abccompany.com',
    totalAmount: 3200, status: 'shipped', orderDate: '2026-03-18',
    deliveryDetails: { recipient: 'ABC Company', phone: '9876 5432', address: 'Suite 1001, 10/F, Central Plaza, Hong Kong', courier: 'SF Express', trackingNo: 'SF123456789' },
    items: [{ sku: 'HOME-0201', name: 'Smart Air Purifier', qty: 1, unitPrice: 3200, subtotal: 3200 }],
    customerRemarks: '', internalRemarks: '', tags: [],
  },
];

export function WebOrderManagement() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<WebOrder[]>(INITIAL_WEB_ORDERS);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingOrder, setEditingOrder] = useState<WebOrder | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const { navigateTo } = useContext(NavigationContext);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await orderService.getOrders();
        const ordersData = (res.data as any)?.data || res.data;
        if (ordersData && Array.isArray(ordersData) && ordersData.length > 0) {
          const validOrders = ordersData.filter((o: any) => o && o.orderNumber).map((o: any) => ({
            id: o.id?.toString() || '',
            orderNumber: o.orderNumber || '',
            customerId: o.customerId || '',
            customerName: o.customerName || '',
            customerEmail: o.customerEmail || '',
            totalAmount: o.totalAmount || 0,
            status: o.status || 'pending',
            orderDate: o.orderDate || '',
            deliveryDetails: o.deliveryDetails || { recipient: '', phone: '', address: '', courier: '', trackingNo: '' },
            items: Array.isArray(o.items) ? o.items : [],
            customerRemarks: o.customerRemarks || '',
            internalRemarks: o.internalRemarks || '',
            tags: Array.isArray(o.tags) ? o.tags : [],
          }));
          if (validOrders.length > 0) {
            setOrders(validOrders);
          }
        }
      } catch (error) {
        console.warn('Using fallback data, API unavailable');
      }
    }
    fetchOrders();
  }, []);

  useEffect(() => {
    if (itemId && orders.length > 0) {
      const found = orders.find(o => o.orderNumber === itemId || o.id === itemId);
      if (found) {
        setEditingOrder(JSON.parse(JSON.stringify(found)));
        setView('edit');
      }
    }
  }, [itemId, orders]);

  const openEdit = (o: WebOrder) => { navigate(`/web-orders/${o.id}`); };

  const updateStatus = async (newStatus: OrderStatus) => {
    if (!editingOrder) return;
    try {
      const updated = await orderService.patchOrder(editingOrder.id as unknown as number, { status: STATUS_LABEL[newStatus] } as any);
      setEditingOrder((prev) => prev ? { ...prev, status: newStatus } : prev);
      setOrders((prev) => prev.map((o) => o.id === editingOrder.id ? { ...o, status: newStatus } : o));
      toast.success(`Order status updated to ${STATUS_LABEL[newStatus]}`);
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const handleSave = async () => {
    if (!editingOrder) return;
    try {
      await orderService.updateOrder(editingOrder.id as unknown as number, editingOrder as any);
      setOrders((prev) => prev.map((o) => o.id === editingOrder.id ? editingOrder : o));
      toast.success('Order updated');
      navigate('/web-orders');
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  const update = <K extends keyof WebOrder>(field: K, value: WebOrder[K]) =>
    setEditingOrder((prev) => prev ? { ...prev, [field]: value } : prev);
  const updateDelivery = (field: keyof DeliveryDetails, value: string) =>
    setEditingOrder((prev) => prev ? { ...prev, deliveryDetails: { ...prev.deliveryDetails, [field]: value } } : prev);

  const filtered = orders.filter((o) =>
    (o.orderNumber.toLowerCase().includes(search.toLowerCase()) || o.customerName.toLowerCase().includes(search.toLowerCase())) &&
    (filterStatus === '' || o.status === filterStatus)
  );

  if (view === 'edit' && editingOrder) {
    const currentStepIndex = STATUS_FLOW.indexOf(editingOrder.status);
    const relatedPos = Array.from(
      new Map(
        editingOrder.items
          .filter(i => SKU_TO_PO[i.sku])
          .map(i => [SKU_TO_PO[i.sku].po, { po: SKU_TO_PO[i.sku].po, supplier: SKU_TO_PO[i.sku].supplier }])
      ).values()
    );

    return (
      <main className="min-h-full">
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-[#0f2942] to-[#1a3f5c] text-white px-6 py-5">
          <div className="flex items-center gap-2 text-sm text-white/70 mb-3">
            <button onClick={() => navigate('/web-orders')} className="hover:text-white flex items-center gap-1 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Web Orders
            </button>
            <span>/</span>
            <span className="text-white">{editingOrder.orderNumber}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-white">{editingOrder.orderNumber}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs ${STATUS_COLORS[editingOrder.status]}`}>{STATUS_LABEL[editingOrder.status]}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => generateOrderPDF(editingOrder)} className="border-white/30 text-white hover:bg-white/10 bg-transparent">
                <Printer className="w-4 h-4 mr-1" /> Export PDF
              </Button>
              <Button variant="outline" onClick={() => navigate('/web-orders')} className="border-white/30 text-white hover:bg-white/10 bg-transparent">Back</Button>
              <Button onClick={handleSave} className="bg-[#cec18a] text-[#0f2942] hover:bg-[#d4c990]">Save Changes</Button>
            </div>
          </div>
        </div>

        <div className="py-4 sm:py-6 space-y-5">
          {/* Status Timeline */}
          {editingOrder.status !== 'cancelled' && editingOrder.status !== 'refunded' && (
            <Card className="shadow-sm overflow-hidden">
              <CardContent className="py-5 px-6">
                <div className="flex items-center gap-0">
                  {STATUS_FLOW.map((step, i) => (
                    <React.Fragment key={step}>
                      <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border-2 transition-colors flex-shrink-0 ${
                          i <= currentStepIndex ? 'bg-[#0f2942] border-[#0f2942] text-white' : 'bg-background border-border text-muted-foreground'
                        }`}>
                          {i < currentStepIndex ? <CheckCircle className="w-4 h-4" /> : i + 1}
                        </div>
                        <span className="text-xs text-muted-foreground capitalize text-center hidden sm:block">{STATUS_LABEL[step]}</span>
                      </div>
                      {i < STATUS_FLOW.length - 1 && (
                        <div className={`flex-1 h-0.5 mb-5 sm:mb-4 transition-colors ${i < currentStepIndex ? 'bg-[#0f2942]' : 'bg-border'}`} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {editingOrder.status === 'pending' && (
              <Button onClick={() => updateStatus('confirmed')} className="bg-blue-600 hover:bg-blue-700">
                <CheckCircle className="w-4 h-4 mr-1" /> Confirm Order
              </Button>
            )}
            {editingOrder.status === 'confirmed' && (
              <Button onClick={() => updateStatus('processing')}>
                <Package className="w-4 h-4 mr-1" /> Start Processing
              </Button>
            )}
            {editingOrder.status === 'processing' && (
              <Button onClick={() => updateStatus('shipped')} className="bg-indigo-600 hover:bg-indigo-700">
                <Truck className="w-4 h-4 mr-1" /> Mark as Shipped
              </Button>
            )}
            {editingOrder.status === 'shipped' && (
              <Button onClick={() => updateStatus('delivered')} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-1" /> Mark as Delivered
              </Button>
            )}
            {!['cancelled', 'refunded', 'delivered'].includes(editingOrder.status) && (
              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => updateStatus('cancelled')}>
                <XCircle className="w-4 h-4 mr-1" /> Cancel Order
              </Button>
            )}
            {editingOrder.status === 'delivered' && (
              <Button variant="outline" onClick={() => updateStatus('refunded')}>
                <RotateCcw className="w-4 h-4 mr-1" /> Issue Refund
              </Button>
            )}
            {editingOrder.status === 'processing' && (
              <Button variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50">
                <AlertTriangle className="w-4 h-4 mr-1" /> Mark Stock Out
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Order Info */}
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-blue-50 border-l-4 border-blue-400 py-3">
                <CardTitle className="text-sm text-blue-700">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm p-5">
                <div className="flex justify-between"><span className="text-muted-foreground">Order Number</span><span className="font-mono font-medium">{editingOrder.orderNumber}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Order Date</span><span>{editingOrder.orderDate}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Customer</span>
                  <button onClick={() => navigateTo('members', editingOrder.customerId)} className="text-[#0f2942] hover:underline flex items-center gap-1">
                    {editingOrder.customerName} <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{editingOrder.customerEmail}</span></div>
                <div className="flex justify-between border-t border-border pt-2 mt-2">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="text-lg font-medium text-emerald-600">HK${editingOrder.totalAmount.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Details */}
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-indigo-50 border-l-4 border-indigo-400 py-3">
                <CardTitle className="text-sm text-indigo-700">Delivery Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-5">
                {(['recipient', 'phone', 'address', 'courier', 'trackingNo'] as const).map((field) => (
                  <div key={field} className="space-y-1">
                    <label className="text-xs text-muted-foreground capitalize">{field.replace('No', ' Number').replace(/([A-Z])/g, ' $1')}</label>
                    <Input value={editingOrder.deliveryDetails[field]} onChange={(e) => updateDelivery(field, e.target.value)} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Order Items */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-emerald-50 border-l-4 border-emerald-400 py-3">
              <CardTitle className="text-sm text-emerald-700 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" /> Order Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead className="border-b border-border bg-muted/30">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground">SKU</th>
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground">Product</th>
                      <th className="text-center px-4 py-2 text-xs text-muted-foreground">Qty</th>
                      <th className="text-right px-4 py-2 text-xs text-muted-foreground">Unit Price</th>
                      <th className="text-right px-4 py-2 text-xs text-muted-foreground">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editingOrder.items.map((item, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-mono text-xs text-[#0f2942]">{item.sku}</td>
                        <td className="px-4 py-2.5">{item.name}</td>
                        <td className="px-4 py-2.5 text-center">{item.qty}</td>
                        <td className="px-4 py-2.5 text-right">HK${item.unitPrice.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right font-medium">HK${item.subtotal.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-border bg-emerald-50/50">
                    <tr>
                      <td colSpan={4} className="px-4 py-2.5 text-right font-medium">Total</td>
                      <td className="px-4 py-2.5 text-right font-medium text-emerald-600">HK${editingOrder.totalAmount.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Related Purchase Orders */}
          {relatedPos.length > 0 && (
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-[#cec18a]/20 to-amber-50 border-l-4 border-[#cec18a] py-3">
                <CardTitle className="text-sm text-amber-800 flex items-center gap-2">
                  <Truck className="w-4 h-4" /> Related Purchase Orders
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground mb-3">Purchase orders that supplied the items in this web order:</p>
                <div className="space-y-2">
                  {relatedPos.map((rel) => (
                    <div key={rel.po} className="flex items-center justify-between p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
                      <div>
                        <button
                          onClick={() => navigateTo('purchase-orders', rel.po)}
                          className="text-[#0f2942] hover:underline font-mono text-sm font-medium flex items-center gap-1"
                        >
                          {rel.po} <ExternalLink className="w-3 h-3" />
                        </button>
                        <p className="text-xs text-muted-foreground mt-0.5">{rel.supplier}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-[#0f2942]/30 text-[#0f2942] hover:bg-[#0f2942]/5"
                        onClick={() => navigateTo('purchase-orders', rel.po)}
                      >
                        View PO
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-500/10 to-slate-50 border-l-4 border-slate-300 py-3">
                <CardTitle className="text-sm text-slate-700">Customer Remarks</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <textarea className="w-full h-24 px-3 py-2 border border-border rounded-lg text-sm resize-none outline-none focus:ring-1 focus:ring-ring" value={editingOrder.customerRemarks} onChange={(e) => update('customerRemarks', e.target.value)} placeholder="Customer remarks..." />
              </CardContent>
            </Card>
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-500/10 to-purple-50 border-l-4 border-purple-300 py-3">
                <CardTitle className="text-sm text-purple-700">Internal Remarks</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <textarea className="w-full h-24 px-3 py-2 border border-border rounded-lg text-sm resize-none outline-none focus:ring-1 focus:ring-ring" value={editingOrder.internalRemarks} onChange={(e) => update('internalRemarks', e.target.value)} placeholder="Internal staff notes (not visible to customer)..." />
              </CardContent>
            </Card>
          </div>
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
        <h1 className="text-white">Web Order Management</h1>
        <p className="text-white/60 text-sm">{orders.length} orders · {orders.filter((o) => o.status === 'pending').length} pending</p>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Orders', value: orders.length, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: '🛒' },
            { label: 'Pending', value: orders.filter(o => o.status === 'pending').length, color: 'bg-amber-50 border-amber-200 text-amber-700', icon: '⏳' },
            { label: 'Processing', value: orders.filter(o => o.status === 'processing').length, color: 'bg-purple-50 border-purple-200 text-purple-700', icon: '⚙️' },
            { label: 'Delivered', value: orders.filter(o => o.status === 'delivered').length, color: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: '✅' },
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
            <Input className="pl-9" placeholder="Search order or customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="h-9 px-3 border border-border rounded-md text-sm bg-background" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="border-b border-border bg-[#0f2942]/5">
                  <tr>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Order #</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Customer</th>
                    <th className="text-right px-4 py-3 text-[#0f2942] text-xs">Amount</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Status</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Date</th>
                    <th className="text-right px-4 py-3 text-[#0f2942] text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => (
                    <tr key={o.id} className="border-b border-border last:border-0 hover:bg-[#0f2942]/5 transition-colors">
                      <td className="px-4 py-3 text-[#0f2942] font-mono text-xs font-medium">{o.orderNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{o.customerName}</p>
                        <p className="text-xs text-muted-foreground">{o.customerEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">HK${o.totalAmount.toLocaleString()}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[o.status]}`}>{STATUS_LABEL[o.status]}</span></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{o.orderDate}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(o)} className="hover:bg-[#0f2942]/10 hover:text-[#0f2942]"><Edit className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => generateOrderPDF(o)} className="hover:bg-amber-50 text-amber-600"><Printer className="w-3.5 h-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && <div className="py-12 text-center text-muted-foreground">No orders found</div>}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}