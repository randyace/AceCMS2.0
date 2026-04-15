import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, X, Pencil, BookOpen, Tag, Check } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { ContentLang } from './LanguageTabs';
import { AttributeGroup, AttrRow, AttrValue } from './attributeGroupsStore';

// ─── Colour palette ───────────────────────────────────────────────────────────

const PALETTE = [
  { row: '#eff6ff', border: '#3b82f6', accent: '#3b82f6', badge: '#dbeafe', badgeText: '#1e40af', btnHover: '#eff6ff' },
  { row: '#f5f3ff', border: '#8b5cf6', accent: '#8b5cf6', badge: '#ede9fe', badgeText: '#5b21b6', btnHover: '#f5f3ff' },
  { row: '#fff0f6', border: '#ec4899', accent: '#ec4899', badge: '#fce7f3', badgeText: '#9d174d', btnHover: '#fff0f6' },
  { row: '#fff7ed', border: '#f97316', accent: '#f97316', badge: '#ffedd5', badgeText: '#c2410c', btnHover: '#fff7ed' },
  { row: '#f0fdf4', border: '#22c55e', accent: '#22c55e', badge: '#dcfce7', badgeText: '#166534', btnHover: '#f0fdf4' },
  { row: '#ecfeff', border: '#06b6d4', accent: '#06b6d4', badge: '#cffafe', badgeText: '#164e63', btnHover: '#ecfeff' },
  { row: '#fefce8', border: '#eab308', accent: '#ca8a04', badge: '#fef9c3', badgeText: '#713f12', btnHover: '#fefce8' },
  { row: '#fff1f2', border: '#f43f5e', accent: '#f43f5e', badge: '#ffe4e6', badgeText: '#9f1239', btnHover: '#fff1f2' },
];

const getColor = (idx: number) => PALETTE[idx % PALETTE.length];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LANGS: ContentLang[] = ['en', 'zh_TW', 'zh_CN'];
const LANG_LABEL: Record<ContentLang, string> = { en: 'EN', zh_TW: '繁中', zh_CN: '简中' };

