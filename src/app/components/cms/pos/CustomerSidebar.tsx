import React from 'react';
import {
  User, Search, X, Store, UserCheck, MessageSquare,
  Banknote, CreditCard, Smartphone, Star, ChevronDown,
  ArrowRight, CheckCircle2,
} from 'lucide-react';
import {
  MOCK_MEMBER, MOCK_OUTLETS, MOCK_CASHIERS, MOCK_PAYMENT_METHODS,
  formatCurrency,
  type MemberInfo, type SalesOutlet, type CashierStaff,
  type PaymentMethod, type PosMode,
} from './__fixtures__/pos.mocks';

const TIER_STYLES: Record<string, { bg: string; text: string }> = {
  Bronze: { bg: '#92400e18', text: '#92400e' },
  Silver: { bg: '#6b728018', text: '#6b7280' },
  Gold:   { bg: '#d9770818', text: '#b45309' },
  Platinum: { bg: '#7c3aed18', text: '#7c3aed' },
};

const PAYMENT_ICONS: Record<string, React.FC<{ className?: string }>> = {
  cash: Banknote,
  card: CreditCard,
  mobile: Smartphone,
  points: Star,
};

interface CustomerSidebarProps {
  member?: MemberInfo | null;
  memberSearch?: string;
  onMemberSearchChange: (v: string) => void;
  onFindMember: () => void;
  onClearMember: () => void;
  outlets?: SalesOutlet[];
  selectedOutlet?: string;
  onOutletChange: (id: string) => void;
  cashiers?: CashierStaff[];
  selectedCashier?: string;
  onCashierChange: (id: string) => void;
  remarks?: string;
  onRemarksChange: (v: string) => void;
  paymentMethods?: PaymentMethod[];
  selectedPayment?: string;
  onPaymentSelect: (id: string) => void;
  onCheckout: () => void;
  onVoidOrder: () => void;
  grandTotal?: number;
  mode?: PosMode;
  currency?: string;
}

