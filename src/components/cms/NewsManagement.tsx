import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, ChevronLeft, Globe, Star, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { LanguageTabs, ContentLang } from './shared/LanguageTabs';
import { TagInput } from './shared/TagInput';
import { ImageGallery, GalleryImage } from './shared/ImageGallery';
import { RichTextEditor } from './shared/RichTextEditor';
import { toast } from 'sonner@2.0.3';
import { contentService } from '../../services/api';

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
  author: string;
  category: string;
  readCount: number;
  images: GalleryImage[];
  content: Record<ContentLang, NewsContent>;
}

const NEWS_CATEGORIES = ['Company News', 'Product Launch', 'Promotions', 'Industry News', 'Events'];

const emptyContent = (): NewsContent => ({ title: '', tags: [], content: '', excerpt: '' });

export function NewsManagement() {
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
          slug: '/' + n.slug,
          isPublished: n.status === 'Published',
          isFeatured: false,
          postDate: n.publishedAt,
          author: n.author,
          category: 'Company News',
          readCount: 0,
          images: [],
          content: {
            en: { title: n.content?.en?.title || n.title, tags: [], content: n.content?.en || '', excerpt: n.excerpt || '' },
            zh_TW: { title: n.content?.zh_TW || n.title, tags: [], content: n.content?.zh_TW || '', excerpt: n.excerpt || '' },
            zh_CN: { title: n.content?.zh_CN || n.title, tags: [], content: n.content?.zh_CN || '', excerpt: n.excerpt || '' },
          },
        }));
        setNews(mapped);
      } catch (error) {
        toast.error('Failed to load news');
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, []);

  const openEdit = (item: NewsItem) => { setEditingItem(JSON.parse(JSON.stringify(item))); setView('edit'); };
  const openCreate = () => {
    const newItem: NewsItem = {
      id: `news-${Date.now()}`, slug: '', isPublished: false, isFeatured: false,
      postDate: new Date().toISOString().split('T')[0], author: 'Admin',
      category: NEWS_CATEGORIES[0], readCount: 0, images: [],
      content: { en: emptyContent(), zh_TW: emptyContent(), zh_CN: emptyContent() },
    };
    setEditingItem(newItem); setView('edit');
  };

  const handleSave = () => {
    if (!editingItem) return;
    const pendingCount = editingItem.images.filter((img) => img.pending).length;
    const savedImages = editingItem.images.map(({ file: _f, pending: _p, ...rest }) => rest);
    const toSave = { ...editingItem, images: savedImages };

    const commit = () => {
      setNews((prev) => {
        const existing = prev.find((n) => n.id === toSave.id);
        return existing ? prev.map((n) => (n.id === toSave.id ? toSave : n)) : [...prev, toSave];
      });
      toast.success('News article saved');
      setView('list');
    };

    if (pendingCount > 0) {
      const tid = toast.loading(`Uploading ${pendingCount} image${pendingCount > 1 ? 's' : ''}…`);
      setTimeout(() => { toast.dismiss(tid); commit(); }, 900);
    } else {
      commit();
    }
  };

  const togglePublish = (id: string) => setNews((prev) => prev.map((n) => n.id === id ? { ...n, isPublished: !n.isPublished } : n));
  const toggleFeatured = (id: string) => setNews((prev) => prev.map((n) => n.id === id ? { ...n, isFeatured: !n.isFeatured } : n));
  const handleDelete = (id: string) => { setNews((prev) => prev.filter((n) => n.id !== id)); toast.success('Article deleted'); };

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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => setView('list')} className="hover:text-primary flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> News Management
          </button>
          <span>/</span>
          <span className="text-foreground">{editingItem.content.en.title || 'New Article'}</span>
        </div>

        <div className="flex items-center justify-between px-6">
          <h1>{editingItem.id.startsWith('news-') ? 'Create Article' : 'Edit Article'}</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setView('list')}>Cancel</Button>
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
                <th className="text-left px-4 py-3 text-muted-foreground text-xs">Title (EN)</th>
                <th className="text-left px-4 py-3 text-muted-foreground text-xs">Slug</th>
                <th className="text-left px-4 py-3 text-muted-foreground text-xs">Category</th>
                <th className="text-left px-4 py-3 text-muted-foreground text-xs">Post Date</th>
                <th className="text-center px-4 py-3 text-muted-foreground text-xs">Featured</th>
                <th className="text-center px-4 py-3 text-muted-foreground text-xs">Published</th>
                <th className="text-right px-4 py-3 text-muted-foreground text-xs">Views</th>
                <th className="text-right px-4 py-3 text-muted-foreground text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p>{item.content.en.title || <span className="text-muted-foreground italic">Untitled</span>}</p>
                    <p className="text-xs text-muted-foreground">{item.author}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{item.slug}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">{item.category}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.postDate}</td>
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