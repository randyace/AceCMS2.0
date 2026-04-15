import React, { useState } from 'react';
import {
  ChevronDown, ChevronUp, ChevronRight, GitBranch,
  Copy, Check, Package, RefreshCcw, DollarSign,
} from 'lucide-react';
import { AttrRow, AttributeGroup, ChildSku, generateChildSkus, effectiveCode } from './attributeGroupsStore';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';

// ─── Exported Types ────────────────────────────────────────────────────────────

export interface ChildStockLevel {
  warehouseId: string;
  warehouseName: string;
  qty: number;
}

export interface ChildSkuOverride {
  purchasePrice: number;
  wholePrice: number;
  retailPrice: number;
  webPrice: number;
  discount: number;
  stockLevels: ChildStockLevel[];
}

export interface WarehouseInfo { id: string; name: string; }

export interface ParentDefaults {
  purchasePrice: number; wholePrice: number;
  retailPrice: number; webPrice: number; discount: number;
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface ChildSkuPanelProps {
  parentSku: string;
  attrRows: AttrRow[];
  groups: AttributeGroup[];
  warehouses: WarehouseInfo[];
  parentDefaults: ParentDefaults;
  overrides: Record<string, ChildSkuOverride>;
  onChange: (overrides: Record<string, ChildSkuOverride>) => void;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const DIM_COLORS = [
  { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
  { bg: '#ede9fe', text: '#5b21b6', border: '#8b5cf6' },
  { bg: '#fce7f3', text: '#9d174d', border: '#ec4899' },
  { bg: '#ffedd5', text: '#c2410c', border: '#f97316' },
  { bg: '#dcfce7', text: '#166534', border: '#22c55e' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function mkDefault(parentDefaults: ParentDefaults, warehouses: WarehouseInfo[]): ChildSkuOverride {
  return {
    ...parentDefaults,
    stockLevels: warehouses.map((w) => ({ warehouseId: w.id, warehouseName: w.name, qty: 0 })),
  };
}

function getEffective(
  sku: string,
  overrides: Record<string, ChildSkuOverride>,
  parentDefaults: ParentDefaults,
  warehouses: WarehouseInfo[],
): ChildSkuOverride {
  const o = overrides[sku];
  if (!o) return mkDefault(parentDefaults, warehouses);
  // Ensure all warehouses present
  const filled = warehouses.map((w) => {
    const existing = o.stockLevels.find((s) => s.warehouseId === w.id);
    return existing ?? { warehouseId: w.id, warehouseName: w.name, qty: 0 };
  });
  return { ...o, stockLevels: filled };
}

export function totalChildStock(o: ChildSkuOverride): number {
  return o.stockLevels.reduce((s, l) => s + l.qty, 0);
}

// ─── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/5"
      title="Copy SKU"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
    </button>
  );
}

// ─── ChildSkuRow ───────────────────────────────────────────────────────────────

function ChildSkuRow({
  child, dimColors, override, parentDefaults, warehouses,
  onUpdate,
}: {
  child: ChildSku;
  dimColors: typeof DIM_COLORS;
  override: ChildSkuOverride;
  parentDefaults: ParentDefaults;
  warehouses: WarehouseInfo[];
  onUpdate: (updated: ChildSkuOverride) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const totalStock = totalChildStock(override);
  const effWebPrice = override.discount > 0
    ? override.webPrice * (1 - override.discount / 100)
    : override.webPrice;
  const isModified = JSON.stringify({ ...parentDefaults }) !== JSON.stringify({
    purchasePrice: override.purchasePrice, wholePrice: override.wholePrice,
    retailPrice: override.retailPrice, webPrice: override.webPrice, discount: override.discount,
  });

  const updatePrice = (field: keyof ParentDefaults, val: number) =>
    onUpdate({ ...override, [field]: val });

  const updateStock = (warehouseId: string, qty: number) =>
    onUpdate({
      ...override,
      stockLevels: override.stockLevels.map((s) =>
        s.warehouseId === warehouseId ? { ...s, qty } : s
      ),
    });

  const resetToParent = () =>
    onUpdate({ ...override, ...parentDefaults });

  return (
    <div className="rounded-lg border border-gray-100 overflow-hidden">
      {/* ── Summary row ── */}
      <div
        className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${expanded ? 'bg-[#0f2942]/5' : 'bg-gray-50 hover:bg-[#0f2942]/5'}`}
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Expand toggle */}
        <span className="text-muted-foreground flex-shrink-0">
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5 text-[#0f2942]" />
            : <ChevronRight className="w-3.5 h-3.5 text-[#0f2942]/50" />
          }
        </span>

        {/* Tree + SKU */}
        <span className="text-muted-foreground text-xs select-none">↳</span>
        <span className="font-mono text-xs font-medium text-[#0f2942] min-w-0 truncate">{child.sku}</span>

        {/* Modified indicator */}
        {isModified && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">custom</span>
        )}

        {/* Combo pills */}
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {child.combo.map((c, i) => {
            const dc = dimColors[i % dimColors.length];
            return (
              <span key={`${c.groupName}-${c.value.id}`} className="text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0"
                style={{ background: dc.bg, color: dc.text }}>
                {c.groupName}: {c.value.content.en || c.value.content.zh_TW}
              </span>
            );
          })}
        </div>

        {/* Price + Stock summary */}
        <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-[#0f2942]">
              HK${effWebPrice % 1 === 0 ? effWebPrice : effWebPrice.toFixed(2)}
              {override.discount > 0 && (
                <span className="ml-1 text-[10px] text-emerald-600">-{override.discount}%</span>
              )}
            </p>
            <p className="text-[10px] text-muted-foreground">web price</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className={`text-xs font-medium ${totalStock === 0 ? 'text-red-500' : totalStock <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {totalStock} units
            </p>
            <p className="text-[10px] text-muted-foreground">total stock</p>
          </div>
        </div>

        <CopyButton text={child.sku} />
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-white space-y-4">
          {/* Pricing */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700">Pricing Override</span>
              {isModified && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); resetToParent(); }}
                  className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground hover:text-[#0f2942] transition-colors"
                >
                  <RefreshCcw className="w-3 h-3" /> Reset to parent
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {([
                { label: 'Purchase', field: 'purchasePrice' as const, color: 'text-slate-600' },
                { label: 'Wholesale', field: 'wholePrice' as const, color: 'text-blue-600' },
                { label: 'Retail', field: 'retailPrice' as const, color: 'text-purple-600' },
                { label: 'Web', field: 'webPrice' as const, color: 'text-emerald-600' },
                { label: 'Disc %', field: 'discount' as const, color: 'text-amber-600' },
              ] as const).map(({ label, field, color }) => (
                <div key={field} className="space-y-0.5">
                  <label className={`text-[11px] ${color}`}>{label}</label>
                  <div className="relative">
                    {field !== 'discount' && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                    )}
                    <Input
                      type="number" min={0} step="0.01"
                      className={`h-8 text-xs ${field !== 'discount' ? 'pl-5' : ''}`}
                      value={override[field]}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updatePrice(field, parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              ))}
            </div>
            {override.discount > 0 && (
              <p className="mt-1.5 text-[11px] text-emerald-600">
                Effective web price: <strong>HK${(override.webPrice * (1 - override.discount / 100)).toFixed(2)}</strong>
              </p>
            )}
          </div>

          {/* Stock */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">Stock Levels</span>
              <span className={`ml-auto text-[11px] px-2 py-0.5 rounded-full ${
                totalStock === 0 ? 'bg-red-100 text-red-600'
                : totalStock <= 5 ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-700'
              }`}>
                Total: {totalStock} units
              </span>
            </div>
            <div className="space-y-1.5">
              {override.stockLevels.map((sl) => (
                <div key={sl.warehouseId} className="flex items-center gap-3 p-2 rounded-lg bg-amber-50/50 border border-amber-100">
                  <span className="text-xs text-[#0f2942] flex-1 min-w-0 truncate">{sl.warehouseName}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Input
                      type="number" min={0}
                      className="w-20 h-7 text-xs bg-white"
                      value={sl.qty}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateStock(sl.warehouseId, parseInt(e.target.value) || 0)}
                    />
                    <span className="text-[11px] text-muted-foreground">units</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ChildSkuPanel ────────────────────────────────────────────────────────

export function ChildSkuPanel({
  parentSku, attrRows, groups,
  warehouses, parentDefaults, overrides, onChange,
}: ChildSkuPanelProps) {
  const [open, setOpen] = useState(true);
  const childSkus = generateChildSkus(parentSku, attrRows, groups);

  const variantRows = attrRows.filter((r) => r.values.length >= 2);
  const dimNames = variantRows.map((r) => groups.find((g) => g.id === r.groupId)?.content.en.name ?? r.groupId);

  if (childSkus.length === 0) {
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

  const handleUpdate = (sku: string, updated: ChildSkuOverride) =>
    onChange({ ...overrides, [sku]: updated });

  const totalVariantStock = childSkus.reduce((sum, c) => {
    const o = getEffective(c.sku, overrides, parentDefaults, warehouses);
    return sum + totalChildStock(o);
  }, 0);

  return (
    <div className="mt-4 rounded-xl border border-[#0f2942]/20 overflow-hidden">
      {/* Panel header */}
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 bg-[#0f2942]/5 hover:bg-[#0f2942]/10 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <GitBranch className="w-4 h-4 text-[#0f2942]" />
        <div className="flex-1 flex items-center flex-wrap gap-2">
          <span className="text-sm font-medium text-[#0f2942]">Variant Child SKUs</span>
          <span className="text-xs bg-[#0f2942] text-white rounded-full px-2 py-0.5">{childSkus.length}</span>
          <span className="text-xs text-muted-foreground">from {dimNames.join(' × ')}</span>
          <span className="ml-auto text-xs text-muted-foreground hidden sm:inline">
            Total variant stock: <strong className="text-[#0f2942]">{totalVariantStock}</strong> units
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-[#0f2942] flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#0f2942] flex-shrink-0" />}
      </button>

      {open && (
        <div className="p-4 bg-white space-y-3">
          {/* Dimension legend */}
          <div className="flex flex-wrap gap-2">
            {dimNames.map((name, i) => {
              const c = DIM_COLORS[i % DIM_COLORS.length];
              const row = variantRows[i];
              return (
                <div key={name} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs"
                  style={{ background: c.bg, borderColor: c.border, color: c.text }}>
                  <span className="font-medium">{name}:</span>
                  {row.values
                    .map((v) => <span key={v.id} className="font-mono">{effectiveCode(v)}</span>)
                    .reduce((acc: React.ReactNode[], el, idx) =>
                      idx === 0 ? [el] : [...acc, <span key={`s${idx}`} className="opacity-40">/</span>, el], []
                    )}
                </div>
              );
            })}
          </div>

          {/* Child SKU rows */}
          <div className="space-y-1.5">
            {childSkus.map((child) => {
              const override = getEffective(child.sku, overrides, parentDefaults, warehouses);
              return (
                <ChildSkuRow
                  key={child.sku}
                  child={child}
                  dimColors={DIM_COLORS}
                  override={override}
                  parentDefaults={parentDefaults}
                  warehouses={warehouses}
                  onUpdate={(updated) => handleUpdate(child.sku, updated)}
                />
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground pt-1">
            Click any row to expand pricing &amp; stock. Edit a value badge's <strong>SKU Short Code</strong> above to change the suffix.
          </p>
        </div>
      )}
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
