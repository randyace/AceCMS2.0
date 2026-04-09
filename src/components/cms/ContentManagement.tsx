import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Search, ChevronLeft, Eye, Calendar, Globe, Loader2, FolderTree } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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

const API_BASE = 'https://api2.acedemos.com/api';
const IMAGE_BASE = 'https://api2.acedemos.com';

async function fetchDocuments() {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

async function fetchDocument(id: number) {
  const res = await fetch(`${API_BASE}/documents/${id}`);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

async function createDocument(data: any) {
  const res = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create');
  return res.json();
}

async function updateDocument(id: number, data: any) {
  const res = await fetch(`${API_BASE}/documents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update');
  return res.json();
}

async function deleteDocument(id: number) {
  const res = await fetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete');
  return res.json();
}

async function uploadImage(file: File): Promise<{ id: number; url: string }> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const res = await fetch(`${API_BASE}/upload/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64 }),
  });
  if (!res.ok) throw new Error('Failed to upload image');
  const result = await res.json();
  return result.data;
}

interface TreeNode {
  id: string;
  name: string;
  slug: string;
  isPublished: boolean;
  inHeader: boolean;
  inFooter: boolean;
  updatedAt?: string;
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
      inHeader: page.inHeader,
      inFooter: page.inFooter,
      updatedAt: page.updatedAt,
      order: page.order,
      children: [],
    });
  });

  pages.forEach((page) => {
    const node = pageMap.get(page.id)!;
    if (page.parentPage && page.parentPage !== '0' && pageMap.has(page.parentPage)) {
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
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [pages, setPages] = useState<ContentPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingPage, setEditingPage] = useState<ContentPage | null>(null);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PageTemplateType | null>(null);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [createType, setCreateType] = useState<'root' | 'sub'>('root');
  const [orderingChanged, setOrderingChanged] = useState(false);

  useEffect(() => {
    async function fetchPages() {
      try {
        const res = await fetchDocuments();
        const normalizeParentId = (raw: unknown): string | null => {
          if (raw === null || raw === undefined) return null;
          const s = String(raw);
          if (s === '' || s === '0') return null;
          return s;
        };
        const mapped = (res.data || []).map((p: any) => ({
          id: String(p.id),
          slug: '/' + p.slug,
          // Prefer the camelCase values returned by the API (`isPublished`, `inHeader`, ...)
          // but fall back to snake_case for backwards compatibility.
          isPublished: Boolean(p.isPublished ?? p.is_published),
          inHeader: Boolean(p.inHeader ?? p.in_header),
          headerOrder: null,
          parentPage: normalizeParentId(p.parent_menuid ?? p.parentMenuId ?? p.parentPage),
          inFooter: Boolean(p.inFooter ?? p.in_footer),
          footerOrder: p.footer_ordering ?? p.footerOrdering ?? null,
          footerGroup: normalizeParentId(p.footer_group_id ?? p.footerGroupId ?? p.footerGroup),
          order: Number(p.ordering ?? p.order ?? 0),
          images: (p.images || []).map((img: any) => ({
            id: String(img.id),
            image_id: parseInt(img.image_id),
            url: `${IMAGE_BASE}/image/${img.image_id}`,
            alt: '',
            pending: false,
          })),
          scheduleDate: '',
          content: {
            en: { 
              title: p.lang_data?.en?.title || p.content?.en?.title || '', 
              subtitle: p.lang_data?.en?.subtitle || p.content?.en?.subtitle || '', 
              tags: [], 
              content: p.lang_data?.en?.content || p.content?.en?.content || '', 
              subContent: p.lang_data?.en?.subcontent || p.content?.en?.subcontent || '', 
              metaTitle: p.lang_data?.en?.meta_title || p.content?.en?.meta_title || '', 
              metaDescription: p.lang_data?.en?.meta_description || p.content?.en?.meta_description || '', 
              metaKeywords: p.lang_data?.en?.meta_keywords || p.content?.en?.meta_keywords || '' 
            },
            zh_TW: { 
              title: p.lang_data?.zh_TW?.title || p.content?.zh_TW?.title || '', 
              subtitle: p.lang_data?.zh_TW?.subtitle || p.content?.zh_TW?.subtitle || '', 
              tags: [], 
              content: p.lang_data?.zh_TW?.content || p.content?.zh_TW?.content || '', 
              subContent: p.lang_data?.zh_TW?.subcontent || p.content?.zh_TW?.subcontent || '', 
              metaTitle: p.lang_data?.zh_TW?.meta_title || p.content?.zh_TW?.meta_title || '', 
              metaDescription: p.lang_data?.zh_TW?.meta_description || p.content?.zh_TW?.meta_description || '', 
              metaKeywords: p.lang_data?.zh_TW?.meta_keywords || p.content?.zh_TW?.meta_keywords || '' 
            },
            zh_CN: { 
              title: p.lang_data?.zh_CN?.title || p.content?.zh_CN?.title || '', 
              subtitle: p.lang_data?.zh_CN?.subtitle || p.content?.zh_CN?.subtitle || '', 
              tags: [], 
              content: p.lang_data?.zh_CN?.content || p.content?.zh_CN?.content || '', 
              subContent: p.lang_data?.zh_CN?.subcontent || p.content?.zh_CN?.subcontent || '', 
              metaTitle: p.lang_data?.zh_CN?.meta_title || p.content?.zh_CN?.meta_title || '', 
              metaDescription: p.lang_data?.zh_CN?.meta_description || p.content?.zh_CN?.meta_description || '', 
              metaKeywords: p.lang_data?.zh_CN?.meta_keywords || p.content?.zh_CN?.meta_keywords || '' 
            },
          },
          updatedAt: p.modifiedAt || p.updatedAt || '',
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

  useEffect(() => {
    if (!itemId) {
      setView('list');
      setEditingPage(null);
      setSelectedTemplate(null);
      return;
    }
    const found = pages.find((p) => p.id === itemId);
    if (found) {
      setEditingPage({ ...found, content: JSON.parse(JSON.stringify(found.content)) });
      setView('edit');
      setSelectedTemplate(null);
    }
  }, [itemId, pages]);

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
    navigate('/content');
    setSelectedTemplate(null);
  };

  const handleCancelEdit = () => {
    navigate('/content');
    setSelectedTemplate(null);
  };

  const handleTreeCreate = (parentId: string | null, type: 'root' | 'sub') => {
    setCreateParentId(parentId);
    setCreateType(type);
    setIsModalOpen(true);
  };

  const handleTreeEdit = (node: { id: string }) => {
    const page = pages.find((p) => p.id === node.id);
    if (page) {
      navigate(`/content/${page.id}`);
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
    setOrderingChanged(true);
  };

  const handleSaveOrdering = async () => {
    const tid = toast.loading('Saving ordering...');
    try {
      for (const page of pages) {
        if (!page.id.startsWith('page-')) {
          const updateData = {
            ordering: page.order ?? 0,
            parent_menuid: page.parentPage ? parseInt(page.parentPage) : 0,
          };
          console.log('Updating page', page.id, updateData);
          const res = await fetch(`${API_BASE}/documents/${parseInt(page.id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
          });
          if (!res.ok) {
            const err = await res.text();
            console.error('Failed to update page', page.id, err);
            throw new Error('Failed to update page ' + page.id);
          }
        }
      }
      setOrderingChanged(false);
      toast.success('Ordering saved successfully');
      const res = await fetchDocuments();
      const normalizeParentId = (raw: unknown): string | null => {
        if (raw === null || raw === undefined) return null;
        const s = String(raw);
        if (s === '' || s === '0') return null;
        return s;
      };
      const mapped = (res.data || []).map((p: any) => ({
        id: String(p.id),
        slug: '/' + p.slug,
        isPublished: Boolean(p.isPublished ?? p.is_published),
        inHeader: Boolean(p.inHeader ?? p.in_header),
        headerOrder: null,
        parentPage: normalizeParentId(p.parent_menuid ?? p.parentMenuId ?? p.parentPage),
        inFooter: Boolean(p.inFooter ?? p.in_footer),
        footerOrder: p.footer_ordering ?? p.footerOrdering ?? null,
        footerGroup: normalizeParentId(p.footer_group_id ?? p.footerGroupId ?? p.footerGroup),
        order: Number(p.ordering ?? p.order ?? 0),
        images: (p.images || []).map((img: any) => ({
          id: String(img.id),
          image_id: parseInt(img.image_id),
          url: `${IMAGE_BASE}/image/${img.image_id}`,
          alt: '',
          pending: false,
        })),
        scheduleDate: '',
        content: {
          en: { title: p.lang_data?.en?.title || p.content?.en?.title || '', subtitle: p.lang_data?.en?.subtitle || p.content?.en?.subtitle || '', tags: [], content: p.lang_data?.en?.content || p.content?.en?.content || '', subContent: p.lang_data?.en?.subcontent || p.content?.en?.subcontent || '', metaTitle: p.lang_data?.en?.meta_title || p.content?.en?.meta_title || '', metaDescription: p.lang_data?.en?.meta_description || p.content?.en?.meta_description || '', metaKeywords: p.lang_data?.en?.meta_keywords || p.content?.en?.meta_keywords || '' },
          zh_TW: { title: p.lang_data?.zh_TW?.title || p.content?.zh_TW?.title || '', subtitle: p.lang_data?.zh_TW?.subtitle || p.content?.zh_TW?.subtitle || '', tags: [], content: p.lang_data?.zh_TW?.content || p.content?.zh_TW?.content || '', subContent: p.lang_data?.zh_TW?.subcontent || p.content?.zh_TW?.subcontent || '', metaTitle: p.lang_data?.zh_TW?.meta_title || p.content?.zh_TW?.meta_title || '', metaDescription: p.lang_data?.zh_TW?.meta_description || p.content?.zh_TW?.meta_description || '', metaKeywords: p.lang_data?.zh_TW?.meta_keywords || p.content?.zh_TW?.meta_keywords || '' },
          zh_CN: { title: p.lang_data?.zh_CN?.title || p.content?.zh_CN?.title || '', subtitle: p.lang_data?.zh_CN?.subtitle || p.content?.zh_CN?.subtitle || '', tags: [], content: p.lang_data?.zh_CN?.content || p.content?.zh_CN?.content || '', subContent: p.lang_data?.zh_CN?.subcontent || p.content?.zh_CN?.subcontent || '', metaTitle: p.lang_data?.zh_CN?.meta_title || p.content?.zh_CN?.meta_title || '', metaDescription: p.lang_data?.zh_CN?.meta_description || p.content?.zh_CN?.meta_description || '', metaKeywords: p.lang_data?.zh_CN?.meta_keywords || p.content?.zh_CN?.meta_keywords || '' },
        },
        updatedAt: p.modifiedAt || p.updatedAt || '',
      }));
      setPages(mapped);
    } catch (error) {
      toast.error('Failed to save ordering');
      console.error(error);
    } finally {
      toast.dismiss(tid);
    }
  };

  const handleSave = async () => {
    if (!editingPage) return;

    const tid = toast.loading('Saving...');

    try {
      let finalImages = editingPage.images;
      const pendingImages = editingPage.images.filter((img) => img.pending && img.file);
      
      if (pendingImages.length > 0) {
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
      }

      const savedImages = finalImages.map(({ file: _f, pending: _p, ...rest }) => rest);
      const toSave = { ...editingPage, images: savedImages, updatedAt: new Date().toISOString().split('T')[0] };

      const lang_data: Record<string, any> = {};
      for (const [lang, langContent] of Object.entries(toSave.content)) {
        lang_data[lang] = {
          title: langContent.title,
          subtitle: langContent.subtitle,
          content: langContent.content,
          subcontent: langContent.subContent,
          meta_title: langContent.metaTitle,
          meta_description: langContent.metaDescription,
          meta_keywords: langContent.metaKeywords,
        };
      }

      const images_data = savedImages.map((img: any, index: number) => ({
        image_id: parseInt(img.image_id),
        ordering: index,
      }));

      const apiData = {
        slug: toSave.slug.replace(/^\//, ''),
        parent_menuid: toSave.parentPage ? parseInt(toSave.parentPage) : 0,
        footer_group_id: toSave.footerGroup ? parseInt(toSave.footerGroup) : 0,
        is_published: toSave.isPublished ? 1 : 0,
        in_header: toSave.inHeader ? 1 : 0,
        in_footer: toSave.inFooter ? 1 : 0,
        ordering: toSave.order,
        footer_ordering: toSave.footerOrder,
        lang_data,
        images_data,
      };

      let savedDoc;
      if (toSave.id.startsWith('page-')) {
        const result = await createDocument(apiData);
        savedDoc = { ...toSave, id: String(result.id) };
      } else {
        await updateDocument(parseInt(toSave.id), apiData);
        savedDoc = toSave;
      }

      setPages((prev) => {
        const existing = prev.find((p) => p.id === savedDoc.id);
        return existing ? prev.map((p) => (p.id === savedDoc.id ? savedDoc : p)) : [...prev, savedDoc];
      });
      toast.success('Page saved successfully');
      navigate('/content');
    } catch (error) {
      toast.error('Failed to save page');
      console.error(error);
    } finally {
      toast.dismiss(tid);
    }
  };

  const handleDelete = async (id: string) => {
    if (id.startsWith('page-')) {
      setPages((prev) => prev.filter((p) => p.id !== id));
      toast.success('Page deleted');
    } else {
      try {
        await deleteDocument(parseInt(id));
        setPages((prev) => prev.filter((p) => p.id !== id));
        toast.success('Page deleted');
      } catch (error) {
        toast.error('Failed to delete page');
      }
    }
  };

  const togglePageFlag = async (id: string, field: 'isPublished' | 'inHeader' | 'inFooter') => {
    const page = pages.find((p) => p.id === id);
    if (!page) return;
    const nextValue = !page[field];

    if (id.startsWith('page-')) {
      setPages((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: nextValue } : p)));
    } else {
      try {
        const apiFieldMap = {
          isPublished: 'is_published',
          inHeader: 'in_header',
          inFooter: 'in_footer',
        } as const;
        await updateDocument(parseInt(id), { [apiFieldMap[field]]: nextValue ? 1 : 0 });
        setPages((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: nextValue } : p)));
      } catch (error) {
        toast.error(`Failed to update ${field}`);
      }
    }
  };

  const handleTogglePublished = (nodeId: string) => togglePageFlag(nodeId, 'isPublished');
  const handleToggleHeader = (nodeId: string) => togglePageFlag(nodeId, 'inHeader');
  const handleToggleFooter = (nodeId: string) => togglePageFlag(nodeId, 'inFooter');

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
          <Link to="/content" className="hover:text-primary flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Content Management
          </Link>
          <span>/</span>
          <span className="text-foreground">{editingPage.content.en.title || 'New Page'}</span>
        </div>

        <div className="flex items-center justify-between">
          <h1>{editingPage.id.startsWith('page-') ? 'Create Page' : 'Edit Page'}</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/content')}>Cancel</Button>
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
        <div className="flex gap-2">
          {orderingChanged && (
            <Button variant="outline" onClick={handleSaveOrdering}>
              Save Changes
            </Button>
          )}
          <Button onClick={() => setIsModalOpen(true)}><Plus className="w-4 h-4 mr-1" /> Add Page</Button>
        </div>
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
            onTogglePublished={handleTogglePublished}
            onToggleHeader={handleToggleHeader}
            onToggleFooter={handleToggleFooter}
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