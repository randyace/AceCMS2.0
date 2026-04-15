import React, { useState } from 'react';
import { Plus, Edit, Trash2, ChevronLeft, Wrench } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { LanguageTabs, ContentLang } from './shared/LanguageTabs';
import { toast } from 'sonner@2.0.3';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceCategoryContent {
  name: string;
  description: string;
}

interface ServiceCategory {
  id: string;
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

const INITIAL_CATEGORIES: ServiceCategory[] = [
  {
    id: 'sc1', colorCode: '#3b82f6', sortOrder: 1, isActive: true,
    content: {
      en: { name: 'Consultation', description: 'Professional advisory and planning services.' },
      zh_TW: { name: '顧問服務', description: '專業諮詢及規劃服務。' },
      zh_CN: { name: '咨询服务', description: '专业咨询及规划服务。' },
    },
  },
  {
    id: 'sc2', colorCode: '#22c55e', sortOrder: 2, isActive: true,
    content: {
      en: { name: 'Installation', description: 'On-site installation and setup by certified technicians.' },
      zh_TW: { name: '安裝服務', description: '由認證技術人員提供現場安裝及設置服務。' },
      zh_CN: { name: '安装服务', description: '由认证技术人员提供现场安装及设置服务。' },
    },
  },
  {
    id: 'sc3', colorCode: '#f59e0b', sortOrder: 3, isActive: true,
    content: {
      en: { name: 'Maintenance', description: 'Scheduled maintenance and upkeep services.' },
      zh_TW: { name: '保養服務', description: '定期保養及維護服務。' },
      zh_CN: { name: '维护服务', description: '定期维护及保养服务。' },
    },
  },
  {
    id: 'sc4', colorCode: '#ef4444', sortOrder: 4, isActive: true,
    content: {
      en: { name: 'Repair', description: 'Diagnosis and repair of damaged or faulty items.' },
      zh_TW: { name: '維修服務', description: '診斷及修復損壞或故障物品。' },
      zh_CN: { name: '维修服务', description: '诊断及修复损坏或故障物品。' },
    },
  },
  {
    id: 'sc5', colorCode: '#8b5cf6', sortOrder: 5, isActive: true,
    content: {
      en: { name: 'Training', description: 'User training and onboarding sessions.' },
      zh_TW: { name: '培訓服務', description: '用戶培訓及入門課程。' },
      zh_CN: { name: '培训服务', description: '用户培训及入门课程。' },
    },
  },
  {
    id: 'sc6', colorCode: '#14b8a6', sortOrder: 6, isActive: true,
    content: {
      en: { name: 'Support', description: 'Ongoing technical support and helpdesk services.' },
      zh_TW: { name: '支援服務', description: '持續的技術支援及服務台服務。' },
      zh_CN: { name: '支持服务', description: '持续的技术支持及服务台服务。' },
    },
  },
  {
    id: 'sc7', colorCode: '#ec4899', sortOrder: 7, isActive: true,
    content: {
      en: { name: 'Customisation', description: 'Bespoke customisation and configuration services.' },
      zh_TW: { name: '客製化服務', description: '專屬客製化及配置服務。' },
      zh_CN: { name: '定制服务', description: '专属定制及配置服务。' },
    },
  },
  {
    id: 'sc8', colorCode: '#6b7280', sortOrder: 8, isActive: true,
    content: {
      en: { name: 'Other', description: 'Miscellaneous services not covered by other categories.' },
      zh_TW: { name: '其他服務', description: '其他類別未涵蓋的雜項服務。' },
      zh_CN: { name: '其他服务', description: '其他类别未涵盖的杂项服务。' },
    },
  },
];

const emptyContent = (): ServiceCategoryContent => ({ name: '', description: '' });

// ─── Component ────────────────────────────────────────────────────────────────

export function ServiceCategories() {
  const [categories, setCategories] = useState<ServiceCategory[]>(INITIAL_CATEGORIES);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingCat, setEditingCat] = useState<ServiceCategory | null>(null);
  const [activeLang, setActiveLang] = useState<ContentLang>('en');

  const openEdit = (c: ServiceCategory) => {
    setEditingCat(JSON.parse(JSON.stringify(c)));
    setActiveLang('en');
    setView('edit');
  };

  const openCreate = () => {
    setEditingCat({
      id: `sc-${Date.now()}`,
      colorCode: '#6b7280',
      sortOrder: categories.length + 1,
      isActive: true,
      content: {
        en: emptyContent(),
        zh_TW: emptyContent(),
        zh_CN: emptyContent(),
      },
    });
    setActiveLang('en');
    setView('edit');
  };

  const handleSave = () => {
    if (!editingCat) return;
    if (!editingCat.content.en.name.trim()) {
      toast.error('English name is required');
      return;
    }
    setCategories((prev) => {
      const exists = prev.find((c) => c.id === editingCat.id);
      return exists
        ? prev.map((c) => (c.id === editingCat.id ? editingCat : c))
        : [...prev, editingCat];
    });
    toast.success('Service category saved');
    setView('list');
    setEditingCat(null);
  };

  const handleDelete = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    toast.success('Category deleted');
  };

  const update = <K extends keyof ServiceCategory>(field: K, value: ServiceCategory[K]) =>
    setEditingCat((prev) => (prev ? { ...prev, [field]: value } : prev));

  const updateContent = (lang: ContentLang, field: keyof ServiceCategoryContent, value: string) =>
    setEditingCat((prev) =>
      prev
        ? { ...prev, content: { ...prev.content, [lang]: { ...prev.content[lang], [field]: value } } }
        : prev
    );

  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  // ─── Edit View ──────────────────────────────────────────────────────────────

  if (view === 'edit' && editingCat) {
    const isNew = editingCat.id.startsWith('sc-');
    return (
      <main className="min-h-full">
        <div className="bg-gradient-to-r from-[#0f2942] to-[#1a3f5c] text-white px-6 py-5">
          <div className="flex items-center gap-2 text-sm text-white/70 mb-3">
            <button
              onClick={() => { setView('list'); setEditingCat(null); }}
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
                onClick={() => { setView('list'); setEditingCat(null); }}
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
                {/* Color */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Colour</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        onClick={() => update('colorCode', c)}
                        className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${editingCat.colorCode === c ? 'border-[#0f2942] scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                    <input
                      type="color"
                      value={editingCat.colorCode}
                      onChange={(e) => update('colorCode', e.target.value)}
                      className="w-7 h-7 rounded cursor-pointer border border-border"
                      title="Custom colour"
                    />
                  </div>
                </div>

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
