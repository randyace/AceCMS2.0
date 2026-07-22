import React, { useRef, useEffect } from 'react';
import { Search, Scan, X } from 'lucide-react';
import type { PosMode } from './__fixtures__/pos.mocks';

interface BarcodeSearchProps {
  value: string;
  onChange: (v: string) => void;
  onSearch: (v: string) => void;
  mode: PosMode;
  autoFocus?: boolean;
}

export function BarcodeSearch({
  value,
  onChange,
  onSearch,
  mode = 'touch',
  autoFocus = true,
}: BarcodeSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [autoFocus, mode]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearch(value);
  };

  const isTouch = mode === 'touch';

  return (
    <div className={`px-4 flex-shrink-0 ${isTouch ? 'py-3' : 'py-2'}`}>
      <div
        className={`relative flex items-center bg-white border-2 rounded-xl transition-colors focus-within:border-[#0f2942] ${
          isTouch ? 'h-14 border-gray-200' : 'h-9 border-gray-300'
        }`}
      >
        <Scan
          className={`absolute left-4 text-gray-400 flex-shrink-0 ${isTouch ? 'w-5 h-5' : 'w-4 h-4'}`}
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isTouch
              ? 'Scan barcode or type item name / SKU…'
              : 'Barcode / SKU / Item name   [Enter to search]'
          }
          className={`w-full bg-transparent outline-none text-gray-900 placeholder-gray-400 ${
            isTouch ? 'pl-12 pr-32 text-base' : 'pl-10 pr-28 text-xs'
          }`}
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className={`absolute text-gray-400 hover:text-gray-600 transition-colors ${isTouch ? 'right-[108px]' : 'right-[88px]'}`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => onSearch(value)}
          className={`absolute right-2 flex items-center gap-1.5 bg-[#0f2942] text-white rounded-lg transition-colors hover:bg-[#1a3f5c] ${
            isTouch ? 'h-10 px-4 text-sm' : 'h-6 px-2.5 text-xs'
          }`}
        >
          <Search className={isTouch ? 'w-4 h-4' : 'w-3 h-3'} />
          <span>Search</span>
        </button>
      </div>
      {!isTouch && (
        <p className="text-[11px] text-gray-400 mt-1 pl-1">
          <span className="font-medium text-[#0f2942]">[F3]</span> to focus ·{' '}
          <span className="font-medium text-[#0f2942]">[Enter]</span> to search ·{' '}
          <span className="font-medium text-[#0f2942]">[Esc]</span> to clear
        </p>
      )}
    </div>
  );
}
