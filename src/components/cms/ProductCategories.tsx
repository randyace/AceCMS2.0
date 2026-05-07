import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Edit, Trash2, ChevronLeft, FolderTree, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { LanguageTabs, ContentLang } from './shared/LanguageTabs';
import { ImageGallery, GalleryImage } from './shared/ImageGallery';
import { toast } from 'sonner';
import { productService, IMAGE_BASE, type ProductCategory as ApiProductCategory } from '../../services/api';
import ProductCategoriesView from '../figma-ui/ProductCategoriesView';
import { buildContainerContract } from '../containerContracts';

interface ProductCategoryContent {
  name: string;
  description: string;
}

interface ProductCategory {
  id: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  images: GalleryImage[];
  content: Record<ContentLang, ProductCategoryContent>;
}

const TMP_ID_PREFIX = 'product-category-';
const emptyContent = (): ProductCategoryContent => ({ name: '', description: '' });

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function mapApiCategory(apiCat: ApiProductCategory, idx: number): ProductCategory {
  return {
    id: String(apiCat.id),
    slug: apiCat.slug || '',
    sortOrder: idx + 1,
    isActive: Boolean(apiCat.isPublished),
    images: (apiCat.images || []).map((img) => ({
      id: String(img.id),
      image_id: parseInt(String(img.image_id), 10),
      url: resolveImageUrl((img as unknown as { url?: string }).url, img.image_id),
      alt: '',
      pending: false,
    })),
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

const API_BASE = 'https://api2.acedemos.com/api';

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

function resolveImageUrl(url: string | undefined, imageId: string | number | undefined): string {
  if (url && url.startsWith('http')) return url;
  if (url && url.startsWith('/')) return `${IMAGE_BASE}${url}`;
  return `${IMAGE_BASE}/image/${imageId}`;
}

export function ProductCategories() {
  const navigate = useNavigate();
  const { itemId } = useParams<{ itemId?: string }>();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingCat, setEditingCat] = useState<ProductCategory | null>(null);
  const [activeLang, setActiveLang] = useState<ContentLang>('en');
  const sorted = useMemo(() => [...categories].sort((a, b) => a.sortOrder - b.sortOrder), [categories]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await productService.getCategories();
        const mapped = (res.data || []).map((cat, idx) => mapApiCategory(cat as unknown as ApiProductCategory, idx));
        setCategories(mapped);
      } catch {
        toast.error('Failed to load product categories');
      } finally {
        setLoading(false);
      }
    }
    fetchCategories();
  }, []);

  const openEdit = (cat: ProductCategory) => {
    setEditingCat(JSON.parse(JSON.stringify(cat)));
    setActiveLang('en');
    setView('edit');
    navigate(`/categories/${cat.id}`);
  };

  const openCreate = () => {
    const next = {
      id: `${TMP_ID_PREFIX}${Date.now()}`,
      slug: '',
      sortOrder: categories.length + 1,
      isActive: true,
      images: [],
      content: { en: emptyContent(), zh_TW: emptyContent(), zh_CN: emptyContent() },
    };
    setEditingCat(next);
    setActiveLang('en');
    setView('edit');
    navigate('/categories/new');
  };

  const handleSave = async () => {
    if (!editingCat) return;
    if (!editingCat.content.en.name.trim()) {
      toast.error('English name is required');
      return;
    }

    try {
      let finalImages = editingCat.images;
      const pendingImages = editingCat.images.filter((img) => img.pending && img.file);
      for (const img of pendingImages) {
        if (img.file) {
          const uploaded = await uploadImage(img.file);
          finalImages = finalImages.map((i) =>
            i.id === img.id
              ? { id: String(uploaded.id), image_id: uploaded.id, url: resolveImageUrl(uploaded.url, uploaded.id), alt: i.alt, pending: false }
              : i
          );
        }
      }

      const savedImages = finalImages.map(({ file: _f, pending: _p, ...rest }) => rest);
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
        images_data: savedImages.map((img, index) => ({
          image_id: parseInt(String(img.image_id), 10),
          ordering: index,
        })),
      };

      if (editingCat.id.startsWith(TMP_ID_PREFIX)) {
        const result = await productService.createCategory(payload);
        const createdId = String((result as unknown as Record<string, unknown>).id || '');
        const saved = { ...editingCat, id: createdId || editingCat.id, slug: payload.slug, images: savedImages };
        setCategories((prev) => [...prev, saved]);
      } else {
        await productService.updateCategory(editingCat.id, payload);
        setCategories((prev) => prev.map((c) => (c.id === editingCat.id ? { ...editingCat, slug: payload.slug, images: savedImages } : c)));
      }
      toast.success('Product category saved');
      setView('list');
      setEditingCat(null);
      navigate('/categories');
    } catch {
      toast.error('Failed to save product category');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      if (!id.startsWith(TMP_ID_PREFIX)) {
        await productService.deleteCategory(id);
      }
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast.success('Category deleted');
    } catch {
      toast.error('Failed to delete category');
    }
  };

  const update = <K extends keyof ProductCategory>(field: K, value: ProductCategory[K]) =>
    setEditingCat((prev) => prev ? { ...prev, [field]: value } : prev);
  const updateContent = (lang: ContentLang, field: keyof ProductCategoryContent, value: string) =>
    setEditingCat((prev) => prev ? { ...prev, content: { ...prev.content, [lang]: { ...prev.content[lang], [field]: value } } } : prev);

  const goList = () => {
    setView('list');
    setEditingCat(null);
    navigate('/categories');
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
      container: 'ProductCategories'
    },
  });

  return <ProductCategoriesView {...containerContract} />;
}

