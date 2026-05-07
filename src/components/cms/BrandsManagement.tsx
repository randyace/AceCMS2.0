import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Edit, Trash2, ChevronLeft, Tag, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { LanguageTabs, ContentLang } from './shared/LanguageTabs';
import { ImageGallery, GalleryImage } from './shared/ImageGallery';
import { toast } from 'sonner';
import { productService, IMAGE_BASE, type ProductBrand as ApiProductBrand } from '../../services/api';
import BrandsManagementView from '../figma-ui/BrandsManagementView';
import { buildContainerContract } from '../containerContracts';

interface BrandContent {
  name: string;
  description: string;
}

interface BrandModel {
  id: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  images: GalleryImage[];
  content: Record<ContentLang, BrandContent>;
}

const TMP_ID_PREFIX = 'product-brand-';
const emptyContent = (): BrandContent => ({ name: '', description: '' });

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function mapApiBrand(apiBrand: ApiProductBrand, idx: number): BrandModel {
  return {
    id: String(apiBrand.id),
    slug: apiBrand.slug || '',
    sortOrder: idx + 1,
    isActive: Boolean(apiBrand.isPublished),
    images: (apiBrand.images || []).map((img) => ({
      id: String(img.id),
      image_id: parseInt(String(img.image_id), 10),
      url: resolveImageUrl((img as unknown as { url?: string }).url, img.image_id),
      alt: '',
      pending: false,
    })),
    content: {
      en: { name: apiBrand.lang_data?.en?.title || apiBrand.title || '', description: apiBrand.lang_data?.en?.content || apiBrand.content || '' },
      zh_TW: { name: apiBrand.lang_data?.zh_TW?.title || '', description: apiBrand.lang_data?.zh_TW?.content || '' },
      zh_CN: { name: apiBrand.lang_data?.zh_CN?.title || '', description: apiBrand.lang_data?.zh_CN?.content || '' },
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

export function BrandsManagement() {
  const navigate = useNavigate();
  const { itemId } = useParams<{ itemId?: string }>();
  const [brands, setBrands] = useState<BrandModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingBrand, setEditingBrand] = useState<BrandModel | null>(null);
  const [activeLang, setActiveLang] = useState<ContentLang>('en');
  const sorted = useMemo(() => [...brands].sort((a, b) => a.sortOrder - b.sortOrder), [brands]);

  useEffect(() => {
    async function fetchBrands() {
      try {
        const res = await productService.getBrands();
        const mapped = (res.data as unknown as ApiProductBrand[]).map((brand, idx) => mapApiBrand(brand, idx));
        setBrands(mapped);
      } catch {
        toast.error('Failed to load brands');
      } finally {
        setLoading(false);
      }
    }
    fetchBrands();
  }, []);

  const openEdit = (brand: BrandModel) => {
    setEditingBrand(JSON.parse(JSON.stringify(brand)));
    setActiveLang('en');
    setView('edit');
    navigate(`/brands/${brand.id}`);
  };

  const openCreate = () => {
    const next = {
      id: `${TMP_ID_PREFIX}${Date.now()}`,
      slug: '',
      sortOrder: brands.length + 1,
      isActive: true,
      images: [],
      content: { en: emptyContent(), zh_TW: emptyContent(), zh_CN: emptyContent() },
    };
    setEditingBrand(next);
    setActiveLang('en');
    setView('edit');
    navigate('/brands/new');
  };

  const handleSave = async () => {
    if (!editingBrand) return;
    if (!editingBrand.content.en.name.trim()) {
      toast.error('English name is required');
      return;
    }

    try {
      let finalImages = editingBrand.images;
      const pendingImages = editingBrand.images.filter((img) => img.pending && img.file);
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
        slug: editingBrand.slug || slugify(editingBrand.content.en.name),
        title: editingBrand.content.en.name,
        content: editingBrand.content.en.description,
        is_published: editingBrand.isActive ? 1 : 0,
        lang_data: {
          en: { title: editingBrand.content.en.name, content: editingBrand.content.en.description, subcontent: '' },
          zh_TW: { title: editingBrand.content.zh_TW.name, content: editingBrand.content.zh_TW.description, subcontent: '' },
          zh_CN: { title: editingBrand.content.zh_CN.name, content: editingBrand.content.zh_CN.description, subcontent: '' },
        },
        images_data: savedImages.map((img, index) => ({
          image_id: parseInt(String(img.image_id), 10),
          ordering: index,
        })),
      };

      if (editingBrand.id.startsWith(TMP_ID_PREFIX)) {
        const result = await productService.createBrand(payload);
        const createdId = String((result as unknown as Record<string, unknown>).id || '');
        const saved = { ...editingBrand, id: createdId || editingBrand.id, slug: payload.slug, images: savedImages };
        setBrands((prev) => [...prev, saved]);
      } else {
        await productService.updateBrand(editingBrand.id, payload);
        setBrands((prev) => prev.map((b) => (b.id === editingBrand.id ? { ...editingBrand, slug: payload.slug, images: savedImages } : b)));
      }
      toast.success('Brand saved');
      setView('list');
      setEditingBrand(null);
      navigate('/brands');
    } catch {
      toast.error('Failed to save brand');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this brand?')) return;
    try {
      if (!id.startsWith(TMP_ID_PREFIX)) {
        await productService.deleteBrand(id);
      }
      setBrands((prev) => prev.filter((b) => b.id !== id));
      toast.success('Brand deleted');
    } catch {
      toast.error('Failed to delete brand');
    }
  };

  const update = <K extends keyof BrandModel>(field: K, value: BrandModel[K]) =>
    setEditingBrand((prev) => (prev ? { ...prev, [field]: value } : prev));

  const updateContent = (lang: ContentLang, field: keyof BrandContent, value: string) =>
    setEditingBrand((prev) => (prev ? { ...prev, content: { ...prev.content, [lang]: { ...prev.content[lang], [field]: value } } } : prev));

  const goList = () => {
    setView('list');
    setEditingBrand(null);
    navigate('/brands');
  };

  useEffect(() => {
  const containerContract = buildContainerContract({
    data: {
      brands,
      view,
      editingBrand,
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
      container: 'BrandsManagement'
    },
  });

  return <BrandsManagementView {...containerContract} />;
}

