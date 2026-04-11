import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, ChevronLeft, Globe, Star, Loader2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { LanguageTabs, ContentLang } from './shared/LanguageTabs';
import { TagInput } from './shared/TagInput';
import { ImageGallery, GalleryImage } from './shared/ImageGallery';
import { RichTextEditor } from './shared/RichTextEditor';
import { toast } from 'sonner@2.0.3';
import { contentService, IMAGE_BASE } from '../../services/api';

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
  content: Record<ContentLang, NewsContent>;
}

const NEWS_CATEGORIES = ['Company News', 'Product Launch', 'Promotions', 'Industry News', 'Events'];

const emptyContent = (): NewsContent => ({ title: '', tags: [], content: '', excerpt: '' });

const API_BASE = 'https://api2.acedemos.com/api';

function formatModifiedAt(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
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

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await contentService.getNews();
        const mapped = res.data.map((n: any) => ({
          id: String(n.id),
          slug: n.slug || '',
          isPublished: n.isPublished ?? n.status === 'Published',
          isFeatured: n.isFeatured ?? false,
          postDate: n.postDate || n.publishedAt || '',
          modifiedAt: n.modifiedAt || n.updatedAt || '',
          author: n.author || 'Admin',
          category: 'Company News',
          readCount: n.views || 0,
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
  const openCreate = () => {
    const newItem: NewsItem = {
      id: `news-${Date.now()}`, slug: '', isPublished: false, isFeatured: false,
      postDate: new Date().toISOString().split('T')[0], author: 'Admin',
      modifiedAt: '',
      category: NEWS_CATEGORIES[0], readCount: 0, images: [],
      content: { en: emptyContent(), zh_TW: emptyContent(), zh_CN: emptyContent() },
    };
    setEditingItem(newItem); setView('edit');
  };

  useEffect(() => {
    if (!itemId) {
      setView('list');
      setEditingItem(null);
      return;
    }
    const found = news.find((n) => n.id === itemId);
    if (found) {
      setEditingItem(JSON.parse(JSON.stringify(found)));
      setView('edit');
    }
  }, [itemId, news]);

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
      navigate('/news');
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

  if (view === 'edit' && editingItem) {
    const update = (field: keyof NewsItem, value: unknown) =>
      setEditingItem((prev) => prev ? { ...prev, [field]: value } : prev);
    const updateContent = (lang: ContentLang, field: keyof NewsContent, value: unknown) =>
      setEditingItem((prev) => prev ? { ...prev, content: { ...prev.content, [lang]: { ...prev.content[lang], [field]: value } } } : prev);

    return (
      <div className="px-6 py-6 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          <Link to="/news" className="hover:text-primary flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> News Management
          </Link>
          <span>/</span>
          <span className="text-foreground">{editingItem.content.en.title || 'New Article'}</span>
          <span className="text-xs font-mono text-muted-foreground">· ID {editingItem.id}</span>
        </div>

        <div className="flex items-center justify-between px-6">
          <h1>{editingItem.id.startsWith('news-') ? 'Create Article' : 'Edit Article'}</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/news')}>Cancel</Button>
            <Button onClick={handleSave}>Save Article</Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Article Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Slug / URI</label>
                <Input value={editingItem.slug} onChange={(e) => update('slug', e.target.value)} placeholder="/news/article-slug" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Category</label>
                <select className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background" value={editingItem.category} onChange={(e) => update('category', e.target.value)}>
                  {NEWS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" /> Multilingual Content</CardTitle>
          </CardHeader>
          <CardContent>
            <LanguageTabs>
              {(lang) => (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Title</label>
                    <Input value={editingItem.content[lang].title} onChange={(e) => updateContent(lang, 'title', e.target.value)} placeholder="Article title" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Excerpt / Summary</label>
                    <textarea className="w-full h-20 px-3 py-2 border border-border rounded-lg text-sm resize-none outline-none focus:ring-1 focus:ring-ring" value={editingItem.content[lang].excerpt} onChange={(e) => updateContent(lang, 'excerpt', e.target.value)} placeholder="Short excerpt shown in article listings..." />
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
          <h1>News Management</h1>
          <p className="text-muted-foreground text-sm">{news.length} articles · {news.filter((n) => n.isPublished).length} published</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> New Article</Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search articles..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="h-9 px-3 border border-border rounded-md text-sm bg-background" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {NEWS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
                <th className="text-right px-4 py-3 text-muted-foreground text-xs">Views</th>
                <th className="text-right px-4 py-3 text-muted-foreground text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs align-top" title={item.id}>
                    {item.id}
                  </td>
                  <td className="px-4 py-3">
                    <p>{item.content.en.title || <span className="text-muted-foreground italic">Untitled</span>}</p>
                    <p className="text-xs text-muted-foreground">{item.author}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{item.slug}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">{item.category}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.postDate}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs leading-[16px]" style={{ lineHeight: '16px' }}>
                    <div className="leading-[16px]" style={{ lineHeight: '16px' }}>
                      {formatModifiedAt(item.modifiedAt)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch checked={item.isFeatured} onCheckedChange={() => toggleFeatured(item.id)} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch checked={item.isPublished} onCheckedChange={() => togglePublish(item.id)} />
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{item.readCount.toLocaleString()}</td>
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
          {filtered.length === 0 && <div className="py-12 text-center text-muted-foreground">No articles found</div>}
        </CardContent>
      </Card>
    </div>
  );
}