import React from 'react';
import { KEYBOARD_SHORTCUTS, type ShortcutDef } from './__fixtures__/pos.mocks';

interface KeyboardActionBarProps {
  shortcuts?: ShortcutDef[];
  onShortcut: (action: string) => void;
}

export function KeyboardActionBar({
  shortcuts = KEYBOARD_SHORTCUTS,
  onShortcut,
}: KeyboardActionBarProps) {
  return (
    <div className="flex-shrink-0 bg-[#0f2942] border-t border-white/10 flex items-center overflow-x-auto">
      {shortcuts.map((shortcut, idx) => (
        <React.Fragment key={shortcut.key}>
          {idx > 0 && <div className="w-px h-6 bg-white/10 flex-shrink-0" />}
          <button
            onClick={() => onShortcut(shortcut.action)}
            className="flex items-center gap-1.5 px-3 py-2.5 hover:bg-white/10 transition-colors whitespace-nowrap group"
          >
            <span className="text-[10px] font-mono font-semibold text-[#cec18a] bg-[#cec18a]/10 px-1.5 py-0.5 rounded group-hover:bg-[#cec18a]/20 transition-colors">
              {shortcut.key}
            </span>
            <span className="text-white/70 text-xs group-hover:text-white transition-colors">
              {shortcut.label}
            </span>
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
