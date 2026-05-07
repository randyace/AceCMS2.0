import React, { useState, useContext, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, ChevronLeft, Layers, X, Check } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { LanguageTabs, ContentLang } from './shared/LanguageTabs';
import { AttributeGroup, AttributeDef } from './shared/attributeGroupsStore';
import { AttributeGroupsContext } from '../../App';
import { toast } from 'sonner';
import { productService, type AttributeGroupApi } from '../../services/api';
import AttributeGroupsView from '../figma-ui/AttributeGroupsView';
import { buildContainerContract } from '../containerContracts';

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

function mapApiGroup(apiGroup: AttributeGroupApi): AttributeGroup {
  return {
    id: String(apiGroup.id),
    sortOrder: Number(apiGroup.sortOrder ?? 99),
    content: {
      en: { name: apiGroup.lang_data?.en?.name || '' },
      zh_TW: { name: apiGroup.lang_data?.zh_TW?.name || '' },
      zh_CN: { name: apiGroup.lang_data?.zh_CN?.name || '' },
    },
    attributes: (apiGroup.attributes || []).map((attr) => ({
      id: String(attr.id),
      shortCode: attr.shortCode || '',
      content: {
        en: { name: attr.lang_data?.en?.name || '' },
        zh_TW: { name: attr.lang_data?.zh_TW?.name || '' },
        zh_CN: { name: attr.lang_data?.zh_CN?.name || '' },
      },
    })),
  };
}

function toApiPayload(group: AttributeGroup) {
  return {
    sortOrder: group.sortOrder,
    lang_data: {
      en: { name: group.content.en.name },
      zh_TW: { name: group.content.zh_TW.name },
      zh_CN: { name: group.content.zh_CN.name },
    },
    attributes: group.attributes.map((attr) => ({
      id: attr.id.startsWith('ad-') ? undefined : attr.id,
      shortCode: attr.shortCode || '',
      lang_data: {
        en: { name: attr.content.en.name },
        zh_TW: { name: attr.content.zh_TW.name },
        zh_CN: { name: attr.content.zh_CN.name },
      },
    })),
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
      <div className="flex-1 min-w-0 flex items-center gap-2">
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
        <Input
          value={def.shortCode || ''}
          onChange={(e) => onUpdate({ ...def, shortCode: e.target.value.toUpperCase().slice(0, 6) })}
          placeholder="Code"
          className="h-8 text-xs font-mono w-20"
        />
      </div>

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
  const navigate = useNavigate();
  const { itemId } = useParams<{ itemId?: string }>();
  const { groups, setGroups } = useContext(AttributeGroupsContext);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingGroup, setEditingGroup] = useState<AttributeGroup | null>(null);
  const [activeLang, setActiveLang] = useState<ContentLang>('en');
  const [newDefText, setNewDefText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGroups() {
      try {
        const res = await productService.getAttributeGroups();
        const mapped = (res.data || []).map((g) => mapApiGroup(g as unknown as AttributeGroupApi));
        setGroups(mapped);
      } catch {
        toast.error('Failed to load attribute groups');
      } finally {
        setLoading(false);
      }
    }
    fetchGroups();
  }, [setGroups]);

  const sorted = useMemo(() => [...groups].sort((a, b) => a.sortOrder - b.sortOrder), [groups]);

  const openEdit = (g: AttributeGroup) => {
    setEditingGroup(JSON.parse(JSON.stringify(g)));
    setActiveLang('en');
    setView('edit');
    navigate(`/attribute-groups/${g.id}`);
  };

  const openCreate = () => {
    setEditingGroup({ ...emptyGroup(), sortOrder: groups.length + 1 });
    setActiveLang('en');
    setView('edit');
    navigate('/attribute-groups/new');
  };

  const handleSave = async () => {
    if (!editingGroup) return;
    if (!editingGroup.content.en.name.trim()) {
      toast.error('English name is required');
      return;
    }
    try {
      const payload = toApiPayload(editingGroup);
      if (editingGroup.id.startsWith('ag-')) {
        const created = await productService.createAttributeGroup(payload);
        const createdId = String((created as unknown as Record<string, unknown>).id || editingGroup.id);
        setGroups((prev: AttributeGroup[]) => [...prev, { ...editingGroup, id: createdId }]);
      } else {
        await productService.updateAttributeGroup(editingGroup.id, payload);
        setGroups((prev: AttributeGroup[]) => prev.map((g) => (g.id === editingGroup.id ? editingGroup : g)));
      }
      toast.success('Attribute group saved');
      setView('list');
      setEditingGroup(null);
      navigate('/attribute-groups');
    } catch {
      toast.error('Failed to save attribute group');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this attribute group?')) return;
    try {
      if (!id.startsWith('ag-')) {
        await productService.deleteAttributeGroup(id);
      }
      setGroups((prev: AttributeGroup[]) => prev.filter((g) => g.id !== id));
      toast.success('Attribute group deleted');
    } catch {
      toast.error('Failed to delete attribute group');
    }
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

  const goList = () => {
    setView('list');
    setEditingGroup(null);
    navigate('/attribute-groups');
  };

  useEffect(() => {
  const containerContract = buildContainerContract({
    data: {
      view,
      editingGroup,
      activeLang,
      newDefText
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
      updateGroupContent,
      addDef,
      addDefFromText,
      updateDef,
      deleteDef,
      goList,
      setView,
      setActiveLang
    },
    meta: {
      container: 'AttributeGroups'
    },
  });

  return <AttributeGroupsView {...containerContract} />;
}

