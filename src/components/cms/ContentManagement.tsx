import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Search, ChevronLeft, Eye, Calendar, Globe, Loader2, FolderTree, Layout } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { LanguageTabs, ContentLang } from './shared/LanguageTabs';
import { TagInput } from './shared/TagInput';
import { ImageGallery, GalleryImage } from './shared/ImageGallery';
import { RichTextEditor } from './shared/RichTextEditor';
import { PageTemplateModal, PageTemplateType } from './shared/PageTemplateModal';
import { StandardTemplateForm } from './shared/StandardTemplateForm';
import { GrapesJSEditor } from './shared/GrapesJSEditor';
import { ContentTree } from './shared/ContentTree';
import { toast } from 'sonner@2.0.3';
import ContentManagementView from '../figma-ui/ContentManagementView';
import { buildContainerContract } from '../containerContracts';

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

async function readJsonResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function apiErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const o = body as Record<string, unknown>;
    const m = o.message ?? o.error;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return fallback;
}

function documentIdFromCreateResponse(result: unknown): string {
  const r = result as Record<string, unknown>;
  const nested = r.data;
  if (nested && typeof nested === 'object' && nested !== null && 'id' in nested) {
    const v = (nested as { id: unknown }).id;
    if (v != null && String(v) !== '') return String(v);
  }
  if (r.insertId != null && String(r.insertId) !== '') return String(r.insertId);
  if (r.id != null && String(r.id) !== '') return String(r.id);
  return '';
}

function buildImagesData(savedImages: GalleryImage[]) {
  return savedImages
    .map((img, index) => ({
      image_id: parseInt(String((img as { image_id?: unknown }).image_id), 10),
      ordering: index,
    }))
    .filter((row) => Number.isFinite(row.image_id) && row.image_id > 0);
}

async function createDocument(data: any) {
  const res = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await readJsonResponse(res);
  if (!res.ok) throw new Error(apiErrorMessage(body, 'Failed to create'));
  return body;
}

