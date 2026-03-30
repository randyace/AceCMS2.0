import React, { useState } from 'react';
import { Plus, Edit, Trash2, ChevronRight, ChevronLeft, Globe, FolderTree } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { LanguageTabs, ContentLang } from './shared/LanguageTabs';
import { ImageGallery, GalleryImage } from './shared/ImageGallery';
import { toast } from 'sonner@2.0.3';

interface CategoryContent { name: string; description: string; }
interface Category {
  id: string; skuPrefix: string; slug: string; parentId: string | null;
  sortOrder: number; colorCode: string;
  images: GalleryImage[];
  content: Record<ContentLang, CategoryContent>;
}

const INITIAL_CATEGORIES: Category[] = [
  { id: 'c1', skuPrefix: 'ELEC', slug: 'electronics', parentId: null, sortOrder: 1, colorCode: '#3b82f6', images: [], content: { en: { name: 'Electronics', description: 'All electronic products' }, zh_TW: { name: '電子產品', description: '所有電子產品' }, zh_CN: { name: '电子产品', description: '所有电子产品' } } },
  { id: 'c11', skuPrefix: 'AUDIO', slug: 'audio', parentId: 'c1', sortOrder: 1, colorCode: '#3b82f6', images: [], content: { en: { name: 'Audio', description: 'Headphones, earbuds, speakers' }, zh_TW: { name: '音響', description: '耳機、耳塞、喇叭' }, zh_CN: { name: '音响', description: '耳机、耳塞、音箱' } } },
  { id: 'c12', skuPrefix: 'COMP', slug: 'computers', parentId: 'c1', sortOrder: 2, colorCode: '#3b82f6', images: [], content: { en: { name: 'Computers & Accessories', description: '' }, zh_TW: { name: '電腦及配件', description: '' }, zh_CN: { name: '电脑及配件', description: '' } } },
  { id: 'c2', skuPrefix: 'FASH', slug: 'fashion', parentId: null, sortOrder: 2, colorCode: '#ec4899', images: [], content: { en: { name: 'Fashion', description: 'Clothing & accessories' }, zh_TW: { name: '時尚', description: '服裝及配飾' }, zh_CN: { name: '时尚', description: '服装及配饰' } } },
  { id: 'c21', skuPrefix: 'MEN', slug: 'mens-fashion', parentId: 'c2', sortOrder: 1, colorCode: '#ec4899', images: [], content: { en: { name: "Men's Fashion", description: '' }, zh_TW: { name: '男裝', description: '' }, zh_CN: { name: '男装', description: '' } } },
  { id: 'c22', skuPrefix: 'WOM', slug: 'womens-fashion', parentId: 'c2', sortOrder: 2, colorCode: '#ec4899', images: [], content: { en: { name: "Women's Fashion", description: '' }, zh_TW: { name: '女裝', description: '' }, zh_CN: { name: '女裝', description: '' } } },
  { id: 'c3', skuPrefix: 'HOME', slug: 'home-living', parentId: null, sortOrder: 3, colorCode: '#22c55e', images: [], content: { en: { name: 'Home & Living', description: 'Home décor and essentials' }, zh_TW: { name: '家居生活', description: '家居裝飾及日用品' }, zh_CN: { name: '家居生活', description: '家居装饰及日用品' } } },
];

