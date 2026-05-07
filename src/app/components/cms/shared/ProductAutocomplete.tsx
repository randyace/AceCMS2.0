import React, { useState, useRef, useEffect, useCallback } from 'react';
import { searchCatalog, CatalogProduct } from './productCatalog';

interface ProductAutocompleteProps {
  /** Current input value (sku or product name) */
  value: string;
  onChange: (value: string) => void;
  onSelect: (product: CatalogProduct) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Visual style hint: 'sku' renders in monospace */
  mode?: 'sku' | 'name';
}

/** Highlight the matching portion of text */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[#cec18a]/50 text-inherit rounded-sm px-0">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function ProductAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  className = '',
  disabled = false,
  mode = 'name',
}: ProductAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<CatalogProduct[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search whenever value changes
  useEffect(() => {
    const r = searchCatalog(value);
    setResults(r);
    setActiveIdx(-1);
    setOpen(r.length > 0 && value.trim().length > 0);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = useCallback((product: CatalogProduct) => {
    onSelect(product);
    setOpen(false);
    setResults([]);
  }, [onSelect]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && results[activeIdx]) handleSelect(results[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => { if (results.length > 0 && value.trim()) setOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={[
          'flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm',
          'ring-offset-background transition-colors',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          mode === 'sku' ? 'font-mono' : '',
          className,
        ].join(' ')}
      />

      {open && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-border rounded-lg shadow-lg overflow-hidden">
          {/* Header hint */}
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground bg-muted/40 border-b border-border flex justify-between">
            <span>Matching products</span>
            <span className="text-[10px]">↑↓ navigate · Enter select · Esc close</span>
          </div>
          <ul className="max-h-56 overflow-y-auto">
            {results.map((product, idx) => (
              <li key={product.sku}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(product); }}
                  onMouseEnter={() => setActiveIdx(idx)}
                  className={[
                    'w-full text-left px-3 py-2 flex items-start gap-3 transition-colors',
                    idx === activeIdx ? 'bg-[#0f2942]/8 bg-[#eef1f5]' : 'hover:bg-muted/50',
                  ].join(' ')}
                >
                  {/* SKU badge */}
                  <span className="flex-shrink-0 font-mono text-[11px] text-[#0f2942] bg-[#0f2942]/8 px-1.5 py-0.5 rounded mt-0.5 min-w-[80px] text-center">
                    <Highlight text={product.sku} query={value} />
                  </span>
                  {/* Name + category */}
                  <span className="flex-1 min-w-0">
                    <span className="text-sm block truncate">
                      <Highlight text={product.name} query={value} />
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {product.category} · {product.brand}
                    </span>
                  </span>
                  {/* Prices */}
                  <span className="flex-shrink-0 text-right">
                    <span className="text-[11px] text-emerald-600 block">Retail HK${product.retailPrice}</span>
                    <span className="text-[11px] text-muted-foreground">Cost HK${product.purchasePrice}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}