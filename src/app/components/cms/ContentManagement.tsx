import React, { useState } from 'react';
import { Plus, Edit, Trash2, Search, ChevronLeft, Eye, Calendar, Globe } from 'lucide-react';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { LanguageTabs, ContentLang } from './shared/LanguageTabs';
import { TagInput } from './shared/TagInput';
import { ImageGallery, GalleryImage } from './shared/ImageGallery';
import { RichTextEditor } from './shared/RichTextEditor';
import { toast } from 'sonner@2.0.3';

interface PageContent {
  title: string; subtitle: string; tags: string[]; content: string;
  subContent: string; metaTitle: string; metaDescription: string; metaKeywords: string;
}

interface ContentPage {
  id: string; slug: string; isPublished: boolean; inHeader: boolean;
  headerOrder: number | null; parentPage: string | null; inFooter: boolean;
  footerOrder: number | null; footerGroup: string | null;
  images: GalleryImage[]; scheduleDate: string;
  content: Record<ContentLang, PageContent>;
  updatedAt: string;
}

const emptyContent = (): PageContent => ({
  title: '', subtitle: '', tags: [], content: '', subContent: '',
  metaTitle: '', metaDescription: '', metaKeywords: '',
});

const INITIAL_PAGES: ContentPage[] = [
  {
    id: '1', slug: '/about-us', isPublished: true, inHeader: true,
    headerOrder: 2, parentPage: null, inFooter: true, footerOrder: 1,
    footerGroup: 'Company', images: [], scheduleDate: '',
    content: {
      en: { title: 'About Us', subtitle: 'Our Story & Values', tags: ['company', 'team'], content: 'We are a leading retailer...', subContent: '', metaTitle: 'About Us | ShopCo', metaDescription: 'Learn about our company.', metaKeywords: 'about, company, team' },
      zh_TW: { title: '關於我們', subtitle: '我們的故事與價值觀', tags: [], content: '我們是領先的零售商...', subContent: '', metaTitle: '關於我們 | ShopCo', metaDescription: '了解我們的公司。', metaKeywords: '關於, 公司, 團隊' },
      zh_CN: { title: '关于我们', subtitle: '我们的故事与价值观', tags: [], content: '我们是领先的零售商...', subContent: '', metaTitle: '关于我们 | ShopCo', metaDescription: '了解我们的公司。', metaKeywords: '关于, 公司, 团队' },
    },
    updatedAt: '2026-03-18',
  },
  {
    id: '2', slug: '/contact', isPublished: true, inHeader: true,
    headerOrder: 3, parentPage: null, inFooter: true, footerOrder: 2,
    footerGroup: 'Company', images: [], scheduleDate: '',
    content: {
      en: { title: 'Contact Us', subtitle: 'Get in touch', tags: ['contact'], content: 'Reach us at...', subContent: '', metaTitle: 'Contact | ShopCo', metaDescription: 'Contact us for support.', metaKeywords: 'contact, support, help' },
      zh_TW: { title: '聯絡我們', subtitle: '與我們聯繫', tags: [], content: '', subContent: '', metaTitle: '', metaDescription: '', metaKeywords: '' },
      zh_CN: { title: '联系我们', subtitle: '与我们联系', tags: [], content: '', subContent: '', metaTitle: '', metaDescription: '', metaKeywords: '' },
    },
    updatedAt: '2026-03-15',
  },
  {
    id: '3', slug: '/faq', isPublished: false, inHeader: false,
    headerOrder: null, parentPage: null, inFooter: true, footerOrder: 3,
    footerGroup: 'Support', images: [], scheduleDate: '2026-04-01',
    content: {
      en: { title: 'FAQ', subtitle: 'Frequently Asked Questions', tags: ['faq', 'help'], content: '', subContent: '', metaTitle: 'FAQ | ShopCo', metaDescription: 'Answers to common questions.', metaKeywords: 'faq, questions, help' },
      zh_TW: { title: '常見問題', subtitle: '', tags: [], content: '', subContent: '', metaTitle: '', metaDescription: '', metaKeywords: '' },
      zh_CN: { title: '常见问题', subtitle: '', tags: [], content: '', subContent: '', metaTitle: '', metaDescription: '', metaKeywords: '' },
    },
    updatedAt: '2026-03-10',
  },
];

