import React from 'react';
import { ChevronLeft, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Switch } from '../../ui/switch';
import { LanguageTabs, ContentLang } from './LanguageTabs';
import { ImageGallery, GalleryImage } from './ImageGallery';
import { RichTextEditor } from './RichTextEditor';
import { Calendar } from '../../ui/calendar';

interface PageContent {
  title: string;
  subtitle: string;
  tags: string[];
  content: string;
  subContent: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
}

interface ContentPage {
  id: string;
  slug: string;
  isPublished: boolean;
  inHeader: boolean;
  headerOrder: number | null;
  parentPage: string | null;
  inFooter: boolean;
  footerOrder: number | null;
  footerGroup: string | null;
  images: GalleryImage[];
  scheduleDate: string;
  content: Record<ContentLang, PageContent>;
  updatedAt: string;
}

interface StandardTemplateFormProps {
  page: ContentPage;
  pages: ContentPage[];
  onUpdate: (page: ContentPage) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function StandardTemplateForm({ page, pages, onUpdate, onSave, onCancel }: StandardTemplateFormProps) {
  const update = (field: keyof ContentPage, value: unknown) => {
    onUpdate({ ...page, [field]: value });
  };

  const updateContent = (lang: ContentLang, field: keyof PageContent, value: unknown) => {
    onUpdate({
      ...page,
      content: {
        ...page.content,
        [lang]: { ...page.content[lang], [field]: value },
      },
    });
  };

  const handleDateSelect = (date: Date | undefined) => {
    update('scheduleDate', date ? date.toISOString().split('T')[0] : '');
  };

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-semibold">
              {page.id.startsWith('page-') ? 'Create New Page' : 'Edit Page'}
            </h1>
            <p className="text-sm text-muted-foreground">Standard Template</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onSave}>Save Page</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Page Settings</CardTitle>
          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-foreground">Published</label>
            <Switch checked={page.isPublished} onCheckedChange={(v) => update('isPublished', v)} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Slug / URI *</label>
              <Input
                value={page.slug}
                onChange={(e) => update('slug', e.target.value)}
                placeholder="/page-slug"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Parent Page</label>
              <select
                className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background"
                value={page.parentPage || ''}
                onChange={(e) => update('parentPage', e.target.value || null)}
              >
                <option value="">— None —</option>
                {pages.filter((p) => p.id !== page.id).map((p) => (
                  <option key={p.id} value={p.id}>
                    {page.content.en.title || p.slug}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm">Show in Header</label>
                <Switch checked={page.inHeader} onCheckedChange={(v) => update('inHeader', v)} />
              </div>
              {page.inHeader && (
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Header Order</label>
                  <Input
                    type="number"
                    min={1}
                    value={page.headerOrder ?? ''}
                    onChange={(e) => update('headerOrder', parseInt(e.target.value) || null)}
                    placeholder="e.g. 1"
                  />
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm">Show in Footer</label>
                <Switch checked={page.inFooter} onCheckedChange={(v) => update('inFooter', v)} />
              </div>
              {page.inFooter && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Footer Group</label>
                    <Input
                      value={page.footerGroup ?? ''}
                      onChange={(e) => update('footerGroup', e.target.value || null)}
                      placeholder="e.g. Company"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Footer Order</label>
                    <Input
                      type="number"
                      min={1}
                      value={page.footerOrder ?? ''}
                      onChange={(e) => update('footerOrder', parseInt(e.target.value) || null)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            Featured Image & Publish Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-sm text-muted-foreground">Featured Image</label>
              <ImageGallery images={page.images} onChange={(imgs) => update('images', imgs)} />
            </div>
            <div className="space-y-3">
              <label className="text-sm text-muted-foreground">Publish Date</label>
              <div className="border border-border rounded-lg p-3 bg-background">
                <Calendar
                  mode="single"
                  selected={page.scheduleDate ? new Date(page.scheduleDate) : undefined}
                  onSelect={handleDateSelect}
                  classNames={{
                    months: "relative",
                    month: "w-full",
                    caption: "flex justify-center pt-1 relative items-center w-full",
                   nav_button: "size-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Page Content</CardTitle>
        </CardHeader>
        <CardContent>
          <LanguageTabs>
            {(lang) => (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Title</label>
                  <Input
                    value={page.content[lang].title}
                    onChange={(e) => updateContent(lang, 'title', e.target.value)}
                    placeholder="Page title"
                  />
                </div>
                <RichTextEditor
                  label="Main Content"
                  value={page.content[lang].content}
                  onChange={(v) => updateContent(lang, 'content', v)}
                  minHeight="200px"
                />
              </div>
            )}
          </LanguageTabs>
        </CardContent>
      </Card>
    </div>
  );
}
