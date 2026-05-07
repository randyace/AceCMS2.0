import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, CheckCircle, XCircle, Truck, Package, RotateCcw, AlertTriangle, Printer, ExternalLink, ShoppingBag, Loader2, Edit } from 'lucide-react';
import { NavigationContext } from '../../App';
import { toast } from 'sonner@2.0.3';
import { orderService } from '../../services/api';
import WebOrderManagementView from '../figma-ui/WebOrderManagementView';
import { buildContainerContract } from '../containerContracts';

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

  const goToWebOrderList = () => {
    setView('list');
    setEditingOrder(null);
    navigate('/web-orders', { replace: true });
  };

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
      goToWebOrderList();
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
  const containerContract = buildContainerContract({
    data: {
      orders,
      view,
      editingOrder,
      search,
      filterStatus
    },
    uiState: {
      view,
      search,
      filterStatus
    },
    asyncState: {
      loading: loading,
      saving: false,
      error: null,
    },
    callbacks: {
      goToWebOrderList,
      openEdit,
      updateStatus,
      handleSave,
      updateDelivery,
      setSearch,
      setFilterStatus,
      setView
    },
    meta: {
      container: 'WebOrderManagement'
    },
  });

  return <WebOrderManagementView {...containerContract} />;
}

