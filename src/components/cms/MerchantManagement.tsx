import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, ChevronLeft, CheckCircle, Clock, XCircle, Upload, ExternalLink, Package, Loader2 } from 'lucide-react';
import { NavigationContext } from '../../App';
import { toast } from 'sonner@2.0.3';
import { merchantService } from '../../services/api';
import { WholesaleOrderRef, INITIAL_WHOLESALE_ORDERS } from './WholesaleOrders';
import MerchantManagementView from '../figma-ui/MerchantManagementView';
import { buildContainerContract } from '../containerContracts';

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
  const containerContract = buildContainerContract({
    data: {
      merchants,
      view,
      editingMerchant,
      activeTab,
      search,
      filterStatus
    },
    uiState: {
      view,
      activeTab,
      search,
      filterStatus
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
      setFilterStatus,
      setView,
      setActiveTab
    },
    meta: {
      container: 'MerchantManagement'
    },
  });

  return <MerchantManagementView {...containerContract} />;
}

