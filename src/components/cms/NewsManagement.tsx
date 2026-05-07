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
import type { News as ApiNews } from '../../services/api';
import NewsManagementView from '../figma-ui/NewsManagementView';
import { buildContainerContract } from '../containerContracts';

interface NewsContent {
  title: string;
  tags: string[];
  content: string;
  excerpt: string;
}

interface NewsItem {
  id: string;
  slug: string;
  isPublished: boolean;
  isFeatured: boolean;
  postDate: string;
  modifiedAt: string;
  author: string;
  category: string;
  readCount: number;
  images: GalleryImage[];
  /** standard = rich text; grapesjs = visual builder */
  pageTemplate: 'standard' | 'grapesjs';
  content: Record<ContentLang, NewsContent>;
}

const NEWS_CATEGORIES = ['Company News', 'Product Launch', 'Promotions', 'Industry News', 'Events'];

const emptyContent = (): NewsContent => ({ title: '', tags: [], content: '', excerpt: '' });

const API_BASE = 'https://api2.acedemos.com/api';

function documentIdFromCreateResponse(result: unknown): string {
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

function toPageTemplate(news: Pick<ApiNews, 'pageTemplate' | 'page_template'>): 'standard' | 'grapesjs' {
  return news.pageTemplate === 'grapesjs' || news.page_template === 'grapesjs' ? 'grapesjs' : 'standard';
}

async function uploadImage(file: File): Promise<{ id: number; url: string }> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
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

export function NewsManagement() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingItem, setEditingItem] = useState<NewsItem | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PageTemplateType | null>(null);

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await contentService.getNews();
        const mapped = res.data.map((n: ApiNews) => ({
          id: String(n.id),
          slug: n.slug || '',
          isPublished: n.isPublished ?? n.status === 'Published',
          isFeatured: n.isFeatured ?? false,
          postDate: n.postDate || n.publishedAt || '',
          modifiedAt: n.modifiedAt || n.updatedAt || '',
          author: n.author || 'Admin',
          category: 'Company News',
          readCount: n.views || 0,
          pageTemplate: toPageTemplate(n),
          images: (n.images || []).map((img: any) => ({
            id: String(img.id),
            image_id: parseInt(img.image_id),
            url: `${IMAGE_BASE}/image/${img.image_id}`,
            alt: '',
            pending: false,
          })),
          content: {
            en: { title: n.content?.en?.title || '', tags: n.content?.en?.tags || [], content: n.content?.en?.content || '', excerpt: n.content?.en?.excerpt || '' },
            zh_TW: { title: n.content?.zh_TW?.title || '', tags: n.content?.zh_TW?.tags || [], content: n.content?.zh_TW?.content || '', excerpt: n.content?.zh_TW?.excerpt || '' },
            zh_CN: { title: n.content?.zh_CN?.title || '', tags: n.content?.zh_CN?.tags || [], content: n.content?.zh_CN?.content || '', excerpt: n.content?.zh_CN?.excerpt || '' },
          },
        }));
        setNews(mapped);
      } catch (error) {
        toast.error('Failed to load news');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, []);

  const openEdit = (item: NewsItem) => { navigate(`/news/${item.id}`); };

  const createNewArticle = (template: 'standard' | 'grapesjs'): NewsItem => ({
    id: `news-${Date.now()}`,
    slug: '',
    isPublished: false,
    isFeatured: false,
    postDate: new Date().toISOString().split('T')[0],
    author: 'Admin',
    modifiedAt: '',
    category: NEWS_CATEGORIES[0],
    readCount: 0,
    images: [],
    pageTemplate: template,
    content: { en: emptyContent(), zh_TW: emptyContent(), zh_CN: emptyContent() },
  });

  const handleTemplateSelect = (type: PageTemplateType) => {
    setEditingItem(createNewArticle(type === 'grapesjs' ? 'grapesjs' : 'standard'));
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
    const found = news.find((n) => n.id === itemId);
    if (found) {
      setEditingItem(JSON.parse(JSON.stringify(found)));
      setView('edit');
      setSelectedTemplate(found.pageTemplate === 'grapesjs' ? 'grapesjs' : null);
    }
  }, [itemId, news]);

  const goToNewsList = () => {
    setView('list');
    setEditingItem(null);
    setSelectedTemplate(null);
    setIsModalOpen(false);
    navigate('/news', { replace: true });
  };

  const handleGrapesJSSave = async (htmlByLang: Record<ContentLang, string>) => {
    if (!editingItem) return;

    const tid = toast.loading('Saving article...');
    try {
      let finalImages = editingItem.images;
      const pendingImages = editingItem.images.filter((img) => img.pending && img.file);
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
      let slug = editingItem.slug.trim();
      if (!slug) {
        slug = `visual-news-${Date.now()}`;
      }

      const mergedContent: Record<ContentLang, NewsContent> = {
        en: { ...editingItem.content.en, content: htmlByLang.en },
        zh_TW: { ...editingItem.content.zh_TW, content: htmlByLang.zh_TW },
        zh_CN: { ...editingItem.content.zh_CN, content: htmlByLang.zh_CN },
      };

      const toSave: NewsItem = {
        ...editingItem,
        slug,
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
        page_template: 'grapesjs',
        content,
        images_data,
      };

      let savedItem: NewsItem;
      if (toSave.id.startsWith('news-')) {
        const result = await contentService.createNews(apiData as Parameters<typeof contentService.createNews>[0]);
        const newId = documentIdFromCreateResponse(result as unknown);
        if (!newId) throw new Error('No article id returned');
        savedItem = { ...toSave, id: newId };
      } else {
        await contentService.updateNews(Number(toSave.id), apiData as Parameters<typeof contentService.updateNews>[1]);
        savedItem = toSave;
      }

      setNews((prev) => {
        const existing = prev.find((n) => n.id === savedItem.id);
        return existing ? prev.map((n) => (n.id === savedItem.id ? savedItem : n)) : [...prev, savedItem];
      });
      toast.success('Article saved successfully');
      goToNewsList();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save article');
      console.error(error);
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
      if (pendingImages.length > 0) {
        toast.success(`Uploading ${pendingImages.length} image(s)...`);

        for (const img of pendingImages) {
          if (img.file) {
            const uploaded = await uploadImage(img.file);
            finalImages = finalImages.map((i) =>
              i.id === img.id
                ? { id: String(uploaded.id), image_id: uploaded.id,             url: `${IMAGE_BASE}/image/${uploaded.id}`, alt: i.alt, pending: false }
                : i
            );
          }
        }
      }

      const savedImages = finalImages.map(({ file: _f, pending: _p, ...rest }) => rest);
      const toSave = { ...editingItem, images: savedImages, modifiedAt: new Date().toISOString() };

      const images_data = savedImages.map((img: any, index: number) => ({
        image_id: parseInt(img.image_id),
        ordering: index,
      }));

      const isNew = toSave.id.startsWith('news-');
      const apiData = {
        slug: toSave.slug || toSave.slug || `article-${Date.now()}`,
        author: toSave.author,
        post_date: toSave.postDate,
        is_published: toSave.isPublished ? 1 : 0,
        featured: toSave.isFeatured ? 1 : 0,
        page_template: toSave.pageTemplate ?? 'standard',
        content: {
          en: {
            title: toSave.content.en.title,
            content: toSave.content.en.content,
            excerpt: toSave.content.en.excerpt,
          },
          zh_TW: {
            title: toSave.content.zh_TW.title,
            content: toSave.content.zh_TW.content,
            excerpt: toSave.content.zh_TW.excerpt,
          },
          zh_CN: {
            title: toSave.content.zh_CN.title,
            content: toSave.content.zh_CN.content,
            excerpt: toSave.content.zh_CN.excerpt,
          },
        },
        images_data,
      };

      let savedItem;
      if (isNew) {
        const result = await contentService.createNews(apiData);
        savedItem = { ...toSave, id: String(result.id) };
      } else {
        await contentService.updateNews(Number(toSave.id), apiData);
        savedItem = toSave;
      }

      setNews((prev) => {
        const existing = prev.find((n) => n.id === savedItem.id);
        return existing ? prev.map((n) => (n.id === savedItem.id ? savedItem : n)) : [...prev, savedItem];
      });
      toast.success('News article saved');
      goToNewsList();
    } catch (error) {
      toast.error('Failed to save article');
      console.error(error);
    } finally {
      toast.dismiss(tid);
    }
  };

  const togglePublish = async (id: string) => {
    const item = news.find((n) => n.id === id);
    if (!item) return;
    try {
      await contentService.updateNews(Number(id), { is_published: item.isPublished ? 0 : 1 });
      setNews((prev) => prev.map((n) => n.id === id ? { ...n, isPublished: !n.isPublished } : n));
    } catch (error) {
      toast.error('Failed to update publish status');
    }
  };

  const toggleFeatured = async (id: string) => {
    const item = news.find((n) => n.id === id);
    if (!item) return;
    try {
      await contentService.updateNews(Number(id), { featured: item.isFeatured ? 0 : 1 });
      setNews((prev) => prev.map((n) => n.id === id ? { ...n, isFeatured: !n.isFeatured } : n));
    } catch (error) {
      toast.error('Failed to update featured status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    try {
      await contentService.deleteNews(Number(id));
      setNews((prev) => prev.filter((n) => n.id !== id));
      toast.success('Article deleted');
    } catch (error) {
      toast.error('Failed to delete article');
    }
  };

  const filtered = news.filter((n) =>
    (n.content.en.title.toLowerCase().includes(search.toLowerCase()) || n.slug.toLowerCase().includes(search.toLowerCase())) &&
    (filterCategory === '' || n.category === filterCategory)
  );

  if (selectedTemplate === 'grapesjs' && editingItem) {
  const containerContract = buildContainerContract({
    data: {
      news,
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
      openEdit,
      handleTemplateSelect,
      goToNewsList,
      handleGrapesJSSave,
      handleSwitchFromGrapesToStandard,
      handleSave,
      togglePublish,
      toggleFeatured,
      handleDelete,
      setSearch,
      setFilterCategory,
      setView,
      setIsModalOpen,
      setSelectedTemplate
    },
    meta: {
      container: 'NewsManagement'
    },
  });

  return <NewsManagementView {...containerContract} />;
}

