import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Edit, Trash2, ChevronLeft, Tag, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { LanguageTabs, ContentLang } from './shared/LanguageTabs';
import { ImageGallery, GalleryImage } from './shared/ImageGallery';
import { toast } from 'sonner';
import { productService, IMAGE_BASE, type ProductBrand as ApiProductBrand } from '../../services/api';

interface BrandContent {
  name: string;
  description: string;
}

interface BrandModel {
  id: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  images: GalleryImage[];
  content: Record<ContentLang, BrandContent>;
}

const TMP_ID_PREFIX = 'product-brand-';
const emptyContent = (): BrandContent => ({ name: '', description: '' });

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function mapApiBrand(apiBrand: ApiProductBrand, idx: number): BrandModel {
  return {
    id: String(apiBrand.id),
    slug: apiBrand.slug || '',
    sortOrder: idx + 1,
    isActive: Boolean(apiBrand.isPublished),
    images: (apiBrand.images || []).map((img) => ({
      id: String(img.id),
      image_id: parseInt(String(img.image_id), 10),
      url: resolveImageUrl((img as unknown as { url?: string }).url, img.image_id),
      alt: '',
      pending: false,
    })),
    content: {
      en: { name: apiBrand.lang_data?.en?.title || apiBrand.title || '', description: apiBrand.lang_data?.en?.content || apiBrand.content || '' },
      zh_TW: { name: apiBrand.lang_data?.zh_TW?.title || '', description: apiBrand.lang_data?.zh_TW?.content || '' },
      zh_CN: { name: apiBrand.lang_data?.zh_CN?.title || '', description: apiBrand.lang_data?.zh_CN?.content || '' },
    },
  };
}

const API_BASE = 'https://api2.acedemos.com/api';

