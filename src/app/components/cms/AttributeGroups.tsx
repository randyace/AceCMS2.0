import React, { useState, useContext } from 'react';
import { Plus, Edit, Trash2, ChevronLeft, Layers, X, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { LanguageTabs, ContentLang } from './shared/LanguageTabs';
import { AttributeGroup, AttributeDef } from './shared/attributeGroupsStore';
import { AttributeGroupsContext } from '../../App';
import { toast } from 'sonner@2.0.3';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LANGS: ContentLang[] = ['en', 'zh_TW', 'zh_CN'];
const LANG_LABEL: Record<ContentLang, string> = { en: 'EN', zh_TW: '繁中', zh_CN: '简中' };

function emptyGroup(): AttributeGroup {
  return {
    id: `ag-${Date.now()}`,
    sortOrder: 99,
    content: {
      en: { name: '' },
      zh_TW: { name: '' },
      zh_CN: { name: '' },
    },
    attributes: [],
  };
}

function emptyDef(): AttributeDef {
  return {
    id: `ad-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    content: {
      en: { name: '' },
      zh_TW: { name: '' },
      zh_CN: { name: '' },
    },
  };
}

// ─── Attribute def row (inside edit view) ─────────────────────────────────────

function AttrDefRow({
  def,
  onUpdate,
  onDelete,
}: {
  def: AttributeDef;
  onUpdate: (updated: AttributeDef) => void;
  onDelete: () => void;
}) {
  const [activeLang, setActiveLang] = useState<ContentLang>('en');

  return (
    <div className="flex items-start gap-2 p-2.5 bg-white border border-border rounded-lg group">
      {/* Lang mini-tabs */}
      <div className="flex gap-0 border border-border rounded-md overflow-hidden flex-shrink-0 mt-0.5">
        {LANGS.map((l) => (
          <button
            key={l}
            onClick={() => setActiveLang(l)}
            className={`px-2 py-1 text-[10px] transition-colors ${
              activeLang === l ? 'bg-[#0f2942] text-white' : 'bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            {LANG_LABEL[l]}
          </button>
        ))}
      </div>

      {/* Name input */}
      <Input
        value={def.content[activeLang].name}
        onChange={(e) =>
          onUpdate({
            ...def,
            content: {
              ...def.content,
              [activeLang]: { name: e.target.value },
            },
          })
        }
        placeholder={
          activeLang === 'en' ? 'e.g. Midnight Black' : activeLang === 'zh_TW' ? '例：午夜黑' : '例：午夜黑'
        }
        className="h-8 text-sm flex-1 min-w-0"
      />

      {/* Other langs preview */}
      <div className="hidden sm:flex items-center gap-2 flex-shrink-0 text-[10px] text-muted-foreground">
        {LANGS.filter((l) => l !== activeLang).map((l) => (
          <span key={l}>
            <span className="font-medium">{LANG_LABEL[l]}</span>:{' '}
            {def.content[l].name || <span className="italic opacity-50">—</span>}
          </span>
        ))}
      </div>

      <button
        onClick={onDelete}
        className="w-7 h-7 flex-shrink-0 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AttributeGroups() {
  const { groups, setGroups } = useContext(AttributeGroupsContext);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingGroup, setEditingGroup] = useState<AttributeGroup | null>(null);
  const [activeLang, setActiveLang] = useState<ContentLang>('en');
  const [newDefText, setNewDefText] = useState('');

  const sorted = [...groups].sort((a, b) => a.sortOrder - b.sortOrder);

  const openEdit = (g: AttributeGroup) => {
    setEditingGroup(JSON.parse(JSON.stringify(g)));
    setActiveLang('en');
    setView('edit');
  };

  const openCreate = () => {
    setEditingGroup({ ...emptyGroup(), sortOrder: groups.length + 1 });
    setActiveLang('en');
    setView('edit');
  };

  const handleSave = () => {
    if (!editingGroup) return;
    if (!editingGroup.content.en.name.trim()) {
      toast.error('English name is required');
      return;
    }
    setGroups((prev: AttributeGroup[]) => {
      const exists = prev.find((g) => g.id === editingGroup.id);
      return exists
        ? prev.map((g) => (g.id === editingGroup.id ? editingGroup : g))
        : [...prev, editingGroup];
    });
    toast.success('Attribute group saved');
    setView('list');
    setEditingGroup(null);
  };

  const handleDelete = (id: string) => {
    setGroups((prev: AttributeGroup[]) => prev.filter((g) => g.id !== id));
    toast.success('Attribute group deleted');
  };

  const updateGroupContent = (lang: ContentLang, name: string) => {
    if (!editingGroup) return;
    setEditingGroup({
      ...editingGroup,
      content: { ...editingGroup.content, [lang]: { name } },
    });
  };

  const addDef = () => {
    if (!editingGroup) return;
    setEditingGroup({ ...editingGroup, attributes: [...editingGroup.attributes, emptyDef()] });
  };

  const addDefFromText = () => {
    if (!editingGroup || !newDefText.trim()) return;
    const def = emptyDef();
    def.content.en.name = newDefText.trim();
    def.content.zh_TW.name = newDefText.trim();
    def.content.zh_CN.name = newDefText.trim();
    setEditingGroup({ ...editingGroup, attributes: [...editingGroup.attributes, def] });
    setNewDefText('');
  };

  const updateDef = (defId: string, updated: AttributeDef) => {
    if (!editingGroup) return;
    setEditingGroup({
      ...editingGroup,
      attributes: editingGroup.attributes.map((a) => (a.id === defId ? updated : a)),
    });
  };

  const deleteDef = (defId: string) => {
    if (!editingGroup) return;
    setEditingGroup({
      ...editingGroup,
      attributes: editingGroup.attributes.filter((a) => a.id !== defId),
    });
  };

  // ─── Edit View ──────────────────────────────────────────────────────────────

  if (view === 'edit' && editingGroup) {
    const isNew = editingGroup.id.startsWith('ag-');

    return (
      <main className="min-h-full">
        <div className="bg-gradient-to-r from-[#0f2942] to-[#1a3f5c] text-white px-6 py-5">
          <div className="flex items-center gap-2 text-sm text-white/70 mb-3">
            <button
              onClick={() => { setView('list'); setEditingGroup(null); }}
              className="hover:text-white flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Attribute Groups
            </button>
            <span>/</span>
            <span className="text-white">{editingGroup.content.en.name || 'New Group'}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-white">{isNew ? 'New Attribute Group' : editingGroup.content.en.name}</h1>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => { setView('list'); setEditingGroup(null); }}
                className="border-white/30 text-white hover:bg-white/10 bg-transparent"
              >
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-[#cec18a] text-[#0f2942] hover:bg-[#d4c990]">
                Save Group
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {/* Group name in each language */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#0f2942]/10 to-transparent border-l-4 border-[#0f2942] py-3">
              <CardTitle className="text-sm text-[#0f2942]">Group Name</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <LanguageTabs activeLang={activeLang} onChange={setActiveLang} />
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">
                  Name <span className="text-destructive">*</span>{' '}
                  <span className="text-[#0f2942] font-medium">[{LANG_LABEL[activeLang]}]</span>
                </label>
                <Input
                  value={editingGroup.content[activeLang].name}
                  onChange={(e) => updateGroupContent(activeLang, e.target.value)}
                  placeholder={
                    activeLang === 'en' ? 'e.g. Color, Size, Material…' :
                    activeLang === 'zh_TW' ? '例：顏色、尺碼、材質…' : '例：颜色、尺码、材质…'
                  }
                  className="max-w-sm"
                />
              </div>
              {/* Preview other langs */}
              <div className="flex flex-wrap gap-4 pt-1 border-t border-border">
                {LANGS.filter((l) => l !== activeLang).map((l) => (
                  <div key={l} className="text-xs text-muted-foreground">
                    <span className="font-medium">{LANG_LABEL[l]}:</span>{' '}
                    {editingGroup.content[l].name || <span className="italic opacity-50">Not set</span>}
                  </div>
                ))}
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Sort order:</span> {editingGroup.sortOrder}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Sort Order</label>
                <Input
                  type="number"
                  min={1}
                  value={editingGroup.sortOrder}
                  onChange={(e) =>
                    setEditingGroup({ ...editingGroup, sortOrder: parseInt(e.target.value) || 1 })
                  }
                  className="w-24"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pre-defined attribute values */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-rose-500/10 to-rose-50 border-l-4 border-rose-400 py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-rose-800 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Pre-defined Values{' '}
                  <span className="text-xs font-normal text-rose-600">
                    ({editingGroup.attributes.length})
                  </span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-3">
              <p className="text-xs text-muted-foreground">
                Pre-defined values appear in the &ldquo;Select existing&rdquo; library when editing product attributes.
              </p>

              {/* Quick-add from text */}
              <div className="flex gap-2">
                <Input
                  placeholder="Type a value name and press Enter…"
                  value={newDefText}
                  onChange={(e) => setNewDefText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addDefFromText(); }
                  }}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  onClick={addDefFromText}
                  disabled={!newDefText.trim()}
                  className="bg-[#0f2942] text-white hover:bg-[#1a3f5c] flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </div>

              {/* Attribute defs list */}
              {editingGroup.attributes.length === 0 ? (
                <div className="py-6 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm">
                  <Layers className="w-7 h-7 mx-auto mb-2 opacity-30" />
                  <p>No pre-defined values yet.</p>
                  <p className="text-xs mt-0.5 opacity-70">Type above and press Enter, or click Add to create one.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {editingGroup.attributes.map((def) => (
                    <AttrDefRow
                      key={def.id}
                      def={def}
                      onUpdate={(updated) => updateDef(def.id, updated)}
                      onDelete={() => deleteDef(def.id)}
                    />
                  ))}
                </div>
              )}

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addDef}
                className="h-8 text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
              >
                <Plus className="w-3 h-3 mr-1" /> Add Empty Row
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // ─── List View ──────────────────────────────────────────────────────────────

  const totalDefs = groups.reduce((s, g) => s + g.attributes.length, 0);

  return (
    <main className="min-h-full">
      <div className="bg-gradient-to-r from-[#0f2942] to-[#1a3f5c] text-white px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-white">Attribute Groups</h1>
            <p className="text-white/60 text-sm">
              {groups.length} groups · {totalDefs} pre-defined values
            </p>
          </div>
          <Button onClick={openCreate} className="bg-[#cec18a] text-[#0f2942] hover:bg-[#d4c990] self-start sm:self-auto">
            <Plus className="w-4 h-4 mr-1" /> New Group
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Total Groups', value: groups.length, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: '🗂️' },
            { label: 'Pre-defined Values', value: totalDefs, color: 'bg-rose-50 border-rose-200 text-rose-700', icon: '🏷️' },
            { label: 'Avg. Values / Group', value: groups.length ? Math.round(totalDefs / groups.length) : 0, color: 'bg-purple-50 border-purple-200 text-purple-700', icon: '📊' },
          ].map((stat) => (
            <div key={stat.label} className={`p-3 rounded-xl border ${stat.color}`}>
              <div className="flex items-center gap-2">
                <span>{stat.icon}</span>
                <div>
                  <p className="text-xs opacity-70">{stat.label}</p>
                  <p className="text-xl font-medium">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Group cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((group) => (
            <Card key={group.id} className="shadow-sm overflow-hidden hover:shadow-md transition-shadow group/card">
              <div className="h-1 bg-gradient-to-r from-[#0f2942] to-[#1a3f5c]" />
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="font-medium">{group.content.en.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.content.zh_TW.name}
                      {group.content.zh_CN.name !== group.content.zh_TW.name
                        ? ` / ${group.content.zh_CN.name}`
                        : ''}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full flex-shrink-0">
                    Order {group.sortOrder}
                  </span>
                </div>

                {/* Pre-defined value chips */}
                {group.attributes.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {group.attributes.slice(0, 6).map((a) => (
                      <span
                        key={a.id}
                        className="text-xs px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-full"
                      >
                        {a.content.en.name}
                      </span>
                    ))}
                    {group.attributes.length > 6 && (
                      <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                        +{group.attributes.length - 6} more
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic mb-3">No pre-defined values</p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    {group.attributes.length} values
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(group)}
                      className="h-7 w-7 p-0 hover:bg-[#0f2942]/10 hover:text-[#0f2942]"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(group.id)}
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add new card */}
          <button
            onClick={openCreate}
            className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-[#0f2942]/40 hover:text-[#0f2942] transition-colors min-h-[160px]"
          >
            <Plus className="w-6 h-6" />
            <span className="text-sm">New Attribute Group</span>
          </button>
        </div>
      </div>
    </main>
  );
}