export function ProductCategories() {
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const roots = categories.filter((c) => c.parentId === null).sort((a, b) => a.sortOrder - b.sortOrder);
  const getChildren = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);

  const openEdit = (c: Category) => { setEditingCat(JSON.parse(JSON.stringify(c))); setView('edit'); };
  const openCreate = (parentId: string | null = null) => {
    const newCat: Category = {
      id: `cat-${Date.now()}`, skuPrefix: '', slug: '', parentId, sortOrder: 99, colorCode: '#6b7280', images: [],
      content: { en: { name: '', description: '' }, zh_TW: { name: '', description: '' }, zh_CN: { name: '', description: '' } },
    };
    setEditingCat(newCat); setView('edit');
  };

  const handleSave = () => {
    if (!editingCat) return;
    setCategories((prev) => {
      const existing = prev.find((c) => c.id === editingCat.id);
      return existing ? prev.map((c) => c.id === editingCat.id ? editingCat : c) : [...prev, editingCat];
    });
    toast.success('Category saved');
    setView('list');
  };

  const handleDelete = (id: string) => {
    const hasChildren = categories.some((c) => c.parentId === id);
    if (hasChildren) { toast.error('Remove child categories first'); return; }
    setCategories((prev) => prev.filter((c) => c.id !== id));
    toast.success('Category deleted');
  };

  const update = <K extends keyof Category>(field: K, value: Category[K]) =>
    setEditingCat((prev) => prev ? { ...prev, [field]: value } : prev);
  const updateContent = (lang: ContentLang, field: keyof CategoryContent, value: string) =>
    setEditingCat((prev) => prev ? { ...prev, content: { ...prev.content, [lang]: { ...prev.content[lang], [field]: value } } } : prev);

  const parentOptions = categories.filter((c) => !editingCat || c.id !== editingCat.id);

  const CategoryRow = ({ cat, depth }: { cat: Category; depth: number }) => {
    const children = getChildren(cat.id);
    return (
      <>
        <tr className="border-b border-border hover:bg-muted/30 transition-colors">
          <td className="px-4 py-3">
            <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
              {depth > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.colorCode }} />
              <span className={depth === 0 ? 'font-medium' : 'text-muted-foreground'}>{cat.content.en.name}</span>
            </div>
          </td>
          <td className="px-4 py-3 font-mono text-xs text-primary">{cat.skuPrefix}</td>
          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{cat.slug}</td>
          <td className="px-4 py-3 text-muted-foreground text-sm">
            {cat.parentId ? categories.find((c) => c.id === cat.parentId)?.content.en.name ?? '—' : <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Root</span>}
          </td>
          <td className="px-4 py-3 text-center text-muted-foreground">{cat.sortOrder}</td>
          <td className="px-4 py-3 text-right">
            <div className="flex items-center justify-end gap-1">
              <Button variant="ghost" size="sm" onClick={() => openCreate(cat.id)} title="Add child">
                <Plus className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}><Edit className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(cat.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </td>
        </tr>
        {children.map((child) => (
          <CategoryRow key={child.id} cat={child} depth={depth + 1} />
        ))}
      </>
    );
  };

  if (view === 'edit' && editingCat) {
    return (
      <main className="px-6 py-6 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => setView('list')} className="hover:text-primary flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Product Categories
          </button>
          <span>/</span>
          <span className="text-foreground">{editingCat.content.en.name || 'New Category'}</span>
        </div>

        <div className="flex items-center justify-between">
          <h1>{editingCat.id.startsWith('cat-') ? 'Create Category' : 'Edit Category'}</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setView('list')}>Cancel</Button>
            <Button onClick={handleSave}>Save Category</Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Category Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">SKU Prefix *</label>
                <Input value={editingCat.skuPrefix} onChange={(e) => update('skuPrefix', e.target.value.toUpperCase())} placeholder="e.g. ELEC" className="font-mono uppercase" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Slug *</label>
                <Input value={editingCat.slug} onChange={(e) => update('slug', e.target.value)} placeholder="e.g. electronics" className="font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Parent Category</label>
                <select className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background" value={editingCat.parentId || ''} onChange={(e) => update('parentId', e.target.value || null)}>
                  <option value="">— Root Level (no parent) —</option>
                  {parentOptions.filter((c) => c.parentId === null).map((c) => (
                    <React.Fragment key={c.id}>
                      <option value={c.id}>{c.content.en.name}</option>
                      {getChildren(c.id).map((child) => (
                        <option key={child.id} value={child.id}>  └ {child.content.en.name}</option>
                      ))}
                    </React.Fragment>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Sort Order</label>
                <Input type="number" min={1} value={editingCat.sortOrder} onChange={(e) => update('sortOrder', parseInt(e.target.value) || 1)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Color Code (for display)</label>
              <div className="flex items-center gap-2">
                <input type="color" value={editingCat.colorCode} onChange={(e) => update('colorCode', e.target.value)} className="w-10 h-9 rounded border border-border cursor-pointer" />
                <Input value={editingCat.colorCode} onChange={(e) => update('colorCode', e.target.value)} className="font-mono w-36" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Category Image</CardTitle></CardHeader>
          <CardContent>
            <ImageGallery images={editingCat.images} onChange={(imgs) => update('images', imgs)} />
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
                    <label className="text-sm text-muted-foreground">Name</label>
                    <Input value={editingCat.content[lang].name} onChange={(e) => updateContent(lang, 'name', e.target.value)} placeholder="Category name" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Description</label>
                    <textarea className="w-full h-20 px-3 py-2 border border-border rounded-lg text-sm resize-none outline-none focus:ring-1 focus:ring-ring" value={editingCat.content[lang].description} onChange={(e) => updateContent(lang, 'description', e.target.value)} placeholder="Category description" />
                  </div>
                </div>
              )}
            </LanguageTabs>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="px-6 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1>Product Categories</h1>
          <p className="text-muted-foreground text-sm">{categories.length} categories · hierarchical tree view</p>
        </div>
        <Button onClick={() => openCreate(null)}><Plus className="w-4 h-4 mr-1" /> New Root Category</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="text-left px-4 py-3 text-muted-foreground text-xs flex items-center gap-1"><FolderTree className="w-3.5 h-3.5" /> Category</th>
                <th className="text-left px-4 py-3 text-muted-foreground text-xs">SKU Prefix</th>
                <th className="text-left px-4 py-3 text-muted-foreground text-xs">Slug</th>
                <th className="text-left px-4 py-3 text-muted-foreground text-xs">Parent</th>
                <th className="text-center px-4 py-3 text-muted-foreground text-xs">Order</th>
                <th className="text-right px-4 py-3 text-muted-foreground text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roots.map((cat) => (
                <CategoryRow key={cat.id} cat={cat} depth={0} />
              ))}
            </tbody>
          </table>
          {roots.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">No categories yet</div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}