import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, ChevronLeft, Star, Printer, ExternalLink, Truck, Loader2 } from 'lucide-react';
import { NavigationContext } from '../../App';
import { toast } from 'sonner@2.0.3';
import { supplierService } from '../../services/api';
import SupplierManagementView from '../figma-ui/SupplierManagementView';
import { buildContainerContract } from '../containerContracts';

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
  const containerContract = buildContainerContract({
    data: {
      suppliers,
      view,
      editingSupplier,
      supplierTab,
      search
    },
    uiState: {
      view,
      supplierTab,
      search
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
      setSearch,
      setView
    },
    meta: {
      container: 'SupplierManagement'
    },
  });

  return <SupplierManagementView {...containerContract} />;
}

