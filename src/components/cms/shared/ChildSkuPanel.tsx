import React, { useState } from 'react';
import { ChevronDown, ChevronUp, GitBranch, Copy, Check } from 'lucide-react';
import { AttrRow, AttributeGroup, ChildSku, generateChildSkus, effectiveCode } from './attributeGroupsStore';

interface ChildSkuPanelProps {
  parentSku: string;
  attrRows: AttrRow[];
  groups: AttributeGroup[];
}

const DIM_COLORS = [
  { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
  { bg: '#ede9fe', text: '#5b21b6', border: '#8b5cf6' },
  { bg: '#fce7f3', text: '#9d174d', border: '#ec4899' },
  { bg: '#ffedd5', text: '#c2410c', border: '#f97316' },
  { bg: '#dcfce7', text: '#166534', border: '#22c55e' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handle}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/5"
      title="Copy SKU"
    >
      {copied
        ? <Check className="w-3 h-3 text-emerald-500" />
        : <Copy className="w-3 h-3 text-muted-foreground" />
      }
    </button>
  );
}

export function ChildSkuPanel({ parentSku, attrRows, groups }: ChildSkuPanelProps) {
  const [open, setOpen] = useState(true);
  const childSkus = generateChildSkus(parentSku, attrRows, groups);

  // Determine dimension names (rows with ≥ 2 values)
  const variantRows = attrRows.filter((r) => r.values.length >= 2);
  const dimNames = variantRows.map((r) => {
    const g = groups.find((g) => g.id === r.groupId);
    return g?.content.en.name ?? r.groupId;
  });

  if (childSkus.length === 0) {
    // Show a hint only if there are some attribute rows
    if (attrRows.length === 0) return null;
    return (
      <div className="mt-4 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
        <GitBranch className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <p className="text-sm text-slate-500">
          No variant SKUs — add <strong>2 or more values</strong> to any attribute row to generate child SKUs.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-[#0f2942]/20 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 bg-[#0f2942]/5 hover:bg-[#0f2942]/10 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <GitBranch className="w-4 h-4 text-[#0f2942]" />
        <div className="flex-1">
          <span className="text-sm font-medium text-[#0f2942]">Variant Child SKUs</span>
          <span className="ml-2 text-xs bg-[#0f2942] text-white rounded-full px-2 py-0.5">
            {childSkus.length}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">
            from {dimNames.join(' × ')}
          </span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-[#0f2942]" />
          : <ChevronDown className="w-4 h-4 text-[#0f2942]" />
        }
      </button>

      {open && (
        <div className="p-4 bg-white">
          {/* Dimension legend */}
          <div className="flex flex-wrap gap-2 mb-3">
            {dimNames.map((name, i) => {
              const c = DIM_COLORS[i % DIM_COLORS.length];
              const row = variantRows[i];
              return (
                <div key={name} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs" style={{ background: c.bg, borderColor: c.border, color: c.text }}>
                  <span className="font-medium">{name}:</span>
                  {row.values.map((v) => (
                    <span key={v.id} className="font-mono">{effectiveCode(v)}</span>
                  )).reduce((acc: React.ReactNode[], el, idx) => idx === 0 ? [el] : [...acc, <span key={`sep-${idx}`} className="opacity-40">/</span>, el], [])}
                </div>
              );
            })}
          </div>

          {/* SKU grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {childSkus.map((child) => (
              <ChildSkuCard key={child.sku} child={child} dimColors={DIM_COLORS} />
            ))}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Click any value badge in the editor above and set a custom <strong>SKU Short Code</strong> to change the suffix.
          </p>
        </div>
      )}
    </div>
  );
}

function ChildSkuCard({ child, dimColors }: { child: ChildSku; dimColors: typeof DIM_COLORS }) {
  return (
    <div className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 bg-gray-50 hover:border-[#0f2942]/30 hover:bg-[#0f2942]/5 transition-colors">
      {/* Tree indicator */}
      <span className="text-muted-foreground text-xs select-none">↳</span>

      <div className="flex-1 min-w-0">
        {/* SKU string */}
        <p className="font-mono text-xs font-medium text-[#0f2942] truncate">{child.sku}</p>
        {/* Combo pills */}
        <div className="flex flex-wrap gap-1 mt-0.5">
          {child.combo.map((c, i) => {
            const dc = dimColors[i % dimColors.length];
            return (
              <span
                key={`${c.groupName}-${c.value.id}`}
                className="text-[10px] px-1.5 py-0.5 rounded-md"
                style={{ background: dc.bg, color: dc.text }}
              >
                {c.groupName}: {c.value.content.en || c.value.content.zh_TW}
              </span>
            );
          })}
        </div>
      </div>

      <CopyButton text={child.sku} />
    </div>
  );
}

// ─── Compact read-only badge for the product list ─────────────────────────────

export function ChildSkuBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#0f2942]/10 text-[#0f2942] border border-[#0f2942]/20">
      <GitBranch className="w-2.5 h-2.5" />
      {count} variants
    </span>
  );
}
