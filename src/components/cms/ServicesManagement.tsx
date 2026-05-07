import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, ChevronLeft, Globe, Star, Loader2, Layout } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { LanguageTabs, ContentLang } from './shared/LanguageTabs';
import { TagInput } from './shared/TagInput';
import { ImageGallery, GalleryImage } from './shared/ImageGallery';
import { RichTextEditor } from './shared/RichTextEditor';
import { PageTemplateModal, PageTemplateType } from './shared/PageTemplateModal';
import { GrapesJSEditor } from './shared/GrapesJSEditor';
import { toast } from 'sonner@2.0.3';
import { contentService, IMAGE_BASE } from '../../services/api';
import type { Service as ApiService, ServiceCategory } from '../../services/api';
import ServicesManagementView from '../figma-ui/ServicesManagementView';
import { buildContainerContract } from '../containerContracts';

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
  const containerContract = buildContainerContract({
    data: {
      services,
      categories,
      view,
      editingItem,
      search,
      filterCategory,
      isModalOpen,
      selectedTemplate
    },
    uiState: {
      view,
      search,
      filterCategory,
      isModalOpen,
      selectedTemplate
    },
    asyncState: {
      loading: loading,
      saving: false,
      error: null,
    },
    callbacks: {
      categoryLabel,
      handleTemplateSelect,
      goToServicesList,
      handleGrapesJSSave,
      handleSwitchFromGrapesToStandard,
      handleSave,
      togglePublish,
      toggleFeatured,
      handleDelete,
      openEdit,
      setSearch,
      setFilterCategory,
      setView,
      setIsModalOpen,
      setSelectedTemplate
    },
    meta: {
      container: 'ServicesManagement'
    },
  });

  return <ServicesManagementView {...containerContract} />;
}