export function ContentManagement() {
  const [pages, setPages] = useState<ContentPage[]>(INITIAL_PAGES);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingPage, setEditingPage] = useState<ContentPage | null>(null);
  const [search, setSearch] = useState('');

  const openEdit = (page: ContentPage) => { setEditingPage({ ...page, content: JSON.parse(JSON.stringify(page.content)) }); setView('edit'); };
  const openCreate = () => {
    const newPage: ContentPage = {
      id: `page-${Date.now()}`, slug: '', isPublished: false, inHeader: false,
      headerOrder: null, parentPage: null, inFooter: false, footerOrder: null,
      footerGroup: null, images: [], scheduleDate: '',
      content: { en: emptyContent(), zh_TW: emptyContent(), zh_CN: emptyContent() },
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setEditingPage(newPage); setView('edit');
  };

  const handleSave = () => {
    if (!editingPage) return;
    const pendingCount = editingPage.images.filter((img) => img.pending).length;
    // Strip file/pending refs → simulates server upload completing
    const savedImages = editingPage.images.map(({ file: _f, pending: _p, ...rest }) => rest);
    const toSave = { ...editingPage, images: savedImages, updatedAt: new Date().toISOString().split('T')[0] };

    const commit = () => {
      setPages((prev) => {
        const existing = prev.find((p) => p.id === toSave.id);
        return existing ? prev.map((p) => (p.id === toSave.id ? toSave : p)) : [...prev, toSave];
      });
      toast.success('Page saved successfully');
      setView('list');
    };

    if (pendingCount > 0) {
      const tid = toast.loading(`Uploading ${pendingCount} image${pendingCount > 1 ? 's' : ''}…`);
      setTimeout(() => { toast.dismiss(tid); commit(); }, 900);
    } else {
      commit();
    }
  };

  const handleDelete = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
    toast.success('Page deleted');
  };

  const togglePublish = (id: string) => {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, isPublished: !p.isPublished } : p)));
  };

  const filtered = pages.filter((p) =>
    p.slug.toLowerCase().includes(search.toLowerCase()) ||
    p.content.en.title.toLowerCase().includes(search.toLowerCase())
  );

  if (view === 'edit' && editingPage) {
    const update = (field: keyof ContentPage, value: unknown) =>
      setEditingPage((prev) => prev ? { ...prev, [field]: value } : prev);
    const updateContent = (lang: ContentLang, field: keyof PageContent, value: unknown) =>
      setEditingPage((prev) => prev ? { ...prev, content: { ...prev.content, [lang]: { ...prev.content[lang], [field]: value } } } : prev);

    return (
      <div className="px-6 py-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => setView('list')} className="hover:text-primary flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Content Management
          </button>
          <span>/</span>
          <span className="text-foreground">{editingPage.content.en.title || 'New Page'}</span>
        </div>

        <div className="flex items-center justify-between">
          <h1>{editingPage.id.startsWith('page-') ? 'Create Page' : 'Edit Page'}</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setView('list')}>Cancel</Button>
            <Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-1" /> Preview</Button>
            <Button onClick={handleSave}>Save Page</Button>
          </div>
        </div>

        {/* General Settings */}
        <Card>
          <CardHeader><CardTitle className="text-base">Page Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Slug / URI *</label>
                <Input value={editingPage.slug} onChange={(e) => update('slug', e.target.value)} placeholder="/page-slug" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Parent Page</label>
                <select className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background" value={editingPage.parentPage || ''} onChange={(e) => update('parentPage', e.target.value || null)}>
                  <option value="">— None —</option>
                  {pages.filter((p) => p.id !== editingPage.id).map((p) => (
                    <option key={p.id} value={p.id}>{p.content.en.title || p.slug}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm">Published</label>
                  <Switch checked={editingPage.isPublished} onCheckedChange={(v) => update('isPublished', v)} />
                </div>
                {!editingPage.isPublished && (
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Schedule Publish</label>
                    <Input type="datetime-local" value={editingPage.scheduleDate} onChange={(e) => update('scheduleDate', e.target.value)} />
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm">Show in Header</label>
                  <Switch checked={editingPage.inHeader} onCheckedChange={(v) => update('inHeader', v)} />
                </div>
                {editingPage.inHeader && (
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Header Order</label>
                    <Input type="number" min={1} value={editingPage.headerOrder ?? ''} onChange={(e) => update('headerOrder', parseInt(e.target.value) || null)} placeholder="e.g. 1" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm">Show in Footer</label>
                  <Switch checked={editingPage.inFooter} onCheckedChange={(v) => update('inFooter', v)} />
                </div>
                {editingPage.inFooter && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Footer Group</label>
                      <Input value={editingPage.footerGroup ?? ''} onChange={(e) => update('footerGroup', e.target.value || null)} placeholder="e.g. Company" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Footer Order</label>
                      <Input type="number" min={1} value={editingPage.footerOrder ?? ''} onChange={(e) => update('footerOrder', parseInt(e.target.value) || null)} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Image Gallery */}
        <Card>
          <CardHeader><CardTitle className="text-base">Image Gallery</CardTitle></CardHeader>
          <CardContent>
            <ImageGallery images={editingPage.images} onChange={(imgs) => update('images', imgs)} />
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Title</label>
                      <Input value={editingPage.content[lang].title} onChange={(e) => updateContent(lang, 'title', e.target.value)} placeholder="Page title" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Subtitle</label>
                      <Input value={editingPage.content[lang].subtitle} onChange={(e) => updateContent(lang, 'subtitle', e.target.value)} placeholder="Page subtitle" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Tags</label>
                    <TagInput tags={editingPage.content[lang].tags} onChange={(tags) => updateContent(lang, 'tags', tags)} />
                  </div>
                  <RichTextEditor label="Main Content" value={editingPage.content[lang].content} onChange={(v) => updateContent(lang, 'content', v)} minHeight="180px" />
                  <RichTextEditor label="Sub Content" value={editingPage.content[lang].subContent} onChange={(v) => updateContent(lang, 'subContent', v)} minHeight="120px" />
                  <div className="border-t border-border pt-4 space-y-3">
                    <p className="text-sm text-muted-foreground">SEO / Meta</p>
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Meta Title</label>
                      <Input value={editingPage.content[lang].metaTitle} onChange={(e) => updateContent(lang, 'metaTitle', e.target.value)} placeholder="Meta title (60 chars recommended)" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Meta Description</label>
                      <textarea className="w-full h-20 px-3 py-2 border border-border rounded-lg text-sm resize-none outline-none focus:ring-1 focus:ring-ring" value={editingPage.content[lang].metaDescription} onChange={(e) => updateContent(lang, 'metaDescription', e.target.value)} placeholder="Meta description (160 chars recommended)" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Meta Keywords</label>
                      <Input value={editingPage.content[lang].metaKeywords} onChange={(e) => updateContent(lang, 'metaKeywords', e.target.value)} placeholder="keyword1, keyword2, keyword3" />
                    </div>
                    {/* SEO Preview */}
                    {editingPage.content[lang].metaTitle && (
                      <div className="p-3 bg-muted rounded-lg text-sm">
                        <p className="text-xs text-muted-foreground mb-1">Search Preview</p>
                        <p className="text-blue-600">{editingPage.content[lang].metaTitle}</p>
                        <p className="text-green-700 text-xs">shopco.com{editingPage.slug}</p>
                        <p className="text-muted-foreground text-xs">{editingPage.content[lang].metaDescription}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </LanguageTabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1>Content Management</h1>
          <p className="text-muted-foreground text-sm">{pages.length} pages total</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> New Page</Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search pages..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="text-left px-4 py-3 text-muted-foreground text-xs">Title (EN)</th>
                <th className="text-left px-4 py-3 text-muted-foreground text-xs">Slug</th>
                <th className="text-center px-4 py-3 text-muted-foreground text-xs">Published</th>
                <th className="text-center px-4 py-3 text-muted-foreground text-xs">In Header</th>
                <th className="text-center px-4 py-3 text-muted-foreground text-xs">Header Order</th>
                <th className="text-left px-4 py-3 text-muted-foreground text-xs">Footer Group</th>
                <th className="text-left px-4 py-3 text-muted-foreground text-xs">Updated</th>
                <th className="text-right px-4 py-3 text-muted-foreground text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((page) => (
                <tr key={page.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p>{page.content.en.title || <span className="text-muted-foreground italic">Untitled</span>}</p>
                    {page.scheduleDate && !page.isPublished && (
                      <p className="text-xs text-amber-600 flex items-center gap-1"><Calendar className="w-3 h-3" /> Scheduled: {page.scheduleDate.split('T')[0]}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{page.slug}</td>
                  <td className="px-4 py-3 text-center">
                    <Switch checked={page.isPublished} onCheckedChange={() => togglePublish(page.id)} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {page.inHeader ? <span className="text-green-600 text-xs">Yes</span> : <span className="text-muted-foreground text-xs">No</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{page.headerOrder ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{page.footerGroup ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{page.updatedAt}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(page)}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(page.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">No pages found</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}