import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Edit, Trash2, ChevronLeft, Wrench, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { LanguageTabs, ContentLang } from './shared/LanguageTabs';
import { toast } from 'sonner@2.0.3';
import { contentService, type ServiceCategory as ApiServiceCategory } from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceCategoryContent {
  name: string;
  description: string;
}

interface ServiceCategory {
  id: string;
  slug: string;
  colorCode: string;
  sortOrder: number;
  isActive: boolean;
  content: Record<ContentLang, ServiceCategoryContent>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#22c55e', '#14b8a6', '#ef4444', '#6b7280',
];

const emptyContent = (): ServiceCategoryContent => ({ name: '', description: '' });
const TMP_ID_PREFIX = 'service-category-';

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function mapApiCategory(apiCat: ApiServiceCategory, idx: number): ServiceCategory {
  return {
    id: String(apiCat.id),
    slug: apiCat.slug || '',
    colorCode: COLOR_PRESETS[idx % COLOR_PRESETS.length],
    sortOrder: idx + 1,
    isActive: Boolean(apiCat.isPublished),
    content: {
      en: {
        name: apiCat.lang_data?.en?.title || apiCat.title || '',
        description: apiCat.lang_data?.en?.content || apiCat.content || '',
      },
      zh_TW: {
        name: apiCat.lang_data?.zh_TW?.title || '',
        description: apiCat.lang_data?.zh_TW?.content || '',
      },
      zh_CN: {
        name: apiCat.lang_data?.zh_CN?.title || '',
        description: apiCat.lang_data?.zh_CN?.content || '',
      },
    },
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ServiceCategories() {
  const navigate = useNavigate();
  const { itemId } = useParams<{ itemId?: string }>();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingCat, setEditingCat] = useState<ServiceCategory | null>(null);
  const [activeLang, setActiveLang] = useState<ContentLang>('en');
  const sorted = useMemo(() => [...categories].sort((a, b) => a.sortOrder - b.sortOrder), [categories]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await contentService.getServiceCategories();
        const mapped = (res.data || []).map((cat, idx) => mapApiCategory(cat, idx));
        setCategories(mapped);
      } catch {
        toast.error('Failed to load service categories');
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  const openEdit = (c: ServiceCategory) => {
    setEditingCat(JSON.parse(JSON.stringify(c)));
    setActiveLang('en');
    setView('edit');
    navigate(`/service-categories/${c.id}`);
  };

  const openCreate = () => {
    const next = {
      id: `${TMP_ID_PREFIX}${Date.now()}`,
      slug: '',
      colorCode: '#6b7280',
      sortOrder: categories.length + 1,
      isActive: true,
      content: {
        en: emptyContent(),
        zh_TW: emptyContent(),
        zh_CN: emptyContent(),
      },
    };
    setEditingCat(next);
    setActiveLang('en');
    setView('edit');
    navigate('/service-categories/new');
  };

  const handleSave = async () => {
    if (!editingCat) return;
    if (!editingCat.content.en.name.trim()) {
      toast.error('English name is required');
      return;
    }

    const payload = {
      slug: editingCat.slug || slugify(editingCat.content.en.name),
      title: editingCat.content.en.name,
      content: editingCat.content.en.description,
      is_published: editingCat.isActive ? 1 : 0,
      lang_data: {
        en: { title: editingCat.content.en.name, content: editingCat.content.en.description, subcontent: '' },
        zh_TW: { title: editingCat.content.zh_TW.name, content: editingCat.content.zh_TW.description, subcontent: '' },
        zh_CN: { title: editingCat.content.zh_CN.name, content: editingCat.content.zh_CN.description, subcontent: '' },
      },
      images_data: [],
    };

    try {
      if (editingCat.id.startsWith(TMP_ID_PREFIX)) {
        const result = await contentService.createServiceCategory(payload);
        const createdId = String((result as unknown as Record<string, unknown>).id || '');
        const saved = { ...editingCat, id: createdId || editingCat.id, slug: payload.slug };
        setCategories((prev) => [...prev, saved]);
      } else {
        await contentService.updateServiceCategory(Number(editingCat.id), payload);
        setCategories((prev) => prev.map((c) => (c.id === editingCat.id ? { ...editingCat, slug: payload.slug } : c)));
      }
      toast.success('Service category saved');
      setView('list');
      setEditingCat(null);
      navigate('/service-categories');
    } catch {
      toast.error('Failed to save service category');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      if (!id.startsWith(TMP_ID_PREFIX)) {
        await contentService.deleteServiceCategory(Number(id));
      }
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast.success('Category deleted');
    } catch {
      toast.error('Failed to delete category');
    }
  };

  const update = <K extends keyof ServiceCategory>(field: K, value: ServiceCategory[K]) =>
    setEditingCat((prev) => (prev ? { ...prev, [field]: value } : prev));

  const updateContent = (lang: ContentLang, field: keyof ServiceCategoryContent, value: string) =>
    setEditingCat((prev) =>
      prev
        ? { ...prev, content: { ...prev.content, [lang]: { ...prev.content[lang], [field]: value } } }
        : prev
    );

  const goList = () => {
    setView('list');
    setEditingCat(null);
    navigate('/service-categories');
  };

  useEffect(() => {
    if (loading) return;
    if (!itemId) {
      if (view !== 'list' || editingCat) goList();
      return;
    }
    if (itemId === 'new') {
      if (view !== 'edit') openCreate();
      return;
    }
    const found = categories.find((c) => String(c.id) === String(itemId));
    if (found) {
      if (view !== 'edit' || String(editingCat?.id) !== String(found.id)) {
        setEditingCat(JSON.parse(JSON.stringify(found)));
        setActiveLang('en');
        setView('edit');
      }
    } else {
      // Unknown id → back to list
      goList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, loading, categories]);

  // ─── Edit View ──────────────────────────────────────────────────────────────

  if (view === 'edit' && editingCat) {
    const isNew = editingCat.id.startsWith(TMP_ID_PREFIX);
    return (
      <main className="min-h-full">
        <div className="bg-gradient-to-r from-[#0f2942] to-[#1a3f5c] text-white px-6 py-5">
          <div className="flex items-center gap-2 text-sm text-white/70 mb-3">
            <button
              onClick={goList}
              className="hover:text-white flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Service Categories
            </button>
            <span>/</span>
            <span className="text-white">{editingCat.content.en.name || 'New Category'}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-white">{isNew ? 'New Service Category' : editingCat.content.en.name}</h1>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={goList}
                className="border-white/30 text-white hover:bg-white/10 bg-transparent"
              >
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-[#cec18a] text-[#0f2942] hover:bg-[#d4c990]">
                Save Category
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {/* Settings card */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#0f2942]/10 to-transparent border-l-4 border-[#0f2942] py-3">
              <CardTitle className="text-sm text-[#0f2942]">Category Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Slug */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Slug</label>
                  <Input
                    value={editingCat.slug}
                    onChange={(e) => update('slug', e.target.value)}
                    placeholder="service-category-slug"
                  />
                </div>
                {/* Color */}
                

                {/* Sort Order */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Sort Order</label>
                  <Input
                    type="number"
                    min={1}
                    value={editingCat.sortOrder}
                    onChange={(e) => update('sortOrder', parseInt(e.target.value) || 1)}
                    className="w-24"
                  />
                </div>

                {/* Active */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Status</label>
                  <div className="flex items-center gap-2 h-9">
                    <Switch
                      checked={editingCat.isActive}
                      onCheckedChange={(v) => update('isActive', v)}
                    />
                    <span className="text-sm">{editingCat.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Multilang content */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#0f2942]/10 to-transparent border-l-4 border-[#0f2942] py-3">
              <CardTitle className="text-sm text-[#0f2942]">Category Content</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <LanguageTabs activeLang={activeLang} onChange={setActiveLang} />
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">
                  Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={editingCat.content[activeLang].name}
                  onChange={(e) => updateContent(activeLang, 'name', e.target.value)}
                  placeholder="Category name"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Description</label>
                <textarea
                  className="w-full h-24 px-3 py-2 border border-border rounded-lg text-sm resize-none outline-none focus:ring-1 focus:ring-ring"
                  value={editingCat.content[activeLang].description}
                  onChange={(e) => updateContent(activeLang, 'description', e.target.value)}
                  placeholder="Short description of this category"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // ─── List View ──────────────────────────────────────────────────────────────

  const activeCount = categories.filter((c) => c.isActive).length;

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
            <h1 className="text-white">Service Categories</h1>
            <p className="text-white/60 text-sm">
              {categories.length} categories · {activeCount} active
            </p>
          </div>
          <Button onClick={openCreate} className="bg-[#cec18a] text-[#0f2942] hover:bg-[#d4c990] self-start sm:self-auto">
            <Plus className="w-4 h-4 mr-1" /> New Category
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Total Categories', value: categories.length, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: '🗂️' },
            { label: 'Active', value: activeCount, color: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: '✅' },
            { label: 'Inactive', value: categories.length - activeCount, color: 'bg-red-50 border-red-200 text-red-700', icon: '⏸️' },
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

        {/* Category Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((cat) => (
            <Card
              key={cat.id}
              className="shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
            >
              {/* Colour bar */}
              <div className="h-1.5" style={{ backgroundColor: cat.colorCode }} />
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Colour dot + icon */}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${cat.colorCode}20` }}
                    >
                      <Wrench className="w-4 h-4" style={{ color: cat.colorCode }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{cat.content.en.name}</p>
                      {cat.content.zh_TW.name && (
                        <p className="text-xs text-muted-foreground truncate">{cat.content.zh_TW.name}</p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      cat.isActive
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {cat.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {cat.content.en.description && (
                  <p className="text-xs text-muted-foreground mt-2.5 line-clamp-2">
                    {cat.content.en.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">Order: {cat.sortOrder}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(cat)}
                      className="h-7 w-7 p-0 hover:bg-[#0f2942]/10 hover:text-[#0f2942]"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(cat.id)}
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add new card */}
          <button
            onClick={openCreate}
            className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-[#0f2942]/40 hover:text-[#0f2942] transition-colors min-h-[140px]"
          >
            <Plus className="w-6 h-6" />
            <span className="text-sm">Add Category</span>
          </button>
        </div>
      </div>
    </main>
  );
}