async function uploadImage(file: File): Promise<{ id: number; url: string }> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const response = await fetch(`${API_BASE}/upload/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64 }),
  });

  if (!response.ok) {
    throw new Error('Failed to upload image');
  }

  const result = await response.json();
  return result.data;
}

function resolveImageUrl(url: string | undefined, imageId: string | number | undefined): string {
  if (url && url.startsWith('http')) return url;
  if (url && url.startsWith('/')) return `${IMAGE_BASE}${url}`;
  return `${IMAGE_BASE}/image/${imageId}`;
}

export function BrandsManagement() {
  const navigate = useNavigate();
  const { itemId } = useParams<{ itemId?: string }>();
  const [brands, setBrands] = useState<BrandModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingBrand, setEditingBrand] = useState<BrandModel | null>(null);
  const [activeLang, setActiveLang] = useState<ContentLang>('en');
  const sorted = useMemo(() => [...brands].sort((a, b) => a.sortOrder - b.sortOrder), [brands]);

  useEffect(() => {
    async function fetchBrands() {
      try {
        const res = await productService.getBrands();
        const mapped = (res.data as unknown as ApiProductBrand[]).map((brand, idx) => mapApiBrand(brand, idx));
        setBrands(mapped);
      } catch {
        toast.error('Failed to load brands');
      } finally {
        setLoading(false);
      }
    }
    fetchBrands();
  }, []);

  const openEdit = (brand: BrandModel) => {
    setEditingBrand(JSON.parse(JSON.stringify(brand)));
    setActiveLang('en');
    setView('edit');
    navigate(`/brands/${brand.id}`);
  };

  const openCreate = () => {
    const next = {
      id: `${TMP_ID_PREFIX}${Date.now()}`,
      slug: '',
      sortOrder: brands.length + 1,
      isActive: true,
      images: [],
      content: { en: emptyContent(), zh_TW: emptyContent(), zh_CN: emptyContent() },
    };
    setEditingBrand(next);
    setActiveLang('en');
    setView('edit');
    navigate('/brands/new');
  };

  const handleSave = async () => {
    if (!editingBrand) return;
    if (!editingBrand.content.en.name.trim()) {
      toast.error('English name is required');
      return;
    }

    try {
      let finalImages = editingBrand.images;
      const pendingImages = editingBrand.images.filter((img) => img.pending && img.file);
      for (const img of pendingImages) {
        if (img.file) {
          const uploaded = await uploadImage(img.file);
          finalImages = finalImages.map((i) =>
            i.id === img.id
              ? { id: String(uploaded.id), image_id: uploaded.id, url: resolveImageUrl(uploaded.url, uploaded.id), alt: i.alt, pending: false }
              : i
          );
        }
      }

      const savedImages = finalImages.map(({ file: _f, pending: _p, ...rest }) => rest);
      const payload = {
        slug: editingBrand.slug || slugify(editingBrand.content.en.name),
        title: editingBrand.content.en.name,
        content: editingBrand.content.en.description,
        is_published: editingBrand.isActive ? 1 : 0,
        lang_data: {
          en: { title: editingBrand.content.en.name, content: editingBrand.content.en.description, subcontent: '' },
          zh_TW: { title: editingBrand.content.zh_TW.name, content: editingBrand.content.zh_TW.description, subcontent: '' },
          zh_CN: { title: editingBrand.content.zh_CN.name, content: editingBrand.content.zh_CN.description, subcontent: '' },
        },
        images_data: savedImages.map((img, index) => ({
          image_id: parseInt(String(img.image_id), 10),
          ordering: index,
        })),
      };

      if (editingBrand.id.startsWith(TMP_ID_PREFIX)) {
        const result = await productService.createBrand(payload);
        const createdId = String((result as unknown as Record<string, unknown>).id || '');
        const saved = { ...editingBrand, id: createdId || editingBrand.id, slug: payload.slug, images: savedImages };
        setBrands((prev) => [...prev, saved]);
      } else {
        await productService.updateBrand(editingBrand.id, payload);
        setBrands((prev) => prev.map((b) => (b.id === editingBrand.id ? { ...editingBrand, slug: payload.slug, images: savedImages } : b)));
      }
      toast.success('Brand saved');
      setView('list');
      setEditingBrand(null);
      navigate('/brands');
    } catch {
      toast.error('Failed to save brand');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this brand?')) return;
    try {
      if (!id.startsWith(TMP_ID_PREFIX)) {
        await productService.deleteBrand(id);
      }
      setBrands((prev) => prev.filter((b) => b.id !== id));
      toast.success('Brand deleted');
    } catch {
      toast.error('Failed to delete brand');
    }
  };

  const update = <K extends keyof BrandModel>(field: K, value: BrandModel[K]) =>
    setEditingBrand((prev) => (prev ? { ...prev, [field]: value } : prev));

  const updateContent = (lang: ContentLang, field: keyof BrandContent, value: string) =>
    setEditingBrand((prev) => (prev ? { ...prev, content: { ...prev.content, [lang]: { ...prev.content[lang], [field]: value } } } : prev));

  const goList = () => {
    setView('list');
    setEditingBrand(null);
    navigate('/brands');
  };

  useEffect(() => {
    if (loading) return;
    if (!itemId) {
      if (view !== 'list' || editingBrand) goList();
      return;
    }
    if (itemId === 'new') {
      if (view !== 'edit') openCreate();
      return;
    }
    const found = brands.find((b) => String(b.id) === String(itemId));
    if (found) {
      if (view !== 'edit' || String(editingBrand?.id) !== String(found.id)) {
        setEditingBrand(JSON.parse(JSON.stringify(found)));
        setActiveLang('en');
        setView('edit');
      }
    } else {
      goList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, loading, brands]);

  if (view === 'edit' && editingBrand) {
    const isNew = editingBrand.id.startsWith(TMP_ID_PREFIX);
    return (
      <main className="min-h-full">
        <div className="bg-gradient-to-r from-[#0f2942] to-[#1a3f5c] text-white px-6 py-5">
          <div className="flex items-center gap-2 text-sm text-white/70 mb-3">
            <button onClick={goList} className="hover:text-white flex items-center gap-1 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Brands
            </button>
            <span>/</span>
            <span className="text-white">{editingBrand.content.en.name || 'New Brand'}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-white">{isNew ? 'New Brand' : editingBrand.content.en.name}</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={goList} className="border-white/30 text-white hover:bg-white/10 bg-transparent">Cancel</Button>
              <Button onClick={handleSave} className="bg-[#cec18a] text-[#0f2942] hover:bg-[#d4c990]">Save Brand</Button>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-5">
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#0f2942]/10 to-transparent border-l-4 border-[#0f2942] py-3">
              <CardTitle className="text-sm text-[#0f2942]">Brand Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Slug</label>
                  <Input value={editingBrand.slug} onChange={(e) => update('slug', e.target.value)} placeholder="brand-slug" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Sort Order</label>
                  <Input type="number" min={1} value={editingBrand.sortOrder} onChange={(e) => update('sortOrder', parseInt(e.target.value, 10) || 1)} className="w-24" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Status</label>
                  <div className="flex items-center gap-2 h-9">
                    <Switch checked={editingBrand.isActive} onCheckedChange={(v) => update('isActive', v)} />
                    <span className="text-sm">{editingBrand.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#0f2942]/10 to-transparent border-l-4 border-[#0f2942] py-3">
              <CardTitle className="text-sm text-[#0f2942]">Brand Content</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <LanguageTabs activeLang={activeLang} onChange={setActiveLang} />
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Name <span className="text-destructive">*</span></label>
                <Input value={editingBrand.content[activeLang].name} onChange={(e) => updateContent(activeLang, 'name', e.target.value)} placeholder="Brand name" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Description</label>
                <textarea className="w-full h-24 px-3 py-2 border border-border rounded-lg text-sm resize-none outline-none focus:ring-1 focus:ring-ring" value={editingBrand.content[activeLang].description} onChange={(e) => updateContent(activeLang, 'description', e.target.value)} placeholder="Brand description" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#0f2942]/10 to-transparent border-l-4 border-[#0f2942] py-3">
              <CardTitle className="text-sm text-[#0f2942]">Brand Images</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <ImageGallery
                images={editingBrand.images}
                onChange={(imgs) => update('images', imgs)}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const activeCount = brands.filter((b) => b.isActive).length;
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-full">
      <div className="bg-gradient-to-r from-[#0f2942] to-[#1a3f5c] text-white px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-white">Brands</h1>
            <p className="text-white/60 text-sm">{brands.length} brands · {activeCount} active</p>
          </div>
          <Button onClick={openCreate} className="bg-[#cec18a] text-[#0f2942] hover:bg-[#d4c990] self-start sm:self-auto">
            <Plus className="w-4 h-4 mr-1" /> New Brand
          </Button>
        </div>
      </div>
      <div className="p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Total Brands', value: brands.length, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: '🏷️' },
            { label: 'Active', value: activeCount, color: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: '✅' },
            { label: 'Inactive', value: brands.length - activeCount, color: 'bg-red-50 border-red-200 text-red-700', icon: '⏸️' },
          ].map((stat) => (
            <div key={stat.label} className={`p-3 rounded-xl border ${stat.color}`}>
              <div className="flex items-center gap-2">
                <span>{stat.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs opacity-70">{stat.label}</p>
                  <p className="text-xl font-medium">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((brand) => (
            <Card key={brand.id} className="shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-purple-50">
                      <Tag className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{brand.content.en.name}</p>
                      {brand.content.zh_TW.name && <p className="text-xs text-muted-foreground truncate">{brand.content.zh_TW.name}</p>}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${brand.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                    {brand.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {brand.content.en.description && <p className="text-xs text-muted-foreground mt-2.5 line-clamp-2">{brand.content.en.description}</p>}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">Order: {brand.sortOrder}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(brand)} className="h-7 w-7 p-0 hover:bg-[#0f2942]/10 hover:text-[#0f2942]"><Edit className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(brand.id)} className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <button onClick={openCreate} className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-[#0f2942]/40 hover:text-[#0f2942] transition-colors min-h-[140px]">
            <Plus className="w-6 h-6" />
            <span className="text-sm">Add Brand</span>
          </button>
        </div>
      </div>
    </main>
  );
}