async function updateDocument(id: number, data: any) {
  const res = await fetch(`${API_BASE}/documents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await readJsonResponse(res);
  if (!res.ok) throw new Error(apiErrorMessage(body, 'Failed to update'));
  return body;
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
  pageTemplate: 'standard' | 'grapesjs';
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
          pageTemplate: p.pageTemplate === 'grapesjs' || p.page_template === 'grapesjs' ? 'grapesjs' : 'standard',
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
      setSelectedTemplate(found.pageTemplate === 'grapesjs' ? 'grapesjs' : null);
    }
  }, [itemId, pages]);

  /** Same-route navigation does not remount; reset local edit state explicitly (e.g. create page on /content). */
  const goToContentList = () => {
    setView('list');
    setEditingPage(null);
    setSelectedTemplate(null);
    setIsModalOpen(false);
    navigate('/content', { replace: true });
  };

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
    pageTemplate: 'standard',
  });

  const openCreateStandard = () => {
    setEditingPage(createNewPage());
    setView('edit');
    setSelectedTemplate('standard');
  };

  const openCreateGrapesJS = () => {
    const p = createNewPage();
    p.pageTemplate = 'grapesjs';
    setEditingPage(p);
    setView('edit');
    setSelectedTemplate('grapesjs');
  };

  const handleTemplateSelect = (type: PageTemplateType) => {
    const newPage = createNewPage();
    newPage.parentPage = createParentId;
    newPage.pageTemplate = type === 'grapesjs' ? 'grapesjs' : 'standard';
    setEditingPage(newPage);
    setSelectedTemplate(type);
    if (type === 'standard') {
      setView('edit');
    } else {
      setView('edit');
    }
  };

  const handleGrapesJSSave = async (htmlByLang: Record<ContentLang, string>) => {
    if (!editingPage) return;

    const tid = toast.loading('Saving page...');
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
      let slug = editingPage.slug.trim();
      if (!slug || slug === '/') {
        slug = `/visual-${Date.now()}`;
      }

      const mergedContent: Record<ContentLang, PageContent> = {
        en: { ...editingPage.content.en, content: htmlByLang.en },
        zh_TW: { ...editingPage.content.zh_TW, content: htmlByLang.zh_TW },
        zh_CN: { ...editingPage.content.zh_CN, content: htmlByLang.zh_CN },
      };

      const toSave: ContentPage = {
        ...editingPage,
        slug,
        images: savedImages,
        content: mergedContent,
        pageTemplate: 'grapesjs',
        updatedAt: new Date().toISOString().split('T')[0],
      };

      const lang_data: Record<string, any> = {};
      (['en', 'zh_TW', 'zh_CN'] as ContentLang[]).forEach((lang) => {
        const langContent = toSave.content[lang];
        lang_data[lang] = {
          title: langContent.title,
          subtitle: langContent.subtitle,
          content: langContent.content,
          subcontent: langContent.subContent,
          meta_title: langContent.metaTitle,
          meta_description: langContent.metaDescription,
          meta_keywords: langContent.metaKeywords,
          builder_html: langContent.content,
        };
      });

      const images_data = buildImagesData(savedImages);

      const apiData = {
        slug: toSave.slug.replace(/^\//, ''),
        parent_menuid: toSave.parentPage ? parseInt(toSave.parentPage) : 0,
        footer_group_id: toSave.footerGroup ? parseInt(toSave.footerGroup) : 0,
        is_published: toSave.isPublished ? 1 : 0,
        in_header: toSave.inHeader ? 1 : 0,
        in_footer: toSave.inFooter ? 1 : 0,
        ordering: toSave.order,
        footer_ordering: toSave.footerOrder,
        page_template: 'grapesjs',
        lang_data,
        images_data,
      };

      let savedDoc: ContentPage;
      if (toSave.id.startsWith('page-')) {
        const result = await createDocument(apiData);
        const newId = documentIdFromCreateResponse(result);
        if (!newId) throw new Error('No document id returned');
        savedDoc = { ...toSave, id: newId };
      } else {
        await updateDocument(parseInt(toSave.id), apiData);
        savedDoc = toSave;
      }

      setPages((prev) => {
        const existing = prev.find((p) => p.id === savedDoc.id);
        return existing ? prev.map((p) => (p.id === savedDoc.id ? savedDoc : p)) : [...prev, savedDoc];
      });
      toast.success('Page saved successfully');
      goToContentList();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save visual page');
      console.error(error);
    } finally {
      toast.dismiss(tid);
    }
  };

  const handleCancelEdit = () => {
    goToContentList();
  };

  const handleSwitchFromGrapesToStandard = (htmlByLang: Record<ContentLang, string>) => {
    setEditingPage((prev) => {
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
        pageTemplate: p.pageTemplate === 'grapesjs' || p.page_template === 'grapesjs' ? 'grapesjs' : 'standard',
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
      (['en', 'zh_TW', 'zh_CN'] as ContentLang[]).forEach((lang) => {
        const langContent = toSave.content[lang];
        const row: Record<string, unknown> = {
          title: langContent.title,
          subtitle: langContent.subtitle,
          content: langContent.content,
          subcontent: langContent.subContent,
          meta_title: langContent.metaTitle,
          meta_description: langContent.metaDescription,
          meta_keywords: langContent.metaKeywords,
        };
        if (toSave.pageTemplate === 'grapesjs') {
          row.builder_html = langContent.content;
        }
        lang_data[lang] = row;
      });

      const images_data = buildImagesData(savedImages);

      const apiData = {
        slug: toSave.slug.replace(/^\//, ''),
        parent_menuid: toSave.parentPage ? parseInt(toSave.parentPage) : 0,
        footer_group_id: toSave.footerGroup ? parseInt(toSave.footerGroup) : 0,
        is_published: toSave.isPublished ? 1 : 0,
        in_header: toSave.inHeader ? 1 : 0,
        in_footer: toSave.inFooter ? 1 : 0,
        ordering: toSave.order,
        footer_ordering: toSave.footerOrder,
        page_template: toSave.pageTemplate,
        lang_data,
        images_data,
      };

      let savedDoc;
      if (toSave.id.startsWith('page-')) {
        const result = await createDocument(apiData);
        const newId = documentIdFromCreateResponse(result);
        if (!newId) throw new Error('No document id returned');
        savedDoc = { ...toSave, id: newId };
      } else {
        await updateDocument(parseInt(toSave.id), apiData);
        savedDoc = toSave;
      }

      setPages((prev) => {
        const existing = prev.find((p) => p.id === savedDoc.id);
        return existing ? prev.map((p) => (p.id === savedDoc.id ? savedDoc : p)) : [...prev, savedDoc];
      });
      toast.success('Page saved successfully');
      goToContentList();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save page');
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
  const containerContract = buildContainerContract({
    data: {
      pages,
      view,
      editingPage,
      search,
      isModalOpen,
      selectedTemplate,
      createParentId,
      createType,
      orderingChanged
    },
    uiState: {
      view,
      search,
      isModalOpen,
      selectedTemplate
    },
    asyncState: {
      loading: loading,
      saving: false,
      error: null,
    },
    callbacks: {
      openEdit,
      goToContentList,
      openCreateStandard,
      openCreateGrapesJS,
      handleTemplateSelect,
      handleGrapesJSSave,
      handleCancelEdit,
      handleSwitchFromGrapesToStandard,
      handleTreeCreate,
      handleTreeEdit,
      handleTreeDelete,
      handleTreeMove,
      handleSaveOrdering,
      handleSave,
      handleDelete,
      togglePageFlag
    },
    meta: {
      container: 'ContentManagement'
    },
  });

  return <ContentManagementView {...containerContract} />;
}

