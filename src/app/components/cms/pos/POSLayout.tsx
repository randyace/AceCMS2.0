import React from 'react';
import { POSHeader } from './POSHeader';
import { BarcodeSearch } from './BarcodeSearch';
import { ItemGrid } from './ItemGrid';
import { TotalDisplay } from './TotalDisplay';
import { CustomerSidebar } from './CustomerSidebar';
import { KeyboardActionBar } from './KeyboardActionBar';
import type {
  PosMode,
  OrderItem,
  MemberInfo,
  SalesOutlet,
  CashierStaff,
  PaymentMethod,
  ShortcutDef,
} from './__fixtures__/pos.mocks';

interface POSLayoutProps {
  /* Mode */
  mode: PosMode;
  onModeToggle: (mode: PosMode) => void;

  /* Header */
  orderNumber: string;
  storeName: string;
  cashierName: string;
  currentTime: string;

  /* Search */
  searchQuery: string;
  onSearchChange: (v: string) => void;
  onSearch: (v: string) => void;

  /* Items */
  items: OrderItem[];
  onQtyChange: (id: string, qty: number) => void;
  onDiscountChange: (id: string, discount: number) => void;
  onRemoveItem: (id: string) => void;

  /* Totals */
  subtotal: number;
  totalDiscount: number;
  grandTotal: number;
  amountPaid: number;
  change: number;

  /* Sidebar */
  member: MemberInfo | null;
  memberSearch: string;
  onMemberSearchChange: (v: string) => void;
  onFindMember: () => void;
  onClearMember: () => void;
  outlets: SalesOutlet[];
  selectedOutlet: string;
  onOutletChange: (id: string) => void;
  cashiers: CashierStaff[];
  selectedCashier: string;
  onCashierChange: (id: string) => void;
  remarks: string;
  onRemarksChange: (v: string) => void;
  paymentMethods: PaymentMethod[];
  selectedPayment: string;
  onPaymentSelect: (id: string) => void;
  onCheckout: () => void;
  onVoidOrder: () => void;

  /* Keyboard shortcuts */
  shortcuts: ShortcutDef[];
  onShortcut: (action: string) => void;

  currency?: string;
}

export function POSLayout({
  mode,
  onModeToggle,
  orderNumber,
  storeName,
  cashierName,
  currentTime,
  searchQuery,
  onSearchChange,
  onSearch,
  items,
  onQtyChange,
  onDiscountChange,
  onRemoveItem,
  subtotal,
  totalDiscount,
  grandTotal,
  amountPaid,
  change,
  member,
  memberSearch,
  onMemberSearchChange,
  onFindMember,
  onClearMember,
  outlets,
  selectedOutlet,
  onOutletChange,
  cashiers,
  selectedCashier,
  onCashierChange,
  remarks,
  onRemarksChange,
  paymentMethods,
  selectedPayment,
  onPaymentSelect,
  onCheckout,
  onVoidOrder,
  shortcuts,
  onShortcut,
  currency = 'HKD',
}: POSLayoutProps) {
  const isTouch = mode === 'touch';

  return (
    <div
      className={`flex flex-col h-full overflow-hidden ${
        isTouch ? 'bg-[#f4f5f7]' : 'bg-[#e8eaed]'
      }`}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <POSHeader
        mode={mode}
        onModeToggle={onModeToggle}
        orderNumber={orderNumber}
        storeName={storeName}
        cashierName={cashierName}
        currentTime={currentTime}
      />

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div
        className={`flex flex-1 overflow-hidden ${
          isTouch ? 'gap-3 p-3' : 'gap-2 p-2'
        }`}
      >
        {/* ── Left Column (70%) ─────────────────────────────────────────────── */}
        <div
          className={`flex flex-col flex-1 overflow-hidden min-w-0 ${
            isTouch ? 'bg-white rounded-2xl shadow-sm' : ''
          }`}
        >
          <BarcodeSearch
            value={searchQuery}
            onChange={onSearchChange}
            onSearch={onSearch}
            mode={mode}
          />

          {/* Divider visible only in touch mode */}
          {isTouch && <div className="mx-4 border-t border-gray-100" />}

          {/* Column header for keyboard mode */}
          {!isTouch && (
            <div className="px-2 py-1 flex items-center justify-between flex-shrink-0">
              <p className="text-xs font-semibold text-gray-600">
                Order Items
                <span className="ml-2 font-normal text-gray-400">({items.length} line{items.length !== 1 ? 's' : ''})</span>
              </p>
              <button
                onClick={() => items.forEach((i) => onRemoveItem(i.id))}
                className="text-[10px] text-red-400 hover:text-red-600 border border-red-200 hover:border-red-300 px-2 py-0.5 rounded transition-colors"
              >
                Clear All
              </button>
            </div>
          )}

          <ItemGrid
            items={items}
            mode={mode}
            currency={currency}
            onQtyChange={onQtyChange}
            onDiscountChange={onDiscountChange}
            onRemove={onRemoveItem}
          />

          <TotalDisplay
            subtotal={subtotal}
            totalDiscount={totalDiscount}
            grandTotal={grandTotal}
            amountPaid={amountPaid}
            change={change}
            itemCount={items.length}
            mode={mode}
            currency={currency}
          />
        </div>

        {/* ── Right Column (30%) ────────────────────────────────────────────── */}
        <div
          className={`flex flex-col overflow-hidden ${
            isTouch
              ? 'w-[340px] bg-white rounded-2xl shadow-sm flex-shrink-0'
              : 'w-[280px] bg-white border border-gray-300 rounded flex-shrink-0'
          }`}
        >
          <CustomerSidebar
            member={member}
            memberSearch={memberSearch}
            onMemberSearchChange={onMemberSearchChange}
            onFindMember={onFindMember}
            onClearMember={onClearMember}
            outlets={outlets}
            selectedOutlet={selectedOutlet}
            onOutletChange={onOutletChange}
            cashiers={cashiers}
            selectedCashier={selectedCashier}
            onCashierChange={onCashierChange}
            remarks={remarks}
            onRemarksChange={onRemarksChange}
            paymentMethods={paymentMethods}
            selectedPayment={selectedPayment}
            onPaymentSelect={onPaymentSelect}
            onCheckout={onCheckout}
            onVoidOrder={onVoidOrder}
            grandTotal={grandTotal}
            mode={mode}
            currency={currency}
          />
        </div>
      </div>

      {/* ── Keyboard Action Bar ─────────────────────────────────────────────── */}
      {mode === 'keyboard' && (
        <KeyboardActionBar shortcuts={shortcuts} onShortcut={onShortcut} />
      )}
    </div>
  );
}
