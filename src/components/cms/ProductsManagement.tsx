import React, { useEffect, useState, useContext } from 'react';
import { Plus, Edit, Trash2, Search, ChevronLeft, Globe, Package, History, Tag, X, Loader2, ChevronDown, ChevronRight, GitBranch } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { LanguageTabs, ContentLang } from './shared/LanguageTabs';
import { TagInput } from './shared/TagInput';
import { ImageGallery, GalleryImage } from './shared/ImageGallery';
import { RichTextEditor } from './shared/RichTextEditor';
import { ProductAttrEditor } from './shared/ProductAttrEditor';
import { AttrRow, generateChildSkus } from './shared/attributeGroupsStore';
import { ChildSkuPanel, ChildSkuBadge, ChildSkuOverride, totalChildStock } from './shared/ChildSkuPanel';
import { NavigationContext, AttributeGroupsContext } from '../../App';
import { toast } from 'sonner';
import { productService } from '../../services/api';
import type { Category, Brand, Warehouse } from '../../services/api/types';
// @ts-ignore figma-ui submodule drop zone will provide this view.
import ProductsManagementView from '../figma-ui/ProductsManagementView';
import { buildContainerContract } from '../containerContracts';

interface ProductContent { name: string; tags: string[]; content: string; }
interface StockLevel { warehouseId: string; warehouseName: string; qty: number; }
interface ProductModel {
  id: string; sku: string; isPublished: boolean; isFeatured: boolean;
  trackInventory: boolean;
  categoryId: string; brandId: string; barcode: string;
  purchasePrice: number; wholePrice: number; retailPrice: number; webPrice: number;
  discount: number; weight: string; dimensions: string;
  stockLevels: StockLevel[]; images: GalleryImage[];
  content: Record<ContentLang, ProductContent>;
  relatedSkus: string[];
  attrRows: AttrRow[];
  childSkuOverrides: Record<string, ChildSkuOverride>;
}

function normalizeProduct(raw: Partial<ProductModel> & Record<string, unknown>): ProductModel {
  const content = (raw.content as Record<string, unknown> | undefined) ?? {};
  const en = (content.en as Record<string, unknown> | undefined) ?? {};
  const zhTw = (content.zh_TW as Record<string, unknown> | undefined) ?? {};
  const zhCn = (content.zh_CN as Record<string, unknown> | undefined) ?? {};

  const stockLevels = Array.isArray(raw.stockLevels) ? raw.stockLevels.map((s: any) => ({
    warehouseId: String(s.warehouseId ?? s.warehouse_id ?? ''),
    warehouseName: String(s.warehouseName ?? s.warehouse_name ?? ''),
    qty: Number(s.qty ?? 0),
  })) : [];
  const images = Array.isArray(raw.images) ? raw.images : [];
  const attrRows = Array.isArray(raw.attrRows) ? raw.attrRows : [];
  const relatedSkus = Array.isArray(raw.relatedSkus) ? raw.relatedSkus : [];

  return {
    id: String(raw.id ?? ''),
    sku: String(raw.sku ?? ''),
    isPublished: Boolean(raw.isPublished),
    isFeatured: Boolean(raw.isFeatured),
    trackInventory: raw.trackInventory !== false,
    categoryId: String(raw.categoryId ?? ''),
    brandId: String(raw.brandId ?? ''),
    barcode: String(raw.barcode ?? ''),
    purchasePrice: Number(raw.purchasePrice ?? 0),
    wholePrice: Number(raw.wholePrice ?? 0),
    retailPrice: Number(raw.retailPrice ?? 0),
    webPrice: Number(raw.webPrice ?? 0),
    discount: Number(raw.discount ?? 0),
    weight: String(raw.weight ?? ''),
    dimensions: String(raw.dimensions ?? ''),
    stockLevels: stockLevels as StockLevel[],
    images: images as GalleryImage[],
    content: {
      en: {
        name: String(en.name ?? ''),
        tags: Array.isArray(en.tags) ? (en.tags as string[]) : [],
        content: String(en.content ?? ''),
      },
      zh_TW: {
        name: String(zhTw.name ?? ''),
        tags: Array.isArray(zhTw.tags) ? (zhTw.tags as string[]) : [],
        content: String(zhTw.content ?? ''),
      },
      zh_CN: {
        name: String(zhCn.name ?? ''),
        tags: Array.isArray(zhCn.tags) ? (zhCn.tags as string[]) : [],
        content: String(zhCn.content ?? ''),
      },
    },
    relatedSkus: relatedSkus as string[],
    attrRows: attrRows as AttrRow[],
    childSkuOverrides: (raw.childSkuOverrides as Record<string, ChildSkuOverride>) ?? {},
  };
}


const PURCHASE_HISTORY = [
  { date: '2026-02-15', supplier: 'SoundMax Ltd.', qty: 50, cost: 14000, po: 'PO-2026-0045' },
  { date: '2025-12-01', supplier: 'SoundMax Ltd.', qty: 100, cost: 27500, po: 'PO-2025-0198' },
];

