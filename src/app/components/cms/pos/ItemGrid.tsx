import React from 'react';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import {
  MOCK_ORDER_ITEMS,
  formatCurrency,
  type OrderItem,
  type PosMode,
} from './__fixtures__/pos.mocks';

interface ItemGridProps {
  items?: OrderItem[];
  mode?: PosMode;
  currency?: string;
  onQtyChange: (id: string, qty: number) => void;
  onDiscountChange: (id: string, discount: number) => void;
  onRemove: (id: string) => void;
}

export function ItemGrid({
  items = MOCK_ORDER_ITEMS,
  mode = 'touch',
  currency = 'HKD',
  onQtyChange,
  onDiscountChange,
  onRemove,
}: ItemGridProps) {
  const isTouch = mode === 'touch';
  const fmt = (v: number) => formatCurrency(v, currency);

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-12 px-6">
        <ShoppingCart className={`mb-3 opacity-30 ${isTouch ? 'w-16 h-16' : 'w-10 h-10'}`} />
        <p className={`text-center ${isTouch ? 'text-base' : 'text-sm'}`}>
          {isTouch ? 'Scan a barcode or search to add items' : 'No items · Press [F3] to search'}
        </p>
      </div>
    );
  }

  /* ─── Touch Mode ──────────────────────────────────────────────────────────── */
  if (isTouch) {
    return (
      <div className="flex-1 overflow-y-auto min-h-0">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-2.5 pl-4 pr-2 text-xs text-gray-500 uppercase tracking-wide font-medium w-8">#</th>
              <th className="text-left py-2.5 px-2 text-xs text-gray-500 uppercase tracking-wide font-medium w-[13%]">SKU</th>
              <th className="text-left py-2.5 px-2 text-xs text-gray-500 uppercase tracking-wide font-medium">Product Name</th>
              <th className="text-center py-2.5 px-2 text-xs text-gray-500 uppercase tracking-wide font-medium w-[14%]">QTY</th>
              <th className="text-right py-2.5 px-2 text-xs text-gray-500 uppercase tracking-wide font-medium w-[13%]">Unit Price</th>
              <th className="text-right py-2.5 px-2 text-xs text-gray-500 uppercase tracking-wide font-medium w-[12%]">Discount</th>
              <th className="text-right py-2.5 px-2 text-xs text-gray-500 uppercase tracking-wide font-medium w-[13%]">Subtotal</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr
                key={item.id}
                className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors group"
              >
                {/* Row # */}
                <td className="py-3 pl-4 pr-2 text-gray-400 text-xs align-middle">{idx + 1}</td>

                {/* SKU */}
                <td className="py-3 px-2 align-middle">
                  <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    {item.sku}
                  </span>
                </td>

                {/* Name */}
                <td className="py-3 px-2 align-middle">
                  <span className="text-gray-900">{item.name}</span>
                </td>

                {/* QTY controls */}
                <td className="py-3 px-2 align-middle">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => onQtyChange(item.id, item.qty - 1)}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors flex-shrink-0"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center text-sm font-semibold text-gray-900 tabular-nums">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => onQtyChange(item.id, item.qty + 1)}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors flex-shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>

                {/* Unit Price */}
                <td className="py-3 px-2 text-right align-middle text-gray-700 text-xs tabular-nums">
                  {fmt(item.unitPrice)}
                </td>

                {/* Discount – editable */}
                <td className="py-3 px-2 text-right align-middle">
                  <input
                    type="number"
                    min={0}
                    value={item.discount}
                    onChange={(e) =>
                      onDiscountChange(item.id, Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    className="w-20 h-8 text-xs text-right border border-gray-200 rounded-lg px-2 bg-white focus:border-[#0f2942] outline-none text-orange-600 tabular-nums"
                  />
                </td>

                {/* Subtotal */}
                <td className="py-3 px-2 text-right align-middle font-semibold text-gray-900 text-xs tabular-nums">
                  {fmt(item.subtotal)}
                </td>

                {/* Remove */}
                <td className="py-3 pr-3 align-middle">
                  <button
                    onClick={() => onRemove(item.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  /* ─── Keyboard Mode ───────────────────────────────────────────────────────── */
  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-[#0f2942]">
            <th className="text-left py-1.5 pl-3 pr-2 text-white/70 font-medium w-7">#</th>
            <th className="text-left py-1.5 px-2 text-white/70 font-medium w-[14%]">SKU</th>
            <th className="text-left py-1.5 px-2 text-white/70 font-medium">Product Name</th>
            <th className="text-center py-1.5 px-2 text-white/70 font-medium w-[10%]">Qty</th>
            <th className="text-right py-1.5 px-2 text-white/70 font-medium w-[14%]">Unit Price</th>
            <th className="text-right py-1.5 px-2 text-white/70 font-medium w-[12%]">Disc.</th>
            <th className="text-right py-1.5 px-2 text-white/70 font-medium w-[14%]">Subtotal</th>
            <th className="text-center py-1.5 pr-2 text-white/70 font-medium w-[7%]">Del</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr
              key={item.id}
              className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'
              }`}
            >
              {/* # */}
              <td className="py-1 pl-3 pr-2 text-gray-400 tabular-nums">{idx + 1}</td>

              {/* SKU */}
              <td className="py-1 px-2">
                <span className="font-mono text-gray-500">{item.sku}</span>
              </td>

              {/* Name */}
              <td className="py-1 px-2 max-w-0">
                <span className="block truncate text-gray-900">{item.name}</span>
              </td>

              {/* Qty */}
              <td className="py-1 px-2 text-center">
                <input
                  type="number"
                  min={1}
                  value={item.qty}
                  onChange={(e) =>
                    onQtyChange(item.id, Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="w-12 h-6 text-xs text-center border border-gray-300 rounded bg-white focus:border-[#0f2942] outline-none tabular-nums"
                />
              </td>

              {/* Unit Price */}
              <td className="py-1 px-2 text-right text-gray-600 tabular-nums">
                {fmt(item.unitPrice)}
              </td>

              {/* Discount */}
              <td className="py-1 px-2 text-right">
                <input
                  type="number"
                  min={0}
                  value={item.discount}
                  onChange={(e) =>
                    onDiscountChange(item.id, Math.max(0, parseFloat(e.target.value) || 0))
                  }
                  className="w-16 h-6 text-xs text-right border border-gray-300 rounded bg-white focus:border-[#0f2942] outline-none text-orange-600 tabular-nums"
                />
              </td>

              {/* Subtotal */}
              <td className="py-1 px-2 text-right font-semibold text-gray-900 tabular-nums">
                {fmt(item.subtotal)}
              </td>

              {/* Del */}
              <td className="py-1 pr-2 text-center">
                <button
                  onClick={() => onRemove(item.id)}
                  className="px-1.5 py-0.5 text-[10px] text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors font-mono"
                >
                  Del
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
