import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Search, ChevronLeft, Eye, Calendar, Globe, Loader2, FolderTree } from 'lucide-react';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { LanguageTabs, ContentLang } from './shared/LanguageTabs';
import { TagInput } from './shared/TagInput';
import { ImageGallery, GalleryImage } from './shared/ImageGallery';
import { RichTextEditor } from './shared/RichTextEditor';
import { PageTemplateModal, PageTemplateType } from './shared/PageTemplateModal';
import { StandardTemplateForm } from './shared/StandardTemplateForm';
import { GrapesJSEditor } from './shared/GrapesJSEditor';
import { ContentTree } from './shared/ContentTree';
import { toast } from 'sonner@2.0.3';
import { contentService } from '../../services/api';

interface TreeNode {
  id: string;
  name: string;
  slug: string;
  isPublished: boolean;
  order?: number;
  children?: TreeNode[];
}

interface PageContent {
  title: string; subtitle: string; tags: string[]; content: string;
  subContent: string; metaTitle: string; metaDescription: string; metaKeywords: string;
}

interface ContentPage {
  id: string; slug: string; isPublished: boolean; inHeader: boolean;
  headerOrder: number | null; parentPage: string | null; inFooter: boolean;
  footerOrder: number | null; footerGroup: string | null;
  order: number;
  images: GalleryImage[]; scheduleDate: string;
  content: Record<ContentLang, PageContent>;
  updatedAt: string;
}

const emptyContent = (): PageContent => ({
  title: '', subtitle: '', tags: [], content: '', subContent: '',
  metaTitle: '', metaDescription: '', metaKeywords: '',
});

function buildTree(pages: ContentPage[]): TreeNode[] {
  const pageMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  pages.forEach((page) => {
    pageMap.set(page.id, {
      id: page.id,
      name: page.content.en.title || page.slug || 'Untitled',
      slug: page.slug,
      isPublished: page.isPublished,
      order: page.order,
      children: [],
    });
  });

  pages.forEach((page) => {
    const node = pageMap.get(page.id)!;
    if (page.parentPage && pageMap.has(page.parentPage)) {
      const parent = pageMap.get(page.parentPage)!;
      parent.children = parent.children || [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  roots.sort((a, b) => (a.order || 0) - (b.order || 0));
  const sortChildren = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => (a.order || 0) - (b.order || 0));
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        sortChildren(node.children);
      }
    });
  };
  sortChildren(roots);

  return roots;
}