const SALES_HISTORY = [
  { date: '2026-03-18', orderId: 'ORD-20260003', customer: 'Wong Ka Yan', qty: 2, revenue: 1240 },
  { date: '2026-03-15', orderId: 'ORD-20260001', customer: 'Chan Tai Man', qty: 1, revenue: 620 },
  { date: '2026-03-10', orderId: 'ORD-20260008', customer: 'Lee Siu Ming', qty: 3, revenue: 1860 },
];

const SECTION_COLORS = [
  'from-blue-500/10 to-blue-50 border-l-4 border-blue-400',
  'from-purple-500/10 to-purple-50 border-l-4 border-purple-400',
  'from-emerald-500/10 to-emerald-50 border-l-4 border-emerald-400',
  'from-amber-500/10 to-amber-50 border-l-4 border-amber-400',
  'from-rose-500/10 to-rose-50 border-l-4 border-rose-400',
];

export function ProductsManagement() {
  const navigate = useNavigate();
  const { itemId } = useParams<{ itemId?: string }>();
  const [products, setProducts] = useState<ProductModel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingProduct, setEditingProduct] = useState<ProductModel | null>(null);
  const [activeLang, setActiveLang] = useState<ContentLang>('en');
  const [search, setSearch] = useState('');
  const [historyTab, setHistoryTab] = useState<'purchase' | 'sales'>('purchase');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const { navigateTo } = useContext(NavigationContext);
  const { groups: attrGroups } = useContext(AttributeGroupsContext);

  useEffect(() => {
    async function fetchData() {
      try {
        const [productsRes, categoriesRes, brandsRes, warehousesRes] = await Promise.all([
          productService.getProducts(),
          productService.getCategories(),
          productService.getBrands(),
          productService.getWarehouses(),
        ]);
        const rawProducts = (productsRes.data as unknown as Record<string, unknown>[]) || [];
        setProducts(rawProducts.map((p) => normalizeProduct(p)));
        setCategories(((categoriesRes.data as unknown) as any[]).map((c: any) => ({
          id: String(c.id),
          name: c.name || c.title || c.lang_data?.en?.title || '',
          nameZhTw: c.nameZhTw || c.lang_data?.zh_TW?.title || '',
          nameZhCn: c.nameZhCn || c.lang_data?.zh_CN?.title || '',
          productCount: Number(c.productCount ?? 0),
        })));
        setBrands((((brandsRes.data as unknown) as any[])).map((b: any) => ({
          id: String(b.id),
          name: b.name || b.title || b.lang_data?.en?.title || '',
        })));
        setWarehouses(warehousesRes.data);
      } catch (error) {
        toast.error('Failed to load products');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const openEdit = (p: ProductModel) => {
    setEditingProduct(normalizeProduct(JSON.parse(JSON.stringify(p))));
    setView('edit');
    navigate(`/products/${p.id}`);
  };
  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const openCreate = () => {
    const newP: ProductModel = {
      id: `prod-${Date.now()}`, sku: '', isPublished: false, isFeatured: false,
      trackInventory: true,
      categoryId: '', brandId: '', barcode: '', purchasePrice: 0, wholePrice: 0, retailPrice: 0, webPrice: 0, discount: 0,
      weight: '', dimensions: '',
      stockLevels: warehouses.map((w) => ({ warehouseId: w.id, warehouseName: w.name, qty: 0 })),
      images: [],
      content: { en: { name: '', tags: [], content: '' }, zh_TW: { name: '', tags: [], content: '' }, zh_CN: { name: '', tags: [], content: '' } },
      relatedSkus: [],
      attrRows: [],
      childSkuOverrides: {},
    };
    setEditingProduct(newP);
    setView('edit');
    navigate('/products/new');
  };

  const handleSave = async () => {
    if (!editingProduct) return;
    const pendingCount = editingProduct.images.filter((img: any) => img.pending).length;
    const savedImages = editingProduct.images.map(({ file: _f, pending: _p, ...rest }: any) => rest);
    const toSave = { ...editingProduct, images: savedImages };

    try {
      if (editingProduct.id.startsWith('prod-')) {
        const created = await productService.createProduct(toSave);
        setProducts((prev) => [...prev, normalizeProduct(created as unknown as Record<string, unknown>)]);
        toast.success('Product created successfully');
      } else {
        const updated = await productService.updateProduct(editingProduct.id, toSave);
        setProducts((prev) => prev.map((p) => p.id === editingProduct.id ? normalizeProduct(updated as unknown as Record<string, unknown>) : p));
        toast.success('Product updated successfully');
      }
      setView('list');
      setEditingProduct(null);
      navigate('/products');
    } catch (error) {
      toast.error('Failed to save product');
      console.error(error);
    }
  };

  const goList = () => {
    setView('list');
    setEditingProduct(null);
    navigate('/products');
  };

  const containerContract = buildContainerContract({
    data: {
      products,
      categories,
      brands,
      warehouses,
      view,
      editingProduct,
      activeLang,
      search,
      historyTab,
      expandedIds
    },
    uiState: {
      view,
      activeLang,
      search
    },
    asyncState: {
      loading: loading,
      saving: false,
      error: null,
    },
    callbacks: {
      openEdit,
      toggleExpand,
      openCreate,
      handleSave,
      goList,
      setSearch,
      setView,
      setActiveLang
    },
    meta: {
      container: 'ProductsManagement'
    },
  });

  return <ProductsManagementView {...containerContract} />;
}
