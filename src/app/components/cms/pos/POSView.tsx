import React, { useState, useMemo, useEffect } from 'react';
import { POSLayout } from './POSLayout';
import {
  MOCK_ORDER_ITEMS,
  MOCK_MEMBER,
  MOCK_OUTLETS,
  MOCK_CASHIERS,
  MOCK_PAYMENT_METHODS,
  KEYBOARD_SHORTCUTS,
  type PosMode,
  type OrderItem,
  type MemberInfo,
} from './__fixtures__/pos.mocks';

export function POSView() {
  /* ── UI State ──────────────────────────────────────────────────────────── */
  const [mode, setMode] = useState<PosMode>('touch');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const update = () =>
      setCurrentTime(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      );
    update();
    const timer = setInterval(update, 30_000);
    return () => clearInterval(timer);
  }, []);

  /* ── Order State ───────────────────────────────────────────────────────── */
  const [orderItems, setOrderItems] = useState<OrderItem[]>(MOCK_ORDER_ITEMS);
  const [searchQuery, setSearchQuery] = useState('');

  /* ── Member / Settings State ───────────────────────────────────────────── */
  const [member, setMember] = useState<MemberInfo | null>(MOCK_MEMBER);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedOutlet, setSelectedOutlet] = useState('OL-001');
  const [selectedCashier, setSelectedCashier] = useState('CA-001');
  const [remarks, setRemarks] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('cash');

  /* ── Computed Totals ───────────────────────────────────────────────────── */
  const grandTotal = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.subtotal, 0),
    [orderItems]
  );
  const totalDiscount = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.discount, 0),
    [orderItems]
  );
  const subtotal = grandTotal + totalDiscount;
  const amountPaid = grandTotal;
  const change = amountPaid - grandTotal;

  /* ── Handlers ──────────────────────────────────────────────────────────── */
  const handleQtyChange = (id: string, qty: number) => {
    if (qty < 1) {
      setOrderItems((prev) => prev.filter((i) => i.id !== id));
      return;
    }
    setOrderItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const sub = qty * item.unitPrice - item.discount;
        return { ...item, qty, subtotal: Math.max(0, sub) };
      })
    );
  };

  const handleDiscountChange = (id: string, discount: number) => {
    setOrderItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const sub = item.qty * item.unitPrice - discount;
        return { ...item, discount, subtotal: Math.max(0, sub) };
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setOrderItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSearch = (query: string) => {
    setSearchQuery('');
  };

  const handleFindMember = () => {
    setMember(MOCK_MEMBER);
    setMemberSearch('');
  };

  const handleClearMember = () => {
    setMember(null);
    setMemberSearch('');
  };

  const handleCheckout = () => {
    alert(`Order checked out successfully!\nTotal: HKD ${grandTotal.toFixed(2)}\nPayment: ${selectedPayment}`);
  };

  const handleVoidOrder = () => {
    setOrderItems([]);
    setMember(null);
    setMemberSearch('');
    setRemarks('');
    setSearchQuery('');
  };

  const handleShortcut = (action: string) => {
    switch (action) {
      case 'new-order':   handleVoidOrder(); break;
      case 'checkout':    handleCheckout(); break;
      case 'member':      setMemberSearch(''); break;
      case 'pay-cash':    setSelectedPayment('cash'); break;
      case 'pay-card':    setSelectedPayment('card'); break;
      case 'pay-mobile':  setSelectedPayment('mobile'); break;
      case 'complete':    handleCheckout(); break;
      default: break;
    }
  };

  return (
    <POSLayout
      mode={mode}
      onModeToggle={setMode}
      orderNumber="POS-20260722-0047"
      storeName="Main Store – Taipei 101"
      cashierName="Alice Wu"
      currentTime={currentTime}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onSearch={handleSearch}
      items={orderItems}
      onQtyChange={handleQtyChange}
      onDiscountChange={handleDiscountChange}
      onRemoveItem={handleRemoveItem}
      subtotal={subtotal}
      totalDiscount={totalDiscount}
      grandTotal={grandTotal}
      amountPaid={amountPaid}
      change={change}
      member={member}
      memberSearch={memberSearch}
      onMemberSearchChange={setMemberSearch}
      onFindMember={handleFindMember}
      onClearMember={handleClearMember}
      outlets={MOCK_OUTLETS}
      selectedOutlet={selectedOutlet}
      onOutletChange={setSelectedOutlet}
      cashiers={MOCK_CASHIERS}
      selectedCashier={selectedCashier}
      onCashierChange={setSelectedCashier}
      remarks={remarks}
      onRemarksChange={setRemarks}
      paymentMethods={MOCK_PAYMENT_METHODS}
      selectedPayment={selectedPayment}
      onPaymentSelect={setSelectedPayment}
      onCheckout={handleCheckout}
      onVoidOrder={handleVoidOrder}
      shortcuts={KEYBOARD_SHORTCUTS}
      onShortcut={handleShortcut}
      currency="HKD"
    />
  );
}