function emptyAttrValue(text: string): AttrValue {
  return {
    id: `val-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    content: { en: text, zh_TW: text, zh_CN: text },
  };
}

// ─── Badge Edit Dialog ────────────────────────────────────────────────────────

function BadgeEditDialog({
  badge,
  color,
  onSave,
  onClose,
}: {
  badge: AttrValue;
  color: (typeof PALETTE)[0];
  onSave: (updated: AttrValue) => void;
  onClose: () => void;
}) {
  const [content, setContent] = useState<Record<ContentLang, string>>({ ...badge.content });
  const [activeLang, setActiveLang] = useState<ContentLang>('en');

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with accent colour */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ background: color.row, borderBottom: `2px solid ${color.border}` }}>
          <div>
            <p className="font-medium" style={{ color: color.badgeText }}>Edit Attribute Value</p>
            <p className="text-xs opacity-70 mt-0.5" style={{ color: color.badgeText }}>Set name in each language</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/10 transition-colors"
          >
            <X className="w-4 h-4" style={{ color: color.accent }} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Lang tabs */}
          <div className="flex gap-1">
            {LANGS.map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveLang(lang)}
                className="flex-1 py-1.5 rounded-lg text-xs transition-all"
                style={
                  activeLang === lang
                    ? { background: color.accent, color: '#fff', fontWeight: 600 }
                    : { background: color.badge, color: color.badgeText }
                }
              >
                {LANG_LABEL[lang]}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">
              Name <span className="font-medium" style={{ color: color.accent }}>[{LANG_LABEL[activeLang]}]</span>
            </label>
            <input
              className="w-full h-9 px-3 rounded-lg border-2 text-sm outline-none transition-colors"
              style={{ borderColor: content[activeLang] ? color.border : '#e2e8f0' }}
              value={content[activeLang]}
              onChange={(e) => setContent((p) => ({ ...p, [activeLang]: e.target.value }))}
              placeholder={activeLang === 'en' ? 'e.g. Midnight Black' : '例：午夜黑'}
              autoFocus
            />
          </div>

          {/* Other langs preview */}
          <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
            {LANGS.filter((l) => l !== activeLang).map((l) => (
              <span key={l} className="text-xs">
                <span className="font-medium" style={{ color: color.accent }}>{LANG_LABEL[l]}:</span>{' '}
                <span className="text-muted-foreground">{content[l] || '—'}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            onClick={() => onSave({ ...badge, content })}
            style={{ background: color.accent, color: '#fff' }}
            className="hover:opacity-90 border-0"
          >
            <Check className="w-3.5 h-3.5 mr-1" /> Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Library Selection Modal ──────────────────────────────────────────────────

function LibraryModal({
  group,
  color,
  existingDefIds,
  onAdd,
  onClose,
}: {
  group: AttributeGroup;
  color: (typeof PALETTE)[0];
  existingDefIds: Set<string>;
  onAdd: (vals: AttrValue[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const available = group.attributes.filter((a) => !existingDefIds.has(a.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleConfirm = () => {
    const vals: AttrValue[] = group.attributes
      .filter((a) => selected.has(a.id))
      .map((a) => ({
        id: `val-${Date.now()}-${a.id}`,
        defId: a.id,
        content: { en: a.content.en.name, zh_TW: a.content.zh_TW.name, zh_CN: a.content.zh_CN.name },
      }));
    onAdd(vals);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-center justify-between" style={{ background: color.row, borderBottom: `2px solid ${color.border}` }}>
          <div>
            <p className="font-medium" style={{ color: color.badgeText }}>Select from Library</p>
            <p className="text-xs opacity-70 mt-0.5" style={{ color: color.badgeText }}>
              {group.content.en.name} — pick pre-defined values to add
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/10">
            <X className="w-4 h-4" style={{ color: color.accent }} />
          </button>
        </div>

        <div className="p-4 max-h-72 overflow-y-auto">
          {available.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>All pre-defined values already added.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {available.map((attr) => {
                const isSelected = selected.has(attr.id);
                return (
                  <label
                    key={attr.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors"
                    style={isSelected
                      ? { background: color.badge, border: `1px solid ${color.border}` }
                      : { background: '#f9fafb', border: '1px solid transparent' }
                    }
                  >
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                      style={isSelected
                        ? { background: color.accent, border: `2px solid ${color.accent}` }
                        : { border: '2px solid #d1d5db', background: '#fff' }
                      }
                      onClick={() => toggle(attr.id)}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={isSelected} onChange={() => toggle(attr.id)} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{attr.content.en.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {attr.content.zh_TW.name}
                        {attr.content.zh_CN.name !== attr.content.zh_TW.name ? ` / ${attr.content.zh_CN.name}` : ''}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={selected.size === 0}
              style={{ background: color.accent, color: '#fff' }}
              className="hover:opacity-90 border-0 disabled:opacity-40"
            >
              Add {selected.size > 0 ? `(${selected.size})` : ''}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Choice Popover ───────────────────────────────────────────────────────────

function ChoicePopover({
  hasLibrary,
  color,
  onCreateNew,
  onSelectExisting,
  onClose,
}: {
  hasLibrary: boolean;
  color: (typeof PALETTE)[0];
  onCreateNew: () => void;
  onSelectExisting: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1.5 z-40 bg-white border rounded-2xl shadow-2xl w-56 overflow-hidden"
      style={{ borderColor: color.border }}
    >
      <div className="px-3 py-2 text-xs font-medium" style={{ background: color.row, color: color.badgeText }}>
        Add attribute value
      </div>

      {/* Create new */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:opacity-80 transition-opacity text-left"
        style={{ background: '#fff' }}
        onMouseDown={(e) => { e.preventDefault(); onCreateNew(); }}
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color.badge }}>
          <Pencil className="w-3.5 h-3.5" style={{ color: color.accent }} />
        </div>
        <div>
          <p className="text-sm font-medium">Create new</p>
          <p className="text-xs text-muted-foreground">Type &amp; press Enter</p>
        </div>
      </button>

      {/* Select existing */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 transition-opacity text-left border-t border-gray-100"
        style={{ background: '#fff', opacity: hasLibrary ? 1 : 0.4 }}
        disabled={!hasLibrary}
        onMouseDown={(e) => { e.preventDefault(); if (hasLibrary) onSelectExisting(); }}
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#eff6ff' }}>
          <BookOpen className="w-3.5 h-3.5 text-blue-500" />
        </div>
        <div>
          <p className="text-sm font-medium">Select existing</p>
          <p className="text-xs text-muted-foreground">
            {hasLibrary ? 'Choose from library' : 'No pre-defined values'}
          </p>
        </div>
      </button>
    </div>
  );
}

// ─── Single attribute row ─────────────────────────────────────────────────────

function AttrRowItem({
  row,
  rowIndex,
  groups,
  onChange,
  onDelete,
}: {
  row: AttrRow;
  rowIndex: number;
  groups: AttributeGroup[];
  onChange: (updated: AttrRow) => void;
  onDelete: () => void;
}) {
  const [inputText, setInputText] = useState('');
  const [showChoice, setShowChoice] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [editingBadge, setEditingBadge] = useState<AttrValue | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const color = getColor(rowIndex);
  const currentGroup = groups.find((g) => g.id === row.groupId);
  const existingDefIds = new Set(row.values.map((v) => v.defId).filter(Boolean) as string[]);
  const availableLibraryCount = currentGroup?.attributes.filter((a) => !existingDefIds.has(a.id)).length ?? 0;

  const handleFocus = () => { if (!inputText) setShowChoice(true); };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    setShowChoice(false);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputText.trim()) {
      e.preventDefault();
      onChange({ ...row, values: [...row.values, emptyAttrValue(inputText.trim())] });
      setInputText('');
    }
    if (e.key === 'Escape') { setShowChoice(false); setInputText(''); }
  };

  const removeValue = useCallback(
    (id: string) => onChange({ ...row, values: row.values.filter((v) => v.id !== id) }),
    [row, onChange]
  );

  const handleBadgeSave = (updated: AttrValue) => {
    onChange({ ...row, values: row.values.map((v) => (v.id === updated.id ? updated : v)) });
    setEditingBadge(null);
  };

  const handleLibraryAdd = (vals: AttrValue[]) => {
    const filtered = vals.filter((sv) => !row.values.some((v) => v.defId && v.defId === sv.defId));
    onChange({ ...row, values: [...row.values, ...filtered] });
  };

  return (
    <>
      {/* ── Single horizontal row ─────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-shadow hover:shadow-sm"
        style={{ background: color.row, borderColor: '#e5e7eb' }}
      >
        {/* Coloured left pill */}
        <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: color.accent, minHeight: '28px' }} />

        {/* Group selector */}
        <select
          className="h-9 pl-2 pr-6 border-2 rounded-xl text-sm bg-white flex-shrink-0 outline-none focus:ring-2 transition-all cursor-pointer"
          style={{ borderColor: color.border, minWidth: '160px', maxWidth: '200px', color: row.groupId ? '#111' : '#94a3b8', ['--tw-ring-color' as string]: color.accent }}
          value={row.groupId}
          onChange={(e) => onChange({ ...row, groupId: e.target.value })}
        >
          <option value="">— Select group —</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.content.en.name}
              {g.content.zh_TW.name ? ` / ${g.content.zh_TW.name}` : ''}
            </option>
          ))}
        </select>

        {/* Badge + text input area — takes the remaining space */}
        <div className="relative flex-1 min-w-0">
          <div
            className="min-h-[38px] px-2 py-1 border-2 rounded-xl bg-white flex flex-wrap gap-1.5 items-center cursor-text transition-colors"
            style={{ borderColor: showChoice || document.activeElement === inputRef.current ? color.border : '#e2e8f0' }}
            onClick={() => inputRef.current?.focus()}
          >
            {row.values.map((val) => (
              <span
                key={val.id}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border"
                style={{ background: color.badge, color: color.badgeText, borderColor: color.border }}
              >
                <button
                  className="hover:underline max-w-[110px] truncate"
                  title="Click to edit in all languages"
                  onClick={(e) => { e.stopPropagation(); setEditingBadge(val); }}
                >
                  {val.content.en || val.content.zh_TW || '(unnamed)'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); removeValue(val.id); }}
                  className="ml-0.5 flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}

            <input
              ref={inputRef}
              className="flex-1 min-w-[80px] outline-none bg-transparent text-sm h-6 placeholder:text-gray-400"
              placeholder={row.values.length === 0 ? 'Click to add values…' : 'Add more…'}
              value={inputText}
              onChange={handleChange}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
            />
          </div>

          {showChoice && (
            <ChoicePopover
              hasLibrary={availableLibraryCount > 0}
              color={color}
              onCreateNew={() => { setShowChoice(false); setTimeout(() => inputRef.current?.focus(), 10); }}
              onSelectExisting={() => { setShowChoice(false); setShowLibrary(true); }}
              onClose={() => setShowChoice(false)}
            />
          )}
        </div>

        {/* Delete row */}
        <button
          onClick={onDelete}
          className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: color.accent }}
          title="Remove row"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Modals */}
      {showLibrary && currentGroup && (
        <LibraryModal
          group={currentGroup}
          color={color}
          existingDefIds={existingDefIds}
          onAdd={handleLibraryAdd}
          onClose={() => setShowLibrary(false)}
        />
      )}
      {editingBadge && (
        <BadgeEditDialog
          badge={editingBadge}
          color={color}
          onSave={handleBadgeSave}
          onClose={() => setEditingBadge(null)}
        />
      )}
    </>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

interface ProductAttrEditorProps {
  attrRows: AttrRow[];
  onChange: (rows: AttrRow[]) => void;
  groups: AttributeGroup[];
}

export function ProductAttrEditor({ attrRows, onChange, groups }: ProductAttrEditorProps) {
  const addRow = () =>
    onChange([...attrRows, { rowId: `row-${Date.now()}`, groupId: groups[0]?.id ?? '', values: [] }]);

  const updateRow = (rowId: string, updated: AttrRow) =>
    onChange(attrRows.map((r) => (r.rowId === rowId ? updated : r)));

  const deleteRow = (rowId: string) =>
    onChange(attrRows.filter((r) => r.rowId !== rowId));

  return (
    <div className="space-y-2.5">
      {attrRows.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-sm border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
          <Tag className="w-8 h-8 mx-auto mb-2 opacity-25" />
          <p className="font-medium text-gray-500">No attribute groups added yet</p>
          <p className="text-xs mt-0.5 text-gray-400">Click the button below to define product specifications.</p>
        </div>
      ) : (
        attrRows.map((row, idx) => (
          <AttrRowItem
            key={row.rowId}
            row={row}
            rowIndex={idx}
            groups={groups}
            onChange={(updated) => updateRow(row.rowId, updated)}
            onDelete={() => deleteRow(row.rowId)}
          />
        ))
      )}

      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed text-sm font-medium transition-all hover:shadow-sm"
        style={{
          borderColor: PALETTE[attrRows.length % PALETTE.length].border,
          color: PALETTE[attrRows.length % PALETTE.length].accent,
          background: PALETTE[attrRows.length % PALETTE.length].row,
        }}
      >
        <Plus className="w-4 h-4" /> Add Attribute Group
      </button>
    </div>
  );
}