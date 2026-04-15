import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, ChevronLeft, Globe, Star, Loader2, Layout } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { LanguageTabs, ContentLang } from './shared/LanguageTabs';
import { TagInput } from './shared/TagInput';
import { ImageGallery, GalleryImage } from './shared/ImageGallery';
import { RichTextEditor } from './shared/RichTextEditor';
import { PageTemplateModal, PageTemplateType } from './shared/PageTemplateModal';
import { GrapesJSEditor } from './shared/GrapesJSEditor';
import { toast } from 'sonner@2.0.3';
import { contentService, IMAGE_BASE } from '../../services/api';
import type { Service as ApiService, ServiceCategory } from '../../services/api';

interface ServiceContent {
  title: string;
  tags: string[];
  content: string;
  excerpt: string;
}

interface ServiceItem {
  id: string;
  slug: string;
  isPublished: boolean;
  isFeatured: boolean;
  postDate: string;
  modifiedAt: string;
  author: string;
  categoryId: string;
  pageTemplate: 'standard' | 'grapesjs';
  images: GalleryImage[];
  content: Record<ContentLang, ServiceContent>;
}

const API_BASE = 'https://api2.acedemos.com/api';
const emptyContent = (): ServiceContent => ({ title: '', tags: [], content: '', excerpt: '' });

function toPageTemplate(service: Pick<ApiService, 'pageTemplate' | 'page_template'>): 'standard' | 'grapesjs' {
  return service.pageTemplate === 'grapesjs' || service.page_template === 'grapesjs' ? 'grapesjs' : 'standard';
}

function serviceIdFromCreateResponse(result: unknown): string {
  const r = result as Record<string, unknown>;
  if (r.id != null && String(r.id) !== '') return String(r.id);
  return '';
}