export function ContentManagement() {
  const [pages, setPages] = useState<ContentPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingPage, setEditingPage] = useState<ContentPage | null>(null);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PageTemplateType | null>(null);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [createType, setCreateType] = useState<'root' | 'sub'>('root');

  useEffect(() => {
    async function fetchPages() {
      try {
        const res = await contentService.getPages();
        const mapped = res.data.map((p: any) => ({
          id: String(p.id),
          slug: '/' + p.slug,
          isPublished: p.status === 'Published',
          inHeader: false,
          headerOrder: null,
          parentPage: null,
          inFooter: false,
          footerOrder: null,
          footerGroup: null,
          order: p.order || 0,
          images: [],
          scheduleDate: '',
          content: {
            en: { title: p.content.en || p.title, subtitle: '', tags: [], content: p.content.en || '', subContent: '', metaTitle: p.title, metaDescription: '', metaKeywords: '' },
            zh_TW: { title: p.content.zh_TW || p.title, subtitle: '', tags: [], content: p.content.zh_TW || '', subContent: '', metaTitle: p.title, metaDescription: '', metaKeywords: '' },
            zh_CN: { title: p.content.zh_CN || p.title, subtitle: '', tags: [], content: p.content.zh_CN || '', subContent: '', metaTitle: p.title, metaDescription: '', metaKeywords: '' },
          },
          updatedAt: p.updatedAt,
        }));
        setPages(mapped);
      } catch (error) {
        toast.error('Failed to load pages');
      } finally {
        setLoading(false);
      }
    }
    fetchPages();
  }, []);

  const openEdit = (page: ContentPage) => { setEditingPage({ ...page, content: JSON.parse(JSON.stringify(page.content)) }); setView('edit'); setSelectedTemplate(null); };

  const getMaxOrder = (parentId: string | null): number => {
    const siblings = pages.filter(p => p.parentPage === parentId);
    if (siblings.length === 0) return 0;
    return Math.max(...siblings.map(p => p.order || 0));
  };

  const createNewPage = (): ContentPage => ({
    id: `page-${Date.now()}`, slug: '', isPublished: false, inHeader: false,
    headerOrder: null, parentPage: createParentId, inFooter: false, footerOrder: null,
    footerGroup: null, order: getMaxOrder(createParentId) + 1, images: [], scheduleDate: '',
    content: { en: emptyContent(), zh_TW: emptyContent(), zh_CN: emptyContent() },
    updatedAt: new Date().toISOString().split('T')[0],
  });

  const openCreateStandard = () => {
    setEditingPage(createNewPage());
    setView('edit');
    setSelectedTemplate('standard');
  };

  const openCreateGrapesJS = () => {
    setEditingPage(createNewPage());
    setView('edit');
    setSelectedTemplate('grapesjs');
  };

  const handleTemplateSelect = (type: PageTemplateType) => {
    const newPage = createNewPage();
    newPage.parentPage = createParentId;
    setEditingPage(newPage);
    setSelectedTemplate(type);
    if (type === 'standard') {
      setView('edit');
    } else {
      setView('edit');
    }
  };

  const handleGrapesJSSave = (content: Record<ContentLang, string>) => {
    if (!editingPage) return;
    const toSave = {
      ...editingPage,
      content: {
        en: { ...editingPage.content.en, content: content.en },
        zh_TW: { ...editingPage.content.zh_TW, content: content.zh_TW },
        zh_CN: { ...editingPage.content.zh_CN, content: content.zh_CN },
      },
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setPages((prev) => {
      const existing = prev.find((p) => p.id === toSave.id);
      return existing ? prev.map((p) => (p.id === toSave.id ? toSave : p)) : [...prev, toSave];
    });
    toast.success('Page saved successfully');
    setView('list');
    setSelectedTemplate(null);
  };

  const handleCancelEdit = () => {
    setView('list');
    setSelectedTemplate(null);
  };

  const handleTreeCreate = (parentId: string | null, type: 'root' | 'sub') => {
    setCreateParentId(parentId);
    setCreateType(type);
    setIsModalOpen(true);
  };

  const handleTreeEdit = (node: TreeNode) => {
    const page = pages.find((p) => p.id === node.id);
    if (page) {
      openEdit(page);
    }
  };

  const handleTreeDelete = (nodeId: string) => {
    handleDelete(nodeId);
  };

  const handleTreeMove = (dragIds: string[], parentId: string | null, index: number) => {
    setPages((prev) => {
      const updated = [...prev];
      
      dragIds.forEach((dragId) => {
        const dragPage = updated.find(p => p.id === dragId);
        if (!dragPage) return;
        
        const oldParentId = dragPage.parentPage;
        const oldSiblings = updated.filter(p => p.parentPage === oldParentId && p.id !== dragId);
        oldSiblings.sort((a, b) => (a.order || 0) - (b.order || 0));
        oldSiblings.forEach((sibling, i) => {
          const sibIndex = updated.findIndex(p => p.id === sibling.id);
          if (sibIndex !== -1) {
            updated[sibIndex] = { ...updated[sibIndex], order: i };
          }
        });
        
        const newSiblings = updated.filter(p => p.parentPage === parentId && p.id !== dragId);
        newSiblings.sort((a, b) => (a.order || 0) - (b.order || 0));
        const insertIndex = Math.min(index, newSiblings.length);
        newSiblings.splice(insertIndex, 0, dragPage);
        newSiblings.forEach((sibling, i) => {
          const sibIndex = updated.findIndex(p => p.id === sibling.id);
          if (sibIndex !== -1) {
            updated[sibIndex] = { ...updated[sibIndex], order: i };
          }
        });
        
        const dragPageIndex = updated.findIndex(p => p.id === dragId);
        if (dragPageIndex !== -1) {
          updated[dragPageIndex] = { ...updated[dragPageIndex], parentPage: parentId };
        }
      });
      
      return updated;
    });
    toast.success('Page reordered successfully');
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

  const treeData = useMemo(() => buildTree(filtered), [filtered]);

  if (selectedTemplate === 'grapesjs' && editingPage) {
    return (
      <GrapesJSEditor
        initialContent={{
          en: editingPage.content.en.content,
          zh_TW: editingPage.content.zh_TW.content,
          zh_CN: editingPage.content.zh_CN.content,
        }}
        onSave={handleGrapesJSSave}
        onCancel={handleCancelEdit}
      />
    );
  }

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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Page Settings</CardTitle>
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground">Published</label>
              <Switch checked={editingPage.isPublished} onCheckedChange={(v) => update('isPublished', v)} />
            </div>
          </CardHeader>
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
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Title</label>
                    <Input value={editingPage.content[lang].title} onChange={(e) => updateContent(lang, 'title', e.target.value)} placeholder="Page title" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Subtitle</label>
                      <Input value={editingPage.content[lang].subtitle} onChange={(e) => updateContent(lang, 'subtitle', e.target.value)} placeholder="Page subtitle" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Tags</label>
                      <TagInput tags={editingPage.content[lang].tags} onChange={(tags) => updateContent(lang, 'tags', tags)} />
                    </div>
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
          <h1>Content Management</h1>
          <p className="text-muted-foreground text-sm">{pages.length} pages total</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}><Plus className="w-4 h-4 mr-1" /> Add Page</Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search pages..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FolderTree className="w-4 h-4" /> Page List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ContentTree
            data={treeData}
            onCreate={handleTreeCreate}
            onEdit={handleTreeEdit}
            onDelete={handleTreeDelete}
            onMove={handleTreeMove}
            loading={loading}
          />
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