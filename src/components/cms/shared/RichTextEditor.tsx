import React, { useRef } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Link2, Minus,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  label?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter content here...',
  minHeight = '180px',
  label,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wrapSelection = (before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);
    const newValue =
      value.substring(0, start) + before + selected + after + value.substring(end);
    onChange(newValue);
    setTimeout(() => {
      textarea.setSelectionRange(start + before.length, end + before.length);
      textarea.focus();
    }, 0);
  };

  const prefixCurrentLine = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const newValue = value.substring(0, lineStart) + prefix + value.substring(lineStart);
    onChange(newValue);
    setTimeout(() => {
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
      textarea.focus();
    }, 0);
  };

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const newValue = value.substring(0, start) + text + value.substring(start);
    onChange(newValue);
    setTimeout(() => {
      textarea.setSelectionRange(start + text.length, start + text.length);
      textarea.focus();
    }, 0);
  };

  const tools = [
    { icon: Bold, label: 'Bold', action: () => wrapSelection('**', '**') },
    { icon: Italic, label: 'Italic', action: () => wrapSelection('_', '_') },
    { icon: Underline, label: 'Underline', action: () => wrapSelection('<u>', '</u>') },
    { icon: Strikethrough, label: 'Strikethrough', action: () => wrapSelection('~~', '~~') },
    { divider: true },
    { icon: Heading2, label: 'Heading 2', action: () => prefixCurrentLine('## ') },
    { icon: Heading3, label: 'Heading 3', action: () => prefixCurrentLine('### ') },
    { divider: true },
    { icon: List, label: 'Bullet List', action: () => prefixCurrentLine('- ') },
    { icon: ListOrdered, label: 'Numbered List', action: () => prefixCurrentLine('1. ') },
    { icon: Quote, label: 'Blockquote', action: () => prefixCurrentLine('> ') },
    { divider: true },
    { icon: Code, label: 'Inline Code', action: () => wrapSelection('`', '`') },
    { icon: Link2, label: 'Link', action: () => wrapSelection('[', '](https://)') },
    { icon: Minus, label: 'Divider', action: () => insertAtCursor('\n---\n') },
  ] as const;

  return (
    <div className="space-y-1">
      {label && <p className="text-sm text-muted-foreground mb-1">{label}</p>}
      <div className="border border-border rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-ring">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30">
          {tools.map((tool, i) => {
            if ('divider' in tool) {
              return <div key={i} className="w-px h-4 bg-border mx-1" />;
            }
            const Icon = tool.icon;
            return (
              <button
                key={i}
                type="button"
                title={tool.label}
                onClick={tool.action}
                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 bg-transparent outline-none resize-y text-sm font-mono"
          style={{ minHeight }}
        />
      </div>
    </div>
  );
}