function formatModifiedAt(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

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

export function ServicesManagement() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingItem, setEditingItem] = useState<ServiceItem | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PageTemplateType | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [serviceRes, catRes] = await Promise.all([
          contentService.getServices(),
          contentService.getServiceCategories(),
        ]);

        const mapped = serviceRes.data.map((s: ApiService) => ({
          id: String(s.id),
          slug: s.slug || '',
          isPublished: s.isPublished ?? (s.status === 'Published' || s.status === 'Active'),
          isFeatured: s.isFeatured ?? false,
          postDate: s.postDate || '',
          modifiedAt: s.modifiedAt || s.updatedAt || '',
          author: s.author || 'Admin',
          categoryId: s.categoryId != null ? String(s.categoryId) : '',
          pageTemplate: toPageTemplate(s),
          images: (s.images || []).map((img) => ({
            id: String(img.id),
            image_id: parseInt(String(img.image_id), 10),
            url: `${IMAGE_BASE}/image/${img.image_id}`,
            alt: '',
            pending: false,
          })),
          content: {
            en: {
              title: s.content?.en?.title || '',
              tags: s.content?.en?.tags || [],
              content: s.content?.en?.content || '',
              excerpt: s.content?.en?.excerpt || '',
            },
            zh_TW: {
              title: s.content?.zh_TW?.title || '',
              tags: s.content?.zh_TW?.tags || [],
              content: s.content?.zh_TW?.content || '',
              excerpt: s.content?.zh_TW?.excerpt || '',
            },
            zh_CN: {
              title: s.content?.zh_CN?.title || '',
              tags: s.content?.zh_CN?.tags || [],
              content: s.content?.zh_CN?.content || '',
              excerpt: s.content?.zh_CN?.excerpt || '',
            },
          },
        }));
        setServices(mapped);
        setCategories(catRes.data || []);
      } catch (error) {
        toast.error('Failed to load services');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const categoryLabel = (id: string) => {
    const c = categories.find((item) => item.id === id);
    return c?.lang_data?.en?.title || c?.title || 'Uncategorized';
  };

  const createNewService = (template: 'standard' | 'grapesjs'): ServiceItem => ({
    id: `service-${Date.now()}`,
    slug: '',
    isPublished: false,
    isFeatured: false,
    postDate: new Date().toISOString().split('T')[0],
    modifiedAt: '',
    author: 'Admin',
    categoryId: categories[0]?.id || '',
    pageTemplate: template,
    images: [],
    content: { en: emptyContent(), zh_TW: emptyContent(), zh_CN: emptyContent() },
  });

  const handleTemplateSelect = (type: PageTemplateType) => {
    setEditingItem(createNewService(type === 'grapesjs' ? 'grapesjs' : 'standard'));
    setSelectedTemplate(type);
    setView('edit');
  };

  useEffect(() => {
    if (!itemId) {
      setView('list');
      setEditingItem(null);
      setSelectedTemplate(null);
      return;
    }
    const found = services.find((s) => s.id === itemId);
    if (found) {
      setEditingItem(JSON.parse(JSON.stringify(found)));
      setView('edit');
      setSelectedTemplate(found.pageTemplate === 'grapesjs' ? 'grapesjs' : null);
    }
  }, [itemId, services]);

  const goToServicesList = () => {
    setView('list');
    setEditingItem(null);
    setSelectedTemplate(null);
    setIsModalOpen(false);
    navigate('/services', { replace: true });
  };

  const handleGrapesJSSave = async (htmlByLang: Record<ContentLang, string>) => {
    if (!editingItem) return;
    const tid = toast.loading('Saving service...');
    try {
      let finalImages = editingItem.images;
      const pendingImages = editingItem.images.filter((img) => img.pending && img.file);
      for (const img of pendingImages) {
        if (img.file) {
          const uploaded = await uploadImage(img.file);
          finalImages = finalImages.map((i) =>
            i.id === img.id
              ? { id: String(uploaded.id), image_id: uploaded.id, url: `${IMAGE_BASE}/image/${uploaded.id}`, alt: i.alt, pending: false }
              : i
          );
        }
      }

      const savedImages = finalImages.map(({ file: _f, pending: _p, ...rest }) => rest);
      const mergedContent: Record<ContentLang, ServiceContent> = {
        en: { ...editingItem.content.en, content: htmlByLang.en },
        zh_TW: { ...editingItem.content.zh_TW, content: htmlByLang.zh_TW },
        zh_CN: { ...editingItem.content.zh_CN, content: htmlByLang.zh_CN },
      };

      const toSave: ServiceItem = {
        ...editingItem,
        images: savedImages,
        content: mergedContent,
        pageTemplate: 'grapesjs',
        modifiedAt: new Date().toISOString(),
      };

      const images_data = savedImages.map((img: GalleryImage, index: number) => ({
        image_id: parseInt(String(img.image_id), 10),
        ordering: index,
      }));

      const content: Record<string, { title: string; content: string; excerpt: string; builder_html: string }> = {};
      (['en', 'zh_TW', 'zh_CN'] as ContentLang[]).forEach((lang) => {
        const c = toSave.content[lang];
        const html = htmlByLang[lang];
        content[lang] = {
          title: c.title,
          content: html,
          excerpt: c.excerpt,
          builder_html: html,
        };
      });

      const apiData = {
        slug: toSave.slug,
        author: toSave.author,
        post_date: toSave.postDate,
        is_published: toSave.isPublished ? 1 : 0,
        featured: toSave.isFeatured ? 1 : 0,
        service_categoryid: toSave.categoryId ? parseInt(toSave.categoryId, 10) : null,
        page_template: 'grapesjs',
        content,
        images_data,
      };

      let savedItem: ServiceItem;
      if (toSave.id.startsWith('service-')) {
        const result = await contentService.createService(apiData as Partial<ApiService>);
        const newId = serviceIdFromCreateResponse(result as unknown);
        if (!newId) throw new Error('No service id returned');
        savedItem = { ...toSave, id: newId };
      } else {
        await contentService.updateService(Number(toSave.id), apiData as Partial<ApiService>);
        savedItem = toSave;
      }

      setServices((prev) => {
        const existing = prev.find((s) => s.id === savedItem.id);
        return existing ? prev.map((s) => (s.id === savedItem.id ? savedItem : s)) : [...prev, savedItem];
      });
      toast.success('Service saved successfully');
      goToServicesList();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save service');
    } finally {
      toast.dismiss(tid);
    }
  };

  const handleSwitchFromGrapesToStandard = (htmlByLang: Record<ContentLang, string>) => {
    setEditingItem((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pageTemplate: 'standard',
        content: {
          en: { ...prev.content.en, content: htmlByLang.en },
          zh_TW: { ...prev.content.zh_TW, content: htmlByLang.zh_TW },
          zh_CN: { ...prev.content.zh_CN, content: htmlByLang.zh_CN },
        },
      };
    });
    setSelectedTemplate(null);
  };

  const handleSave = async () => {
    if (!editingItem) return;
    const tid = toast.loading('Saving...');
    try {
      let finalImages = editingItem.images;
      const pendingImages = editingItem.images.filter((img) => img.pending && img.file);
      for (const img of pendingImages) {
        if (img.file) {
          const uploaded = await uploadImage(img.file);
          finalImages = finalImages.map((i) =>
            i.id === img.id
              ? { id: String(uploaded.id), image_id: uploaded.id, url: `${IMAGE_BASE}/image/${uploaded.id}`, alt: i.alt, pending: false }
              : i
          );
        }
      }

      const savedImages = finalImages.map(({ file: _f, pending: _p, ...rest }) => rest);
      const toSave = { ...editingItem, images: savedImages, modifiedAt: new Date().toISOString() };
      const images_data = savedImages.map((img: GalleryImage, index: number) => ({
        image_id: parseInt(String(img.image_id), 10),
        ordering: index,
      }));

      const apiData = {
        slug: toSave.slug || `service-${Date.now()}`,
        author: toSave.author,
        post_date: toSave.postDate,
        is_published: toSave.isPublished ? 1 : 0,
        featured: toSave.isFeatured ? 1 : 0,
        service_categoryid: toSave.categoryId ? parseInt(toSave.categoryId, 10) : null,
        page_template: toSave.pageTemplate ?? 'standard',
        content: {
          en: { title: toSave.content.en.title, content: toSave.content.en.content, excerpt: toSave.content.en.excerpt },
          zh_TW: { title: toSave.content.zh_TW.title, content: toSave.content.zh_TW.content, excerpt: toSave.content.zh_TW.excerpt },
          zh_CN: { title: toSave.content.zh_CN.title, content: toSave.content.zh_CN.content, excerpt: toSave.content.zh_CN.excerpt },
        },
        images_data,
      };

      let savedItem: ServiceItem;
      if (toSave.id.startsWith('service-')) {
        const result = await contentService.createService(apiData as Partial<ApiService>);
        const newId = serviceIdFromCreateResponse(result as unknown);
        if (!newId) throw new Error('No service id returned');
        savedItem = { ...toSave, id: newId };
      } else {
        await contentService.updateService(Number(toSave.id), apiData as Partial<ApiService>);
        savedItem = toSave;
      }

      setServices((prev) => {
        const existing = prev.find((s) => s.id === savedItem.id);
        return existing ? prev.map((s) => (s.id === savedItem.id ? savedItem : s)) : [...prev, savedItem];
      });
      toast.success('Service saved');
      goToServicesList();
    } catch (error) {
      toast.error('Failed to save service');
    } finally {
      toast.dismiss(tid);
    }
  };

  const togglePublish = async (id: string) => {
    const item = services.find((s) => s.id === id);
    if (!item) return;
    try {
      await contentService.updateService(Number(id), { is_published: item.isPublished ? 0 : 1 });
      setServices((prev) => prev.map((s) => s.id === id ? { ...s, isPublished: !s.isPublished } : s));
    } catch {
      toast.error('Failed to update publish status');
    }
  };

  const toggleFeatured = async (id: string) => {
    const item = services.find((s) => s.id === id);
    if (!item) return;
    try {
      await contentService.updateService(Number(id), { featured: item.isFeatured ? 0 : 1 });
      setServices((prev) => prev.map((s) => s.id === id ? { ...s, isFeatured: !s.isFeatured } : s));
    } catch {
      toast.error('Failed to update featured status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      await contentService.deleteService(Number(id));
      setServices((prev) => prev.filter((s) => s.id !== id));
      toast.success('Service deleted');
    } catch {
      toast.error('Failed to delete service');
    }
  };

  const openEdit = (item: ServiceItem) => navigate(`/services/${item.id}`);

  const filtered = services.filter((s) =>
    (s.content.en.title.toLowerCase().includes(search.toLowerCase()) || s.slug.toLowerCase().includes(search.toLowerCase())) &&
    (filterCategory === '' || s.categoryId === filterCategory)
  );

  if (selectedTemplate === 'grapesjs' && editingItem) {
    return (
      <React.Fragment key={editingItem.id}>
        <GrapesJSEditor
          pageId={editingItem.id}
          initialContent={{
            en: editingItem.content.en.content,
            zh_TW: editingItem.content.zh_TW.content,
            zh_CN: editingItem.content.zh_CN.content,
          }}
          onSave={handleGrapesJSSave}
          onCancel={goToServicesList}
          onSwitchToStandard={handleSwitchFromGrapesToStandard}
        />
      </React.Fragment>
    );
  }

  if (view === 'edit' && editingItem) {
    const update = (field: keyof ServiceItem, value: unknown) =>
      setEditingItem((prev) => prev ? { ...prev, [field]: value } : prev);
    const updateContent = (lang: ContentLang, field: keyof ServiceContent, value: unknown) =>
      setEditingItem((prev) => prev ? { ...prev, content: { ...prev.content, [lang]: { ...prev.content[lang], [field]: value } } } : prev);

    return (
      <div className="px-6 py-6 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          <button type="button" onClick={goToServicesList} className="hover:text-primary flex items-center gap-1 text-left">
            <ChevronLeft className="w-4 h-4" /> Services Management
          </button>
          <span>/</span>
          <span className="text-foreground">{editingItem.content.en.title || 'New Service'}</span>
          <span className="text-xs font-mono text-muted-foreground">· ID {editingItem.id}</span>
        </div>

        <div className="flex items-center justify-between px-6">
          <h1>{editingItem.id.startsWith('service-') ? 'Create Service' : 'Edit Service'}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditingItem((p) => (p ? { ...p, pageTemplate: 'grapesjs' } : p));
                setSelectedTemplate('grapesjs');
              }}
            >
              <Layout className="w-4 h-4 mr-1" />
              Visual Builder
            </Button>
            <Button variant="outline" onClick={goToServicesList}>Cancel</Button>
            <Button onClick={handleSave}>Save Service</Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Service Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Slug / URI</label>
                <Input value={editingItem.slug} onChange={(e) => update('slug', e.target.value)} placeholder="/services/service-slug" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Category</label>
                <select className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background" value={editingItem.categoryId} onChange={(e) => update('categoryId', e.target.value)}>
                  <option value="">Uncategorized</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.lang_data?.en?.title || c.title}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Post Date</label>
                <Input type="date" value={editingItem.postDate} onChange={(e) => update('postDate', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Author</label>
                <Input value={editingItem.author} onChange={(e) => update('author', e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm">Published</label>
                <Switch checked={editingItem.isPublished} onCheckedChange={(v) => update('isPublished', v)} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-500" /> Featured</label>
                <Switch checked={editingItem.isFeatured} onCheckedChange={(v) => update('isFeatured', v)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Image Gallery</CardTitle></CardHeader>
          <CardContent>
            <ImageGallery images={editingItem.images} onChange={(imgs) => update('images', imgs)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" /> Multilingual Content</CardTitle></CardHeader>
          <CardContent>
            <LanguageTabs>
              {(lang) => (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Title</label>
                    <Input value={editingItem.content[lang].title} onChange={(e) => updateContent(lang, 'title', e.target.value)} placeholder="Service title" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Excerpt / Summary</label>
                    <textarea className="w-full h-20 px-3 py-2 border border-border rounded-lg text-sm resize-none outline-none focus:ring-1 focus:ring-ring" value={editingItem.content[lang].excerpt} onChange={(e) => updateContent(lang, 'excerpt', e.target.value)} placeholder="Short excerpt shown in listings..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Tags</label>
                    <TagInput tags={editingItem.content[lang].tags} onChange={(tags) => updateContent(lang, 'tags', tags)} />
                  </div>
                  <RichTextEditor label="Content" value={editingItem.content[lang].content} onChange={(v) => updateContent(lang, 'content', v)} minHeight="240px" />
                </div>
              )}
            </LanguageTabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-6 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1>Services Management</h1>
          <p className="text-muted-foreground text-sm">{services.length} services · {services.filter((s) => s.isPublished).length} published</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}><Plus className="w-4 h-4 mr-1" /> New Service</Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search services..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="h-9 px-3 border border-border rounded-md text-sm bg-background" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.lang_data?.en?.title || c.title}</option>)}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="text-left px-4 py-3 text-muted-foreground text-xs w-20">ID</th>
                <th className="text-left px-4 py-3 text-muted-foreground text-xs">Title (EN)</th>
                <th className="text-left px-4 py-3 text-muted-foreground text-xs">Slug</th>
                <th className="text-left px-4 py-3 text-muted-foreground text-xs">Category</th>
                <th className="text-left px-4 py-3 text-muted-foreground text-xs">Post Date</th>
                <th className="text-left px-4 py-3 text-muted-foreground text-xs">Modified</th>
                <th className="text-center px-4 py-3 text-muted-foreground text-xs">Featured</th>
                <th className="text-center px-4 py-3 text-muted-foreground text-xs">Published</th>
                <th className="text-right px-4 py-3 text-muted-foreground text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs align-top">{item.id}</td>
                  <td className="px-4 py-3">
                    <p>{item.content.en.title || <span className="text-muted-foreground italic">Untitled</span>}</p>
                    <p className="text-xs text-muted-foreground">{item.author}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{item.slug}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">{categoryLabel(item.categoryId)}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{item.postDate}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatModifiedAt(item.modifiedAt)}</td>
                  <td className="px-4 py-3 text-center"><Switch checked={item.isFeatured} onCheckedChange={() => toggleFeatured(item.id)} /></td>
                  <td className="px-4 py-3 text-center"><Switch checked={item.isPublished} onCheckedChange={() => togglePublish(item.id)} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(item)}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="py-12 text-center text-muted-foreground">No services found</div>}
        </CardContent>
      </Card>

      <PageTemplateModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSelectTemplate={handleTemplateSelect}
      />
    </div>
  );
}
