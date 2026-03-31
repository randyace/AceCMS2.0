import React, { useState } from 'react';
import { Plus, Edit, Trash2, Search, ChevronLeft, Globe, Star } from 'lucide-react';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { LanguageTabs, ContentLang } from './shared/LanguageTabs';
import { TagInput } from './shared/TagInput';
import { ImageGallery, GalleryImage } from './shared/ImageGallery';
import { RichTextEditor } from './shared/RichTextEditor';
import { toast } from 'sonner@2.0.3';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceContent {
  title: string;
  tags: string[];
  content: string;
  excerpt: string;
}

interface ServiceItem {
  id: string;
  isPublished: boolean;
  isFeatured: boolean;
  dateAdded: string;
  author: string;
  category: string;
  images: GalleryImage[];
  content: Record<ContentLang, ServiceContent>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_CATEGORIES = [
  'Consultation',
  'Installation',
  'Maintenance',
  'Repair',
  'Training',
  'Support',
  'Customisation',
  'Other',
];

const emptyContent = (): ServiceContent => ({ title: '', tags: [], content: '', excerpt: '' });

const INITIAL_SERVICES: ServiceItem[] = [
  {
    id: 's1', isPublished: true, isFeatured: true,
    dateAdded: '2026-03-01', author: 'Product Team', category: 'Installation',
    images: [],
    content: {
      en: {
        title: 'Professional Installation Service',
        tags: ['installation', 'setup', 'on-site'],
        content: 'Our certified technicians will install and configure your purchased products at your premises. We cover residential and commercial sites across Hong Kong.',
        excerpt: 'On-site installation by certified technicians for residential and commercial clients.',
      },
      zh_TW: {
        title: '專業安裝服務',
        tags: ['安裝', '設置', '現場'],
        content: '我們的認證技術人員將在您的場所安裝和配置您購買的產品，涵蓋香港住宅及商業場所。',
        excerpt: '認證技術人員為住宅及商業客戶提供現場安裝服務。',
      },
      zh_CN: {
        title: '专业安装服务',
        tags: ['安装', '设置', '现场'],
        content: '我们的认证技术人员将在您的场所安装和配置您购买的产品，覆盖香港住宅及商业场所。',
        excerpt: '认证技术人员为住宅及商业客户提供现场安装服务。',
      },
    },
  },
  {
    id: 's2', isPublished: true, isFeatured: false,
    dateAdded: '2026-03-05', author: 'Support Team', category: 'Maintenance',
    images: [],
    content: {
      en: {
        title: 'Annual Maintenance Plan',
        tags: ['maintenance', 'annual plan', 'warranty'],
        content: 'Keep your equipment running at peak performance with our Annual Maintenance Plan. Includes scheduled inspections, cleaning, and priority repair services.',
        excerpt: 'Scheduled inspections and priority repairs to keep your equipment in top condition.',
      },
      zh_TW: {
        title: '年度維護計劃',
        tags: ['維護', '年度計劃'],
        content: '透過我們的年度維護計劃，讓您的設備保持最佳性能，包括定期檢查、清潔及優先維修服務。',
        excerpt: '定期檢查及優先維修，讓您的設備保持最佳狀態。',
      },
      zh_CN: {
        title: '年度维护计划',
        tags: ['维护', '年度计划'],
        content: '通过我们的年度维护计划，让您的设备保持最佳性能，包括定期检查、清洁及优先维修服务。',
        excerpt: '定期检查及优先维修，让您的设备保持最佳状态。',
      },
    },
  },
  {
    id: 's3', isPublished: false, isFeatured: false,
    dateAdded: '2026-03-20', author: 'Training Team', category: 'Training',
    images: [],
    content: {
      en: {
        title: 'Staff Product Training',
        tags: ['training', 'staff', 'onboarding'],
        content: 'Empower your team with hands-on training sessions for all products. Available in-person at our showroom or on-site at your location.',
        excerpt: 'Hands-on product training for your team, available in-person or on-site.',
      },
      zh_TW: {
        title: '員工產品培訓',
        tags: ['培訓', '員工', '入職'],
        content: '透過實習培訓課程提升您的團隊能力，可在我們的展廳或您的場所進行。',
        excerpt: '為您的團隊提供實習產品培訓，可現場或上門進行。',
      },
      zh_CN: {
        title: '员工产品培训',
        tags: ['培训', '员工', '入职'],
        content: '通过实习培训课程提升您的团队能力，可在我们的展厅或您的场所进行。',
        excerpt: '为您的团队提供实习产品培训，可现场或上门进行。',
      },
    },
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ServicesManagement() {
  const [services, setServices] = useState<ServiceItem[]>(INITIAL_SERVICES);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingItem, setEditingItem] = useState<ServiceItem | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const openEdit = (item: ServiceItem) => {
    setEditingItem(JSON.parse(JSON.stringify(item)));
    setView('edit');
  };

  const openCreate = () => {
    const newItem: ServiceItem = {
      id: `svc-${Date.now()}`,
      isPublished: false,
      isFeatured: false,
      dateAdded: new Date().toISOString().split('T')[0],
      author: 'Admin',
      category: SERVICE_CATEGORIES[0],
      images: [],
      content: { en: emptyContent(), zh_TW: emptyContent(), zh_CN: emptyContent() },
    };
    setEditingItem(newItem);
    setView('edit');
  };

  const handleSave = () => {
    if (!editingItem) return;
    const pendingCount = editingItem.images.filter((img) => img.pending).length;
    const savedImages = editingItem.images.map(({ file: _f, pending: _p, ...rest }) => rest);
    const toSave = { ...editingItem, images: savedImages };

    const commit = () => {
      setServices((prev) => {
        const existing = prev.find((s) => s.id === toSave.id);
        return existing ? prev.map((s) => (s.id === toSave.id ? toSave : s)) : [...prev, toSave];
      });
      toast.success('Service saved');
      setView('list');
    };

    if (pendingCount > 0) {
      const tid = toast.loading(`Uploading ${pendingCount} image${pendingCount > 1 ? 's' : ''}…`);
      setTimeout(() => { toast.dismiss(tid); commit(); }, 900);
    } else {
      commit();
    }
  };

  const togglePublish = (id: string) =>
    setServices((prev) => prev.map((s) => s.id === id ? { ...s, isPublished: !s.isPublished } : s));

  const toggleFeatured = (id: string) =>
    setServices((prev) => prev.map((s) => s.id === id ? { ...s, isFeatured: !s.isFeatured } : s));

  const handleDelete = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
    toast.success('Service deleted');
  };

  const filtered = services.filter((s) =>
    s.content.en.title.toLowerCase().includes(search.toLowerCase()) &&
    (filterCategory === '' || s.category === filterCategory)
  );

  // ─── Edit View ──────────────────────────────────────────────────────────────

  if (view === 'edit' && editingItem) {
    const update = (field: keyof ServiceItem, value: unknown) =>
      setEditingItem((prev) => prev ? { ...prev, [field]: value } : prev);
    const updateContent = (lang: ContentLang, field: keyof ServiceContent, value: unknown) =>
      setEditingItem((prev) =>
        prev
          ? { ...prev, content: { ...prev.content, [lang]: { ...prev.content[lang], [field]: value } } }
          : prev
      );

    return (
      <div className="px-6 py-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => setView('list')} className="hover:text-primary flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Services Management
          </button>
          <span>/</span>
          <span className="text-foreground">{editingItem.content.en.title || 'New Service'}</span>
        </div>

        {/* Page title + actions */}
        <div className="flex items-center justify-between">
          <h1>{editingItem.id.startsWith('svc-') ? 'Create Service' : 'Edit Service'}</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setView('list')}>Cancel</Button>
            <Button onClick={handleSave}>Save Service</Button>
          </div>
        </div>

        {/* Settings card — no slug field */}
        <Card>
          <CardHeader><CardTitle className="text-base">Service Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Category</label>
                <select
                  className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background"
                  value={editingItem.category}
                  onChange={(e) => update('category', e.target.value)}
                >
                  {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Date Added</label>
                <Input type="date" value={editingItem.dateAdded} onChange={(e) => update('dateAdded', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Author / Owner</label>
                <Input value={editingItem.author} onChange={(e) => update('author', e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-8 pt-1">
              <div className="flex items-center gap-4">
                <label className="text-sm">Published</label>
                <Switch checked={editingItem.isPublished} onCheckedChange={(v) => update('isPublished', v)} />
              </div>
              <div className="flex items-center gap-4">
                <label className="text-sm flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500" /> Featured
                </label>
                <Switch checked={editingItem.isFeatured} onCheckedChange={(v) => update('isFeatured', v)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Image Gallery */}
        <Card>
          <CardHeader><CardTitle className="text-base">Image Gallery</CardTitle></CardHeader>
          <CardContent>
            <ImageGallery images={editingItem.images} onChange={(imgs) => update('images', imgs)} />
          </CardContent>
        </Card>

        {/* Multilingual Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4" /> Multilingual Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LanguageTabs>
              {(lang) => (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Title</label>
                    <Input
                      value={editingItem.content[lang].title}
                      onChange={(e) => updateContent(lang, 'title', e.target.value)}
                      placeholder="Service title"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Short Description</label>
                    <textarea
                      className="w-full h-20 px-3 py-2 border border-border rounded-lg text-sm resize-none outline-none focus:ring-1 focus:ring-ring"
                      value={editingItem.content[lang].excerpt}
                      onChange={(e) => updateContent(lang, 'excerpt', e.target.value)}
                      placeholder="Brief description shown in service listings…"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Tags</label>
                    <TagInput
                      tags={editingItem.content[lang].tags}
                      onChange={(tags) => updateContent(lang, 'tags', tags)}
                    />
                  </div>
                  <RichTextEditor
                    label="Full Description"
                    value={editingItem.content[lang].content}
                    onChange={(v) => updateContent(lang, 'content', v)}
                    minHeight="240px"
                  />
                </div>
              )}
            </LanguageTabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── List View ──────────────────────────────────────────────────────────────

  return (
    <div className="px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Services Management</h1>
          <p className="text-muted-foreground text-sm">
            {services.length} services · {services.filter((s) => s.isPublished).length} published
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> New Service
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search services…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          className="h-9 px-3 border border-border rounded-md text-sm bg-background"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 text-muted-foreground text-xs">Title (EN)</th>
                  <th className="text-left px-4 py-3 text-muted-foreground text-xs">Category</th>
                  <th className="text-left px-4 py-3 text-muted-foreground text-xs">Date Added</th>
                  <th className="text-left px-4 py-3 text-muted-foreground text-xs">Author</th>
                  <th className="text-center px-4 py-3 text-muted-foreground text-xs">Featured</th>
                  <th className="text-center px-4 py-3 text-muted-foreground text-xs">Published</th>
                  <th className="text-right px-4 py-3 text-muted-foreground text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {item.content.en.title || <span className="text-muted-foreground italic">Untitled</span>}
                      </p>
                      {item.content.en.excerpt && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.content.en.excerpt}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.dateAdded}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.author}</td>
                    <td className="px-4 py-3 text-center">
                      <Switch checked={item.isFeatured} onCheckedChange={() => toggleFeatured(item.id)} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Switch checked={item.isPublished} onCheckedChange={() => togglePublish(item.id)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">No services found</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
