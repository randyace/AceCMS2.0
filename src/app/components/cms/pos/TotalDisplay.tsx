import React from 'react';
import { formatCurrency, type PosMode } from './__fixtures__/pos.mocks';

interface TotalDisplayProps {
  subtotal?: number;
  totalDiscount?: number;
  grandTotal?: number;
  amountPaid?: number;
  change?: number;
  itemCount?: number;
  mode?: PosMode;
  currency?: string;
}

export function TotalDisplay({
  subtotal = 5383.0,
  totalDiscount = 250.0,
  grandTotal = 5133.0,
  amountPaid = 5133.0,
  change = 0,
  itemCount = 5,
  mode = 'touch',
  currency = 'HKD',
}: TotalDisplayProps) {
  const fmt = (v: number) => formatCurrency(v, currency);
  const isTouch = mode === 'touch';

  /* ─── Touch Mode ──────────────────────────────────────────────────────────── */
  if (isTouch) {
    return (
      <div className="flex-shrink-0 bg-[#0f2942] mx-3 mb-3 rounded-2xl overflow-hidden">
        {/* Meta row */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-white/50 text-xs">{itemCount} items</span>
            {totalDiscount > 0 && (
              <>
                <span className="text-white/20">·</span>
                <span className="text-orange-400 text-xs">
                  Discount: −{fmt(totalDiscount)}
                </span>
              </>
            )}
          </div>
          <span className="text-white/30 text-xs uppercase tracking-wide">Total Amount</span>
        </div>

        {/* Grand total – hero */}
        <div className="px-5 pb-4">
          <p
            className="text-white tabular-nums text-right"
            style={{ fontSize: 'clamp(28px, 3vw, 48px)', fontWeight: 700, lineHeight: 1.1 }}
          >
            {fmt(grandTotal)}
          </p>
        </div>

        {/* Paid / Change */}
        <div className="flex items-stretch border-t border-white/10">
          <div className="flex-1 px-5 py-3">
            <p className="text-white/40 text-xs mb-0.5">Amount Paid</p>
            <p className="text-white text-base tabular-nums font-semibold">{fmt(amountPaid)}</p>
          </div>
          <div className="w-px bg-white/10" />
          <div className="flex-1 px-5 py-3">
            <p className="text-white/40 text-xs mb-0.5">Change</p>
            <p
              className={`text-base tabular-nums font-semibold ${
                change >= 0 ? 'text-[#cec18a]' : 'text-red-400'
              }`}
            >
              {fmt(Math.max(0, change))}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Keyboard Mode ───────────────────────────────────────────────────────── */
  return (
    <div className="flex-shrink-0 bg-[#1a3f5c] px-4 py-2 flex items-center gap-4 text-xs border-t border-white/10">
      <div className="flex items-center gap-1.5 text-white/60">
        <span className="font-medium text-white">{itemCount}</span>
        <span>items</span>
      </div>

      <div className="w-px h-4 bg-white/20" />

      {totalDiscount > 0 && (
        <>
          <div className="flex items-center gap-1.5">
            <span className="text-white/50">Disc:</span>
            <span className="text-orange-400 tabular-nums font-medium">−{fmt(totalDiscount)}</span>
          </div>
          <div className="w-px h-4 bg-white/20" />
        </>
      )}

      <div className="flex items-center gap-1.5">
        <span className="text-white/50">Subtotal:</span>
        <span className="text-white/70 tabular-nums">{fmt(subtotal)}</span>
      </div>

      <div className="w-px h-4 bg-white/20" />

      <div className="flex items-center gap-1.5">
        <span className="text-white/60 uppercase tracking-wide font-medium">Total:</span>
        <span className="text-[#cec18a] tabular-nums font-bold text-sm">{fmt(grandTotal)}</span>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-white/50">Paid:</span>
          <span className="text-white tabular-nums font-medium">{fmt(amountPaid)}</span>
        </div>
        <div className="w-px h-4 bg-white/20" />
        <div className="flex items-center gap-1.5">
          <span className="text-white/50">Change:</span>
          <span
            className={`tabular-nums font-semibold ${
              change >= 0 ? 'text-[#cec18a]' : 'text-red-400'
            }`}
          >
            {fmt(Math.max(0, change))}
          </span>
        </div>
      </div>
    </div>
  );
}
