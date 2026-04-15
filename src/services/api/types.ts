export interface ContentLang {
  en: { name: string; tags: string[]; content: string };
  zh_TW: { name: string; tags: string[]; content: string };
  zh_CN: { name: string; tags: string[]; content: string };
}

export interface StockLevel {
  warehouseId: string;
  warehouseName: string;
  qty: number;
}

export interface ProductAttributeContent {
  name: string;
  value: string;
}

export interface ProductAttribute {
  id: string;
  content: Record<'en' | 'zh_TW' | 'zh_CN', ProductAttributeContent>;
}

export interface Product {
  id: string;
  sku: string;
  isPublished: boolean;
  isFeatured: boolean;
  trackInventory: boolean;
  categoryId: string;
  brandId: string;
  barcode: string;
  purchasePrice: number;
  wholePrice: number;
  retailPrice: number;
  webPrice: number;
  discount: number;
  weight: string;
  dimensions: string;
  stockLevels: StockLevel[];
  images: unknown[];
  content: ContentLang;
  relatedSkus: string[];
  attributes: ProductAttribute[];
}

export interface Category {
  id: string;
  name: string;
  nameZhTw: string;
  nameZhCn: string;
  productCount: number;
}

export interface Brand {
  id: string;
  name: string;
}

export interface Warehouse {
  id: string;
  name: string;
}

export interface Order {
  id: number;
  orderId: string;
  customer: string;
  email: string;
  phone: string;
  amount: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  paymentStatus: 'Paid' | 'Pending' | 'Refunded';
  date: string;
  items: { sku: string; name: string; qty: number; price: number }[];
  shippingAddress: string;
}

export interface RetailOrder {
  id: number;
  orderId: string;
  customer: string;
  amount: number;
  status: string;
  paymentMethod: string;
  date: string;
  items: { sku: string; name: string; qty: number; price: number }[];
  cashier: string;
}

export interface WholesaleOrder {
  id: number;
  orderId: string;
  customer: string;
  contact: string;
  amount: number;
  status: string;
  paymentStatus: string;
  date: string;
  items: { sku: string; name: string; qty: number; price: number }[];
  shippingAddress: string;
}

export interface PurchaseOrder {
  id: number;
  poNumber: string;
  supplier: string;
  contact: string;
  amount: number;
  status: string;
  date: string;
  expectedDate: string;
  items: { sku: string; name: string; qty: number; cost: number; total: number }[];
}

export interface Member {
  id: number;
  name: string;
  email: string;
  phone: string;
  level: 'Gold' | 'Silver' | 'Bronze';
  totalSpent: number;
  joinDate: string;
  status: 'Active' | 'Inactive';
  ordersCount: number;
}

export interface Supplier {
  id: number;
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  productsSupplied: string[];
  status: 'Active' | 'Inactive';
}

export interface Merchant {
  id: number;
  name: string;
  type: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  commission: string;
  status: 'Active' | 'Inactive';
  totalSales: number;
}

export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  lastLogin: string;
  status: 'Active' | 'Inactive';
}

export interface Page {
  id: number;
  title: string;
  slug: string;
  content: ContentLang;
  status: 'Published' | 'Draft';
  updatedAt: string;
}

export interface News {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  content?: {
    en?: { title?: string; content?: string; excerpt?: string; tags?: string[] };
    zh_TW?: { title?: string; content?: string; excerpt?: string; tags?: string[] };
    zh_CN?: { title?: string; content?: string; excerpt?: string; tags?: string[] };
  };
  status?: 'Published' | 'Draft';
  author: string;
  publishedAt?: string;
  postDate?: string;
  updatedAt?: string;
  modifiedAt?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  featured?: number;
  views?: number;
  image?: string;
  images?: Array<{ id?: string | number; image_id?: string | number }>;
  pageTemplate?: 'standard' | 'grapesjs';
  page_template?: 'standard' | 'grapesjs';
}

export interface Service {
  id: number;
  slug?: string;
  title?: string;
  author?: string;
  postDate?: string;
  updatedAt?: string;
  modifiedAt?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  is_published?: number;
  status?: 'Published' | 'Draft' | 'Active' | 'Inactive';
  categoryId?: string | number;
  content?: {
    en?: { title?: string; content?: string; excerpt?: string; tags?: string[] };
    zh_TW?: { title?: string; content?: string; excerpt?: string; tags?: string[] };
    zh_CN?: { title?: string; content?: string; excerpt?: string; tags?: string[] };
  };
  images?: Array<{ id?: string | number; image_id?: string | number; ordering?: number }>;
  pageTemplate?: 'standard' | 'grapesjs';
  page_template?: 'standard' | 'grapesjs';
}

export interface ServiceCategory {
  id: string;
  slug: string;
  isPublished: boolean;
  title: string;
  content: string;
  lang_data: {
    en: { title: string; content: string; subcontent: string };
    zh_TW: { title: string; content: string; subcontent: string };
    zh_CN: { title: string; content: string; subcontent: string };
  };
  images: Array<{ id: string; image_id: string; ordering: number }>;
}

export interface Settings {
  siteName: string;
  siteNameZhTw: string;
  siteNameZhCn: string;
  tagline: string;
  taglineZhTw: string;
  taglineZhCn: string;
  currency: string;
  timezone: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
}

export interface LowStockAlert {
  sku: string;
  name: string;
  stock: number;
  threshold: number;
}

export interface Sequence {
  id: number;
  name: string;
  prefix: string;
  current: number;
}

export interface Compliance {
  id: number;
  type: string;
  status: 'Compliant' | 'Non-Compliant' | 'Pending';
  lastReviewed: string;
  nextReview: string;
}

export interface Stats {
  totalMembers: number;
  newMembersThisMonth: number;
  webOrdersToday: number;
  todaysRevenue: number;
  pendingOrders: number;
  lowStockAlerts: number;
}
