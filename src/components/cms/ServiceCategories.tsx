import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Edit, Trash2, ChevronLeft, Wrench, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { LanguageTabs, ContentLang } from './shared/LanguageTabs';
import { toast } from 'sonner@2.0.3';
import { contentService, type ServiceCategory as ApiServiceCategory } from '../../services/api';
import ServiceCategoriesView from '../figma-ui/ServiceCategoriesView';
import { buildContainerContract } from '../containerContracts';

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
  const containerContract = buildContainerContract({
    data: {
      categories,
      view,
      editingCat,
      activeLang
    },
    uiState: {
      view,
      activeLang
    },
    asyncState: {
      loading: loading,
      saving: false,
      error: null,
    },
    callbacks: {
      openEdit,
      openCreate,
      handleSave,
      handleDelete,
      updateContent,
      goList,
      setView,
      setActiveLang
    },
    meta: {
      container: 'ServiceCategories'
    },
  });

  return <ServiceCategoriesView {...containerContract} />;
}

