import React from 'react';
import { Tablet, Keyboard, Clock, Hash } from 'lucide-react';
import type { PosMode } from './__fixtures__/pos.mocks';

interface POSHeaderProps {
  mode: PosMode;
  onModeToggle: (mode: PosMode) => void;
  orderNumber?: string;
  storeName?: string;
  cashierName?: string;
  currentTime?: string;
}

export function POSHeader({
  mode = 'touch',
  onModeToggle,
  orderNumber = 'POS-20260722-0047',
  storeName = 'Main Store – Taipei 101',
  cashierName = 'Alice Wu',
  currentTime = '09:41',
}: POSHeaderProps) {
  const initials = cashierName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center justify-between px-5 py-2.5 bg-[#0f2942] border-b border-white/10 flex-shrink-0">
      {/* Left: Store & Order */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <p className="text-white text-sm truncate max-w-[220px]">{storeName}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Hash className="w-3 h-3 text-[#cec18a] flex-shrink-0" />
            <p className="text-[#cec18a] text-xs font-mono">{orderNumber}</p>
          </div>
        </div>
      </div>

      {/* Center: Mode Toggle */}
      <div className="flex items-center gap-3">
        <span className="text-white/40 text-xs uppercase tracking-widest hidden sm:block">Mode</span>
        <div className="flex items-center bg-white/10 rounded-full p-1 gap-0.5">
          <button
            onClick={() => onModeToggle('touch')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
              mode === 'touch'
                ? 'bg-[#cec18a] text-[#0f2942] shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Tablet className="w-3.5 h-3.5" />
            <span>Touch</span>
          </button>
          <button
            onClick={() => onModeToggle('keyboard')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
              mode === 'keyboard'
                ? 'bg-[#cec18a] text-[#0f2942] shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Speed</span>
          </button>
        </div>
      </div>

      {/* Right: Cashier & Time */}
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-white text-sm">{cashierName}</p>
          <div className="flex items-center justify-end gap-1 mt-0.5">
            <Clock className="w-3 h-3 text-white/40" />
            <p className="text-white/50 text-xs font-mono">{currentTime}</p>
          </div>
        </div>
        <div className="w-8 h-8 bg-[#cec18a] rounded-full flex items-center justify-center text-[#0f2942] text-xs font-semibold flex-shrink-0">
          {initials}
        </div>
      </div>
    </div>
  );
}