export function CustomerSidebar({
  member = MOCK_MEMBER,
  memberSearch = '',
  onMemberSearchChange,
  onFindMember,
  onClearMember,
  outlets = MOCK_OUTLETS,
  selectedOutlet = 'OL-001',
  onOutletChange,
  cashiers = MOCK_CASHIERS,
  selectedCashier = 'CA-001',
  onCashierChange,
  remarks = '',
  onRemarksChange,
  paymentMethods = MOCK_PAYMENT_METHODS,
  selectedPayment = 'cash',
  onPaymentSelect,
  onCheckout,
  onVoidOrder,
  grandTotal = 5133.0,
  mode = 'touch',
  currency = 'HKD',
}: CustomerSidebarProps) {
  const fmt = (v: number) => formatCurrency(v, currency);
  const isTouch = mode === 'touch';
  const tierStyle = member ? TIER_STYLES[member.tier] ?? TIER_STYLES.Bronze : null;

  /* ─── Touch Mode ──────────────────────────────────────────────────────────── */
  if (isTouch) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        {/* ── Member ─────────────────────────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Member</p>

          {member ? (
            <div className="bg-gray-50 rounded-xl p-3 relative">
              <button
                onClick={onClearMember}
                className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#0f2942] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 truncate">{member.name}</p>
                    {tierStyle && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: tierStyle.bg, color: tierStyle.text }}
                      >
                        {member.tier}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{member.phone}</p>
                  <p className="text-xs text-[#cec18a] mt-0.5">
                    ⭐ {member.points.toLocaleString()} pts
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => onMemberSearchChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onFindMember()}
                  placeholder="Phone / Member ID…"
                  className="w-full h-11 pl-9 pr-3 text-sm border border-gray-200 rounded-xl bg-white outline-none focus:border-[#0f2942]"
                />
              </div>
              <button
                onClick={onFindMember}
                className="h-11 px-4 bg-[#0f2942] text-white rounded-xl hover:bg-[#1a3f5c] transition-colors flex-shrink-0"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="mx-4 border-t border-gray-100" />

        {/* ── Order Settings ─────────────────────────────────────────────────── */}
        <div className="px-4 py-3 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Settings</p>

          {/* Outlet */}
          <div>
            <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <Store className="w-3.5 h-3.5" /> Outlet
            </label>
            <div className="relative">
              <select
                value={selectedOutlet}
                onChange={(e) => onOutletChange(e.target.value)}
                className="w-full h-11 pl-3 pr-8 text-sm border border-gray-200 rounded-xl bg-white outline-none focus:border-[#0f2942] appearance-none"
              >
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Cashier */}
          <div>
            <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <UserCheck className="w-3.5 h-3.5" /> Cashier
            </label>
            <div className="relative">
              <select
                value={selectedCashier}
                onChange={(e) => onCashierChange(e.target.value)}
                className="w-full h-11 pl-3 pr-8 text-sm border border-gray-200 rounded-xl bg-white outline-none focus:border-[#0f2942] appearance-none"
              >
                {cashiers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <MessageSquare className="w-3.5 h-3.5" /> Remarks
            </label>
            <textarea
              value={remarks}
              onChange={(e) => onRemarksChange(e.target.value)}
              placeholder="Add order notes…"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white outline-none focus:border-[#0f2942] resize-none"
            />
          </div>
        </div>

        <div className="mx-4 border-t border-gray-100" />

        {/* ── Payment Methods ─────────────────────────────────────────────────── */}
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Payment Method
          </p>
          <div className="grid grid-cols-2 gap-2">
            {paymentMethods.map((pm) => {
              const Icon = PAYMENT_ICONS[pm.id] ?? CreditCard;
              const isSelected = selectedPayment === pm.id;
              return (
                <button
                  key={pm.id}
                  onClick={() => onPaymentSelect(pm.id)}
                  style={{ backgroundColor: pm.bgColor, color: pm.textColor }}
                  className={`h-14 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all relative ${
                    isSelected
                      ? 'ring-2 ring-offset-2 ring-gray-400 scale-[0.97]'
                      : 'hover:opacity-90 active:scale-95'
                  }`}
                >
                  {isSelected && (
                    <CheckCircle2 className="absolute top-1.5 right-1.5 w-3.5 h-3.5 opacity-70" />
                  )}
                  <Icon className="w-4 h-4" />
                  <span>{pm.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────────────────────────────── */}
        <div className="px-4 pb-4 mt-auto space-y-2">
          <button
            onClick={onCheckout}
            className="w-full h-16 bg-[#22c55e] hover:bg-[#16a34a] active:bg-[#15803d] text-white rounded-2xl flex items-center justify-between px-5 transition-colors shadow-md shadow-green-200"
          >
            <span className="text-lg font-bold">Checkout</span>
            <div className="text-right">
              <p className="text-xs opacity-75">Grand Total</p>
              <p className="text-xl font-bold tabular-nums">{fmt(grandTotal)}</p>
            </div>
          </button>

          <button
            onClick={onVoidOrder}
            className="w-full h-11 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors text-sm font-medium"
          >
            Void Order
          </button>
        </div>
      </div>
    );
  }

  /* ─── Keyboard Mode ───────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full overflow-y-auto text-xs">
      {/* Header */}
      <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
        <p className="font-semibold text-gray-700 uppercase tracking-wide text-[10px]">Order Panel</p>
      </div>

      {/* Member */}
      <div className="px-3 py-2 border-b border-gray-200">
        <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">
          Member <span className="text-[#0f2942]">[F4]</span>
        </p>
        {member ? (
          <div className="flex items-center justify-between gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-2 py-1.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium text-gray-900 truncate">{member.name}</span>
                {tierStyle && (
                  <span
                    className="text-[9px] font-semibold px-1 py-0.5 rounded-full"
                    style={{ backgroundColor: tierStyle.bg, color: tierStyle.text }}
                  >
                    {member.tier}
                  </span>
                )}
              </div>
              <span className="text-gray-500">{member.phone} · {member.points.toLocaleString()} pts</span>
            </div>
            <button onClick={onClearMember} className="text-gray-400 hover:text-gray-700 flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex gap-1.5">
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => onMemberSearchChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onFindMember()}
              placeholder="Phone / Member ID"
              className="flex-1 h-7 px-2 border border-gray-300 rounded bg-white outline-none focus:border-[#0f2942] text-xs"
            />
            <button
              onClick={onFindMember}
              className="h-7 px-2 bg-[#0f2942] text-white rounded hover:bg-[#1a3f5c] transition-colors text-[10px] font-medium"
            >
              Find
            </button>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="px-3 py-2 border-b border-gray-200 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 w-14 flex-shrink-0">Outlet</span>
          <select
            value={selectedOutlet}
            onChange={(e) => onOutletChange(e.target.value)}
            className="flex-1 h-6 px-1.5 text-xs border border-gray-300 rounded bg-white outline-none focus:border-[#0f2942]"
          >
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 w-14 flex-shrink-0">Cashier</span>
          <select
            value={selectedCashier}
            onChange={(e) => onCashierChange(e.target.value)}
            className="flex-1 h-6 px-1.5 text-xs border border-gray-300 rounded bg-white outline-none focus:border-[#0f2942]"
          >
            {cashiers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-gray-500 w-14 flex-shrink-0 mt-1">
            Remarks <span className="text-[#0f2942]">[F7]</span>
          </span>
          <textarea
            value={remarks}
            onChange={(e) => onRemarksChange(e.target.value)}
            rows={2}
            placeholder="Notes…"
            className="flex-1 px-1.5 py-1 text-xs border border-gray-300 rounded bg-white outline-none focus:border-[#0f2942] resize-none"
          />
        </div>
      </div>

      {/* Payment */}
      <div className="px-3 py-2 border-b border-gray-200">
        <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Payment</p>
        <div className="flex flex-wrap gap-1">
          {paymentMethods.map((pm) => {
            const isSelected = selectedPayment === pm.id;
            return (
              <button
                key={pm.id}
                onClick={() => onPaymentSelect(pm.id)}
                style={isSelected ? { backgroundColor: pm.bgColor, color: pm.textColor } : {}}
                className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-medium transition-all ${
                  isSelected
                    ? 'border-transparent'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400 bg-white'
                }`}
              >
                <span className="font-mono text-[9px] opacity-70">[{pm.shortcut}]</span>
                {pm.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Checkout / Void */}
      <div className="px-3 py-3 space-y-1.5 mt-auto">
        <button
          onClick={onCheckout}
          className="w-full h-10 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-lg flex items-center justify-between px-3 transition-colors font-semibold"
        >
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] bg-white/20 px-1 py-0.5 rounded">[F8]</span>
            <span>Checkout</span>
          </div>
          <span className="tabular-nums">{fmt(grandTotal)}</span>
        </button>
        <button
          onClick={onVoidOrder}
          className="w-full h-8 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors font-medium flex items-center justify-center gap-1.5"
        >
          <span className="font-mono text-[10px] bg-red-100 px-1 py-0.5 rounded">[F2]</span>
          Void Order
        </button>
      </div>
    </div>
  );
}
