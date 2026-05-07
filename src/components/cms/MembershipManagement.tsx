import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, ChevronLeft, Key, CreditCard, ShoppingBag, MessageSquare, ExternalLink, Users, Loader2 } from 'lucide-react';
import { NavigationContext } from '../../App';
import { toast } from 'sonner@2.0.3';
import { memberService } from '../../services/api';
import MembershipManagementView from '../figma-ui/MembershipManagementView';
import { buildContainerContract } from '../containerContracts';

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

  const goToMembersList = () => {
    setView('list');
    setEditingMember(null);
    navigate('/members', { replace: true });
  };

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
  const containerContract = buildContainerContract({
    data: {
      members,
      view,
      editingMember,
      search,
      activeTab,
      creditAdjust,
      showResetPwd
    },
    uiState: {
      view,
      search,
      activeTab
    },
    asyncState: {
      loading: loading,
      saving: false,
      error: null,
    },
    callbacks: {
      goToMembersList,
      openEdit,
      openCreate,
      handleSave,
      handleDelete,
      handleCreditAdjust,
      setSearch,
      setView,
      setActiveTab
    },
    meta: {
      container: 'MembershipManagement'
    },
  });

  return <MembershipManagementView {...containerContract} />;
}

