import React, { useState, useContext } from 'react';
import { Plus, Edit, Trash2, Search, ChevronLeft, Globe, Package, History, Tag, X, Loader2, ChevronDown, ChevronRight, GitBranch } from 'lucide-react';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { LanguageTabs, ContentLang, LANG_SHORT } from './shared/LanguageTabs';
import { TagInput } from './shared/TagInput';
import { ImageGallery, GalleryImage } from './shared/ImageGallery';
import { RichTextEditor } from './shared/RichTextEditor';
import { ProductAttrEditor } from './shared/ProductAttrEditor';
import { AttrRow, generateChildSkus } from './shared/attributeGroupsStore';
import { ChildSkuPanel, ChildSkuBadge, ChildSkuOverride, totalChildStock } from './shared/ChildSkuPanel';
import { NavigationContext, AttributeGroupsContext } from '../../App';
import { toast } from 'sonner@2.0.3';
import { productService } from '../../services/api';
import type { Category, Brand, Warehouse } from '../../services/api/types';

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

  const stockLevels = Array.isArray(raw.stockLevels) ? raw.stockLevels : [];
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
  const [products, setProducts] = useState<ProductModel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingProduct, setEditingProduct] = useState<ProductModel | null>(null);
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
        setCategories(categoriesRes.data);
        setBrands(brandsRes.data);
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

  const openEdit = (p: ProductModel) => { setEditingProduct(normalizeProduct(JSON.parse(JSON.stringify(p)))); setView('edit'); };
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
      categoryId: categories[0]?.id || 'c1', brandId: brands[0]?.id || 'b1', barcode: '', purchasePrice: 0, wholePrice: 0, retailPrice: 0, webPrice: 0, discount: 0,
      weight: '', dimensions: '',
      stockLevels: warehouses.map((w) => ({ warehouseId: w.id, warehouseName: w.name, qty: 0 })),
      images: [],
      content: { en: { name: '', tags: [], content: '' }, zh_TW: { name: '', tags: [], content: '' }, zh_CN: { name: '', tags: [], content: '' } },
      relatedSkus: [],
      attrRows: [],
      childSkuOverrides: {},
    };
    setEditingProduct(newP); setView('edit');
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
    } catch (error) {
      toast.error('Failed to save product');
      console.error(error);
    }
  };

  const togglePublish = async (id: string) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    try {
      const updated = await productService.patchProduct(id, { isPublished: !product.isPublished });
      setProducts((prev) => prev.map((p) => p.id === id ? normalizeProduct(updated as unknown as Record<string, unknown>) : p));
    } catch (error) {
      toast.error('Failed to update product');
    }
  };

  const toggleFeatured = async (id: string) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    try {
      const updated = await productService.patchProduct(id, { isFeatured: !product.isFeatured });
      setProducts((prev) => prev.map((p) => p.id === id ? normalizeProduct(updated as unknown as Record<string, unknown>) : p));
    } catch (error) {
      toast.error('Failed to update product');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await productService.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success('Product deleted');
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const filtered = products.filter((p) =>
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    p.content.en.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalStock = (p: ProductModel) => p.stockLevels.reduce((sum, s) => sum + s.qty, 0);
  const getBrandName = (brandId: string) => brands.find(b => b.id === brandId)?.name || brandId;
  const getCategoryName = (catId: string) => categories.find(c => c.id === catId)?.name || catId;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (view === 'edit' && editingProduct) {
    const update = <K extends keyof ProductModel>(field: K, value: ProductModel[K]) =>
      setEditingProduct((prev) => prev ? { ...prev, [field]: value } : prev);
    const updateContent = (lang: ContentLang, field: keyof ProductContent, value: unknown) =>
      setEditingProduct((prev) => prev ? { ...prev, content: { ...prev.content, [lang]: { ...prev.content[lang], [field]: value } } } : prev);
    const updateStock = (warehouseId: string, qty: number) =>
      setEditingProduct((prev) => prev ? { ...prev, stockLevels: prev.stockLevels.map((s) => s.warehouseId === warehouseId ? { ...s, qty } : s) } : prev);

    return (
      <div className="min-h-full">
        {/* Gradient Page Header */}
        <div className="bg-gradient-to-r from-[#0f2942] to-[#1a3f5c] text-white px-6 py-5">
          <div className="flex items-center gap-2 text-sm text-white/70 mb-3">
            <button onClick={() => setView('list')} className="hover:text-white flex items-center gap-1 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Products
            </button>
            <span>/</span>
            <span className="text-white">{editingProduct.content.en.name || 'New Product'}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-white">{editingProduct.id.startsWith('prod-') ? 'Create Product' : 'Edit Product'}</h1>
              <p className="text-white/60 text-sm mt-0.5">SKU: {editingProduct.sku || 'Not set'}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setView('list')} className="border-white/30 text-white hover:bg-white/10 bg-transparent">Cancel</Button>
              <Button onClick={handleSave} className="bg-[#cec18a] text-[#0f2942] hover:bg-[#d4c990]">Save Product</Button>
            </div>
          </div>
        </div>

        <div className="py-4 sm:py-6 space-y-5">
          {/* Basic Info */}
          <Card className="overflow-hidden shadow-sm">
            <CardHeader className={`bg-gradient-to-r ${SECTION_COLORS[0]} py-3`}>
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" /> Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">SKU *</label>
                  <Input value={editingProduct.sku} onChange={(e) => update('sku', e.target.value)} placeholder="e.g. ELEC-0001" className="font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Barcode / EAN</label>
                  <Input value={editingProduct.barcode} onChange={(e) => update('barcode', e.target.value)} placeholder="Barcode" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Brand</label>
                  <select
                    className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background"
                    value={editingProduct.brandId}
                    onChange={(e) => update('brandId', e.target.value)}
                  >
                    {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Category</label>
                  <select className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background" value={editingProduct.categoryId} onChange={(e) => update('categoryId', e.target.value)}>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Weight</label>
                  <Input value={editingProduct.weight} onChange={(e) => update('weight', e.target.value)} placeholder="e.g. 150g" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Dimensions</label>
                  <Input value={editingProduct.dimensions} onChange={(e) => update('dimensions', e.target.value)} placeholder="L×W×H" />
                </div>
              </div>
              <div className="flex flex-wrap gap-6 pt-2">
                <div className="flex items-center gap-3">
                  <label className="text-sm">Published</label>
                  <Switch checked={editingProduct.isPublished} onCheckedChange={(v) => update('isPublished', v)} />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm">Featured</label>
                  <Switch checked={editingProduct.isFeatured} onCheckedChange={(v) => update('isFeatured', v)} />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <label className="text-sm">Track Inventory</label>
                    <span className="text-[11px] text-muted-foreground leading-tight">Count stock per warehouse</span>
                  </div>
                  <Switch checked={editingProduct.trackInventory} onCheckedChange={(v) => update('trackInventory', v)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Attributes */}
          <Card className="overflow-hidden shadow-sm">
            <CardHeader className={`bg-gradient-to-r ${SECTION_COLORS[4]} py-3`}>
              <CardTitle className="text-sm flex items-center gap-2">
                <Tag className="w-4 h-4 text-rose-600" /> Product Attributes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <ProductAttrEditor
                attrRows={editingProduct.attrRows}
                onChange={(rows) => update('attrRows', rows)}
                groups={attrGroups}
              />
              <ChildSkuPanel
                parentSku={editingProduct.sku}
                attrRows={editingProduct.attrRows}
                groups={attrGroups}
                warehouses={WAREHOUSES}
                parentDefaults={{
                  purchasePrice: editingProduct.purchasePrice,
                  wholePrice: editingProduct.wholePrice,
                  retailPrice: editingProduct.retailPrice,
                  webPrice: editingProduct.webPrice,
                  discount: editingProduct.discount,
                }}
                overrides={editingProduct.childSkuOverrides}
                onChange={(overrides) => update('childSkuOverrides', overrides)}
              />
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card className="overflow-hidden shadow-sm">
            <CardHeader className={`bg-gradient-to-r ${SECTION_COLORS[2]} py-3`}>
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="w-4 h-4 text-emerald-600 font-medium text-base">$</span> Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { label: 'Purchase Price', field: 'purchasePrice' as const, color: 'text-slate-600' },
                  { label: 'Whole Price', field: 'wholePrice' as const, color: 'text-blue-600' },
                  { label: 'Retail Price', field: 'retailPrice' as const, color: 'text-purple-600' },
                  { label: 'Web Price', field: 'webPrice' as const, color: 'text-emerald-600' },
                  { label: 'Discount (%)', field: 'discount' as const, color: 'text-amber-600' },
                ].map(({ label, field, color }) => (
                  <div key={field} className="space-y-1">
                    <label className={`text-sm ${color}`}>{label}</label>
                    <div className="relative">
                      {field !== 'discount' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>}
                      <Input
                        type="number" min={0} step="0.01"
                        className={field !== 'discount' ? 'pl-7' : ''}
                        value={editingProduct[field]}
                        onChange={(e) => update(field, parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {editingProduct.discount > 0 && (
                <div className="mt-3 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg inline-flex items-center gap-2">
                  <span className="text-sm text-emerald-700">
                    Discounted web price: <strong>HK${(editingProduct.webPrice * (1 - editingProduct.discount / 100)).toFixed(2)}</strong>
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Levels */}
          {editingProduct.trackInventory ? (
          <Card className="overflow-hidden shadow-sm">
            <CardHeader className={`bg-gradient-to-r ${SECTION_COLORS[3]} py-3`}>
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-600" /> Stock Levels by Warehouse
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-3">
              {editingProduct.stockLevels.map((s) => (
                <div key={s.warehouseId} className="flex items-center justify-between gap-4 p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{s.warehouseName}</p>
                    <p className="text-xs text-muted-foreground">{s.warehouseId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number" min={0} value={s.qty}
                      onChange={(e) => updateStock(s.warehouseId, parseInt(e.target.value) || 0)}
                      className="w-24 sm:w-28 bg-white"
                    />
                    <span className="text-sm text-muted-foreground">units</span>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-border flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Total stock:</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  editingProduct.stockLevels.reduce((sum, s) => sum + s.qty, 0) <= 5 ? 'bg-red-100 text-red-700' :
                  editingProduct.stockLevels.reduce((sum, s) => sum + s.qty, 0) <= 10 ? 'bg-amber-100 text-amber-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {editingProduct.stockLevels.reduce((sum, s) => sum + s.qty, 0)} units
                </span>
              </div>
            </CardContent>
          </Card>
          ) : (
          <Card className="overflow-hidden shadow-sm opacity-60">
            <CardHeader className="bg-gradient-to-r from-slate-100 to-slate-50 border-l-4 border-slate-300 py-3">
              <CardTitle className="text-sm flex items-center gap-2 text-slate-400">
                <Package className="w-4 h-4" /> Stock Levels by Warehouse
                <span className="ml-auto text-[11px] font-normal px-2 py-0.5 bg-slate-200 text-slate-500 rounded-full">
                  Inventory tracking disabled
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 p-4 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm">
                <Package className="w-5 h-5 flex-shrink-0" />
                <span>This product does not track inventory. Enable <strong>Track Inventory</strong> in Basic Information to manage stock levels.</span>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Images */}
          <Card className="overflow-hidden shadow-sm">
            <CardHeader className={`bg-gradient-to-r ${SECTION_COLORS[1]} py-3`}>
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="w-4 h-4 text-purple-600">🖼</span> Image Gallery
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <ImageGallery images={editingProduct.images} onChange={(imgs) => update('images', imgs)} />
            </CardContent>
          </Card>

          {/* Multilingual Content */}
          <Card className="overflow-hidden shadow-sm">
            <CardHeader className={`bg-gradient-to-r from-[#0f2942]/10 to-transparent border-l-4 border-[#0f2942] py-3`}>
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#0f2942]" /> Multilingual Content
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <LanguageTabs>
                {(lang) => (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Product Name</label>
                      <Input value={editingProduct.content[lang].name} onChange={(e) => updateContent(lang, 'name', e.target.value)} placeholder="Product name" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Tags</label>
                      <TagInput tags={editingProduct.content[lang].tags} onChange={(tags) => updateContent(lang, 'tags', tags)} />
                    </div>
                    <RichTextEditor label="Description" value={editingProduct.content[lang].content} onChange={(v) => updateContent(lang, 'content', v)} minHeight="200px" />
                  </div>
                )}
              </LanguageTabs>
            </CardContent>
          </Card>

          {/* History */}
          <Card className="overflow-hidden shadow-sm">
            <CardHeader className={`bg-gradient-to-r from-slate-500/10 to-slate-50 border-l-4 border-slate-400 py-3`}>
              <div className="flex items-center gap-3">
                <History className="w-4 h-4 text-slate-600" />
                <CardTitle className="text-sm">Transaction History</CardTitle>
                <div className="flex gap-0 border border-border rounded-lg overflow-hidden ml-auto">
                  <button onClick={() => setHistoryTab('purchase')} className={`px-4 py-1.5 text-xs transition-colors ${historyTab === 'purchase' ? 'bg-[#0f2942] text-white' : 'hover:bg-muted'}`}>Purchase History</button>
                  <button onClick={() => setHistoryTab('sales')} className={`px-4 py-1.5 text-xs transition-colors ${historyTab === 'sales' ? 'bg-[#0f2942] text-white' : 'hover:bg-muted'}`}>Sales History</button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {historyTab === 'purchase' ? (
                  <table className="w-full text-sm min-w-[500px]">
                    <thead className="border-b border-border bg-muted/30">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs text-muted-foreground">PO Number</th>
                        <th className="text-left px-4 py-2 text-xs text-muted-foreground">Date</th>
                        <th className="text-left px-4 py-2 text-xs text-muted-foreground">Supplier</th>
                        <th className="text-right px-4 py-2 text-xs text-muted-foreground">Qty</th>
                        <th className="text-right px-4 py-2 text-xs text-muted-foreground">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PURCHASE_HISTORY.map((h) => (
                        <tr key={h.po} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-2.5">
                            <button onClick={() => navigateTo('purchase-orders', h.po)} className="text-[#0f2942] hover:underline font-mono text-xs font-medium">{h.po}</button>
                          </td>
                          <td className="px-4 py-2.5">{h.date}</td>
                          <td className="px-4 py-2.5">{h.supplier}</td>
                          <td className="px-4 py-2.5 text-right">{h.qty}</td>
                          <td className="px-4 py-2.5 text-right">HK${h.cost.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-sm min-w-[500px]">
                    <thead className="border-b border-border bg-muted/30">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs text-muted-foreground">Order ID</th>
                        <th className="text-left px-4 py-2 text-xs text-muted-foreground">Date</th>
                        <th className="text-left px-4 py-2 text-xs text-muted-foreground">Customer</th>
                        <th className="text-right px-4 py-2 text-xs text-muted-foreground">Qty</th>
                        <th className="text-right px-4 py-2 text-xs text-muted-foreground">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SALES_HISTORY.map((h) => (
                        <tr key={h.orderId} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-2.5">
                            <button onClick={() => navigateTo('web-orders', h.orderId)} className="text-[#0f2942] hover:underline font-mono text-xs font-medium">{h.orderId}</button>
                          </td>
                          <td className="px-4 py-2.5">{h.date}</td>
                          <td className="px-4 py-2.5">{h.customer}</td>
                          <td className="px-4 py-2.5 text-right">{h.qty}</td>
                          <td className="px-4 py-2.5 text-right text-emerald-600">HK${h.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* List Header */}
      <div className="bg-gradient-to-r from-[#0f2942] to-[#1a3f5c] text-white px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-white">Products Management</h1>
            <p className="text-white/60 text-sm">{products.length} products · {products.filter((p) => p.isPublished).length} published</p>
          </div>
          <Button onClick={openCreate} className="bg-[#cec18a] text-[#0f2942] hover:bg-[#d4c990] self-start sm:self-auto">
            <Plus className="w-4 h-4 mr-1" /> New Product
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Products', value: products.length, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: '📦' },
            { label: 'Published', value: products.filter(p => p.isPublished).length, color: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: '✅' },
            { label: 'Featured', value: products.filter(p => p.isFeatured).length, color: 'bg-amber-50 border-amber-200 text-amber-700', icon: '⭐' },
            { label: 'Low Stock (<5)', value: products.filter(p => totalStock(p) < 5 && p.trackInventory).length, color: 'bg-red-50 border-red-200 text-red-700', icon: '⚠️' },
          ].map((stat) => (
            <div key={stat.label} className={`p-3 rounded-xl border ${stat.color}`}>
              <div className="flex items-center gap-2">
                <span>{stat.icon}</span>
                <div>
                  <p className="text-xs opacity-70">{stat.label}</p>
                  <p className="text-xl font-medium">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search SKU or name..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="border-b border-border bg-[#0f2942]/5">
                  <tr>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">SKU</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Product Name</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Brand</th>
                    <th className="text-left px-4 py-3 text-[#0f2942] text-xs">Category</th>
                    <th className="text-center px-4 py-3 text-[#0f2942] text-xs">Published</th>
                    <th className="text-center px-4 py-3 text-[#0f2942] text-xs">Featured</th>
                    <th className="text-right px-4 py-3 text-[#0f2942] text-xs">Purchase</th>
                    <th className="text-right px-4 py-3 text-[#0f2942] text-xs">Whole</th>
                    <th className="text-right px-4 py-3 text-[#0f2942] text-xs">Web</th>
                    <th className="text-right px-4 py-3 text-[#0f2942] text-xs">Stock</th>
                    <th className="text-right px-4 py-3 text-[#0f2942] text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const childSkus = generateChildSkus(p.sku, p.attrRows, attrGroups);
                    const hasVariants = childSkus.length > 0;
                    const isExpanded = expandedIds.has(p.id);
                    return (
                      <React.Fragment key={p.id}>
                        {/* ── Parent row ─────────────────────────────────── */}
                        <tr className={`border-b border-border transition-colors ${isExpanded ? 'bg-[#0f2942]/5' : 'hover:bg-[#0f2942]/5'}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {hasVariants ? (
                                <button
                                  onClick={() => toggleExpand(p.id)}
                                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#0f2942]/15 transition-colors flex-shrink-0"
                                  title={isExpanded ? 'Collapse variants' : 'Expand variants'}
                                >
                                  {isExpanded
                                    ? <ChevronDown className="w-3.5 h-3.5 text-[#0f2942]" />
                                    : <ChevronRight className="w-3.5 h-3.5 text-[#0f2942]" />
                                  }
                                </button>
                              ) : (
                                <span className="w-5 flex-shrink-0" />
                              )}
                              <div>
                                <span className="font-mono text-xs text-[#0f2942]">{p.sku}</span>
                                {hasVariants && (
                                  <div className="mt-0.5">
                                    <ChildSkuBadge count={childSkus.length} />
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium">{p.content.en.name}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{getBrandName(p.brandId)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs">{getCategoryName(p.categoryId)}</span>
                          </td>
                          <td className="px-4 py-3 text-center"><Switch checked={p.isPublished} onCheckedChange={() => togglePublish(p.id)} /></td>
                          <td className="px-4 py-3 text-center"><Switch checked={p.isFeatured} onCheckedChange={() => toggleFeatured(p.id)} /></td>
                          <td className="px-4 py-3 text-right text-muted-foreground">${p.purchasePrice}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">${p.wholePrice}</td>
                          <td className="px-4 py-3 text-right font-medium">${p.webPrice}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              !p.trackInventory
                                ? 'bg-slate-100 text-slate-500'
                                : totalStock(p) <= 5 ? 'bg-red-100 text-red-700'
                                : totalStock(p) <= 10 ? 'bg-amber-100 text-amber-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {p.trackInventory ? totalStock(p) : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEdit(p)} className="hover:bg-[#0f2942]/10 hover:text-[#0f2942]"><Edit className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          </td>
                        </tr>

                        {/* ── Child SKU rows (expanded) ───────────────────── */}
                        {hasVariants && isExpanded && childSkus.map((child) => {
                          const o: ChildSkuOverride = p.childSkuOverrides[child.sku] ?? {
                            purchasePrice: p.purchasePrice, wholePrice: p.wholePrice,
                            retailPrice: p.retailPrice, webPrice: p.webPrice, discount: p.discount,
                            stockLevels: WAREHOUSES.map(w => ({ warehouseId: w.id, warehouseName: w.name, qty: 0 })),
                          };
                          const variantTotal = totalChildStock(o);
                          const effWeb = o.discount > 0 ? o.webPrice * (1 - o.discount / 100) : o.webPrice;
                          return (
                            <tr key={child.sku} className="border-b border-dashed border-[#0f2942]/10 bg-[#0f2942]/[0.025] hover:bg-[#0f2942]/[0.06] transition-colors">
                              {/* SKU */}
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-2 pl-6">
                                  <span className="text-muted-foreground text-xs select-none">↳</span>
                                  <span className="font-mono text-xs text-[#0f2942]/80">{child.sku}</span>
                                </div>
                              </td>
                              {/* Variant combo */}
                              <td className="px-4 py-2">
                                <div className="flex flex-wrap gap-1">
                                  {child.combo.map((c, i) => (
                                    <span key={`${c.groupName}-${i}`} className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#0f2942]/8 text-[#0f2942]/70">
                                      {c.groupName}: {c.value.content.en || c.value.content.zh_TW}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              {/* Brand / Cat (inherited) */}
                              <td className="px-4 py-2 text-center"><span className="text-[10px] text-muted-foreground">—</span></td>
                              <td className="px-4 py-2 text-center"><span className="text-[10px] text-muted-foreground">—</span></td>
                              {/* Published / Featured (inherit parent) */}
                              <td className="px-4 py-2 text-center"><span className="text-[10px] text-muted-foreground">↑</span></td>
                              <td className="px-4 py-2 text-center"><span className="text-[10px] text-muted-foreground">↑</span></td>
                              {/* Purchase */}
                              <td className="px-4 py-2 text-right">
                                <span className="text-xs text-muted-foreground">${o.purchasePrice}</span>
                              </td>
                              {/* Whole */}
                              <td className="px-4 py-2 text-right">
                                <span className="text-xs text-muted-foreground">${o.wholePrice}</span>
                              </td>
                              {/* Web */}
                              <td className="px-4 py-2 text-right">
                                <div className="text-right">
                                  <span className="text-xs font-medium text-[#0f2942]/80">${effWeb % 1 === 0 ? effWeb : effWeb.toFixed(2)}</span>
                                  {o.discount > 0 && <span className="ml-1 text-[10px] text-emerald-600">-{o.discount}%</span>}
                                </div>
                              </td>
                              {/* Stock */}
                              <td className="px-4 py-2 text-right">
                                <div>
                                  <span className={`text-xs font-medium ${variantTotal === 0 ? 'text-red-500' : variantTotal <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {variantTotal}
                                  </span>
                                  <div className="flex flex-col items-end gap-0.5 mt-0.5">
                                    {o.stockLevels.filter(s => s.qty > 0).map(s => (
                                      <span key={s.warehouseId} className="text-[9px] text-muted-foreground whitespace-nowrap">
                                        {s.warehouseName.split(' ')[0]}: {s.qty}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </td>
                              {/* Actions */}
                              <td className="px-4 py-2" />
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && <div className="py-12 text-center text-muted-foreground">No products found</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}