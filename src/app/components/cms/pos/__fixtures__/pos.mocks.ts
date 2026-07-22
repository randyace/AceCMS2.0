export type PosMode = 'touch' | 'keyboard';

export interface OrderItem {
  id: string;
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
}

export interface MemberInfo {
  id: string;
  name: string;
  phone: string;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  points: number;
}

export interface SalesOutlet {
  id: string;
  name: string;
}

export interface CashierStaff {
  id: string;
  name: string;
}

export interface PaymentMethod {
  id: string;
  label: string;
  bgColor: string;
  textColor: string;
  shortcut: string;
}

export interface ShortcutDef {
  key: string;
  label: string;
  action: string;
}

export const formatCurrency = (value: number, currency = 'HKD'): string =>
  `${currency} ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;

export const MOCK_ORDER_ITEMS: OrderItem[] = [
  {
    id: '1',
    sku: 'ELEC-0042',
    name: 'Wireless Bluetooth Headphones Pro',
    qty: 1,
    unitPrice: 1299.0,
    discount: 0,
    subtotal: 1299.0,
  },
  {
    id: '2',
    sku: 'APRL-0118',
    name: "Men's Cotton Polo Shirt – Navy L",
    qty: 2,
    unitPrice: 349.0,
    discount: 50.0,
    subtotal: 648.0,
  },
  {
    id: '3',
    sku: 'HOME-0055',
    name: 'Ceramic Coffee Mug 350ml',
    qty: 3,
    unitPrice: 89.0,
    discount: 0,
    subtotal: 267.0,
  },
  {
    id: '4',
    sku: 'SPRT-0201',
    name: 'Running Shoes Ultralight v3',
    qty: 1,
    unitPrice: 2499.0,
    discount: 200.0,
    subtotal: 2299.0,
  },
  {
    id: '5',
    sku: 'FOOD-0033',
    name: 'Organic Green Tea 50g',
    qty: 4,
    unitPrice: 155.0,
    discount: 0,
    subtotal: 620.0,
  },
];

export const MOCK_MEMBER: MemberInfo = {
  id: 'MBR-2024-0891',
  name: 'Jennifer Chen',
  phone: '0912-345-678',
  tier: 'Gold',
  points: 4820,
};

export const MOCK_OUTLETS: SalesOutlet[] = [
  { id: 'OL-001', name: 'Main Store – Taipei 101' },
  { id: 'OL-002', name: 'Branch – Xinyi' },
  { id: 'OL-003', name: 'Online Flagship' },
];

export const MOCK_CASHIERS: CashierStaff[] = [
  { id: 'CA-001', name: 'Alice Wu' },
  { id: 'CA-002', name: 'Bob Lin' },
  { id: 'CA-003', name: 'Carol Zhang' },
];

export const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'cash', label: 'Cash', bgColor: '#22c55e', textColor: '#ffffff', shortcut: 'F9' },
  { id: 'card', label: 'Credit Card', bgColor: '#3b82f6', textColor: '#ffffff', shortcut: 'F10' },
  { id: 'mobile', label: 'Mobile Pay', bgColor: '#8b5cf6', textColor: '#ffffff', shortcut: 'F11' },
  { id: 'points', label: 'Points', bgColor: '#cec18a', textColor: '#0f2942', shortcut: 'F12' },
];

export const KEYBOARD_SHORTCUTS: ShortcutDef[] = [
  { key: 'F2', label: 'New Order', action: 'new-order' },
  { key: 'F3', label: 'Search', action: 'search' },
  { key: 'F4', label: 'Member', action: 'member' },
  { key: 'F6', label: 'Void Item', action: 'void-item' },
  { key: 'F7', label: 'Remarks', action: 'remarks' },
  { key: 'F8', label: 'Checkout', action: 'checkout' },
  { key: 'F9', label: 'Cash', action: 'pay-cash' },
  { key: 'F10', label: 'Credit', action: 'pay-card' },
  { key: 'F11', label: 'Mobile', action: 'pay-mobile' },
  { key: 'F12', label: 'Complete', action: 'complete' },
];
