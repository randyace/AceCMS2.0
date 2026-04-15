import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Save, Globe, FileText } from 'lucide-react';
import grapesjs, { Editor } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import presetWebpage from 'grapesjs-preset-webpage';
import blocksBasic from 'grapesjs-blocks-basic';
import pluginForms from 'grapesjs-plugin-forms';
import pluginExport from 'grapesjs-plugin-export';
import { Button } from '../../ui/button';
import { LanguageTabs, ContentLang, LANG_SHORT } from './LanguageTabs';

interface GrapesJSEditorProps {
  initialContent?: Record<ContentLang, string>;
  /** Document / draft id for admin reference */
  pageId?: string;
  onSave: (content: Record<ContentLang, string>) => void | Promise<void>;
  onCancel: () => void;
  /** Switch to standard/rich-text editing; receives current HTML snapshot per language (in-memory, not saved). */
  onSwitchToStandard?: (htmlByLang: Record<ContentLang, string>) => void;
}

const CMS_THEME = {
  primary: '#0f2942',
  accent: '#cec18a',
  light: '#1a4a6e',
};

const GJS_CSS_BEGIN = '<!--__CMS_GJS_CSS__-->';
const GJS_HTML_BEGIN = '<!--__CMS_GJS_HTML__-->';
const GJS_PACK_RE =
  /^<!--__CMS_GJS_CSS__--><style[^>]*>([\s\S]*?)<\/style><!--__CMS_GJS_HTML__-->([\s\S]*)$/;

const PLACEHOLDER_HTML =
  '<div style="padding:40px;text-align:center;color:#666;">Click a block from the left panel to start building your page...</div>';

/** Persist GrapesJS class-based CSS with body HTML so reload / language switch stay faithful. */
function packGrapesSnapshot(css: string, html: string): string {
  const c = (css || '').trim();
  const h = html || '';
  if (!c) return h;
  const safeCss = c.replace(/<\/style/gi, '<\\/style');
  return `${GJS_CSS_BEGIN}<style type="text/css">${safeCss}</style>${GJS_HTML_BEGIN}${h}`;
}

function unpackGrapesSnapshot(raw: string): { css: string; html: string } {
  const trimmed = raw || '';
  const m = trimmed.match(GJS_PACK_RE);
  if (!m) return { css: '', html: trimmed };
  // Must match packGrapesSnapshot escape (same literal as '<\\/style' there); avoid /regex/ — extra / after \\ closes the literal.
  const cssUnescape = '<\\/style';
  return { css: m[1].split(cssUnescape).join('</style'), html: m[2] };
}

function snapshotFromEditor(editor: Editor): string {
  const css = editor.getCss?.() ?? '';
  const html = editor.getHtml?.() ?? '';
  return packGrapesSnapshot(css, html);
}

function applyCanvasFromSnapshot(
  editor: Editor,
  raw: string,
  applyingRef: React.MutableRefObject<boolean>
) {
  applyingRef.current = true;
  try {
    const { css, html } = unpackGrapesSnapshot(raw || '');
    editor.setStyle(css || '');
    const body = (html || '').trim();
    if (body) {
      editor.setComponents(body);
    } else {
      editor.setComponents(PLACEHOLDER_HTML);
    }
  } finally {
    // Grapes fires component:* handlers in the same turn; defer so we don't persist partial loads into the wrong language.
    setTimeout(() => {
      applyingRef.current = false;
    }, 0);
  }
}

export function GrapesJSEditor({ initialContent, pageId, onSave, onCancel, onSwitchToStandard }: GrapesJSEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const grapesRef = useRef<Editor | null>(null);
  const [activeLang, setActiveLang] = useState<ContentLang>('en');
  const [isSaving, setIsSaving] = useState(false);
  /** Must track latest tab: editor listeners are registered once and cannot close over stale `activeLang`. */
  const activeLangRef = useRef<ContentLang>('en');
  /** Skip persist while programmatically loading HTML/CSS (avoids overwriting other langs' snapshots). */
  const applyingSnapshotRef = useRef(false);

  const contentRef = useRef<Record<ContentLang, string>>({
    en: initialContent?.en ?? '',
    zh_TW: initialContent?.zh_TW ?? '',
    zh_CN: initialContent?.zh_CN ?? '',
  });

  useEffect(() => {
    activeLangRef.current = activeLang;
  }, [activeLang]);

  useEffect(() => {
    if (!editorRef.current || grapesRef.current) return;

    const editor = grapesjs.init({
      container: '#grapesjs-editor',
      height: 'calc(100vh - 140px)',
      storageManager: false,
      undoManager: true,
      fromElement: false,
      noticeOnUnload: false,
      clearOnRender: true,
      plugins: [presetWebpage, blocksBasic, pluginForms, pluginExport],
      pluginsOpts: {
        'grapesjs-preset-webpage': {
          modalImportTitle: 'Import template',
          modalImportLabel: '<div style="margin-bottom:10px; font-size:13px;">Paste your HTML/CSS and continue editing visually.</div>',
          modalImportButton: 'Import',
          importViewerOptions: {},
          navigator: true,
          blocksBasicOpts: { flexGrid: true },
          formPredefinedActions: [
            { name: 'Submit', value: '' },
            { name: 'Reset', value: 'reset' },
          ],
        },
        'grapesjs-blocks-basic': {
          flexGrid: true,
          blocks: [
            'column1',
            'column2',
            'column3',
            'text',
            'link',
            'image',
            'video',
            'map',
          ],
        },
        'grapesjs-plugin-forms': {},
        'grapesjs-plugin-export': {},
      },
      patronTheme: {
        bgColor: '#1a3a5c',
        cColor: '#fff',
        btnColor: '#0f2942',
        btnTextColor: '#fff',
        panelColor: '#0f2942',
        inputBgColor: '#fff',
        inputColor: '#333',
        hoverBgColor: '#1a4a6e',
        hoverColor: '#fff',
        textColor: '#333',
        hoverTextColor: '#fff',
      },
      panels: {
        defaults: [
          {
            id: 'options',
            height: '50px',
            padding: '8px 12px',
            resizable: false,
            options: [
              { id: 'undo', label: '↩', title: 'Undo', action: () => editor.UndoManager.undo() },
              { id: 'redo', label: '↪', title: 'Redo', action: () => editor.UndoManager.redo() },
              {
                id: 'export',
                label: 'Export',
                title: 'Export',
                action: () => {
                  const ed = grapesRef.current;
                  if (ed) contentRef.current[activeLangRef.current] = snapshotFromEditor(ed);
                },
              },
            ],
          },
        ],
      },
      blockManager: {
        appendTo: '#blocks',
        blocks: [
          {
            id: 'section-hero',
            label: 'Hero Section',
            category: 'Sections',
            attributes: { class: 'gjs-fonts gjs-f-h1' },
            content: `<div style="padding:80px 20px;text-align:center;background:linear-gradient(135deg,${CMS_THEME.primary},${CMS_THEME.light});color:white;">
              <h1 style="font-size:48px;margin-bottom:20px;">Your Hero Title</h1>
              <p style="font-size:20px;opacity:0.9;">Compelling subtitle text goes here</p>
              <div style="margin-top:30px;"><button style="padding:12px 32px;font-size:16px;background:${CMS_THEME.accent};color:${CMS_THEME.primary};border:none;border-radius:8px;cursor:pointer;">Call to Action</button></div>
            </div>`,
          },
          {
            id: 'section-features',
            label: 'Features Grid',
            category: 'Sections',
            content: `<div style="padding:60px 20px;background:#f8f9fa;">
              <h2 style="text-align:center;font-size:32px;margin-bottom:40px;color:${CMS_THEME.primary};">Our Features</h2>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:30px;max-width:1200px;margin:0 auto;">
                <div style="text-align:center;padding:30px;background:white;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.1);">
                  <div style="width:60px;height:60px;background:${CMS_THEME.accent};border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:24px;">⭐</div>
                  <h3 style="margin-bottom:10px;color:${CMS_THEME.primary};">Feature One</h3>
                  <p style="color:#666;font-size:14px;">Description of your amazing feature goes here.</p>
                </div>
                <div style="text-align:center;padding:30px;background:white;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.1);">
                  <div style="width:60px;height:60px;background:${CMS_THEME.accent};border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:24px;">🚀</div>
                  <h3 style="margin-bottom:10px;color:${CMS_THEME.primary};">Feature Two</h3>
                  <p style="color:#666;font-size:14px;">Description of your amazing feature goes here.</p>
                </div>
                <div style="text-align:center;padding:30px;background:white;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.1);">
                  <div style="width:60px;height:60px;background:${CMS_THEME.accent};border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:24px;">💡</div>
                  <h3 style="margin-bottom:10px;color:${CMS_THEME.primary};">Feature Three</h3>
                  <p style="color:#666;font-size:14px;">Description of your amazing feature goes here.</p>
                </div>
              </div>
            </div>`,
          },
          {
            id: 'section-pricing',
            label: 'Pricing Table',
            category: 'Sections',
            content: `<div style="padding:60px 20px;background:white;">
              <h2 style="text-align:center;font-size:32px;margin-bottom:40px;color:${CMS_THEME.primary};">Pricing Plans</h2>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:30px;max-width:1000px;margin:0 auto;">
                <div style="border:2px solid #eee;border-radius:16px;padding:40px 30px;text-align:center;transition:all 0.3s;">
                  <h3 style="font-size:20px;color:${CMS_THEME.primary};margin-bottom:10px;">Basic</h3>
                  <div style="font-size:40px;font-weight:bold;color:${CMS_THEME.primary};margin-bottom:20px;">$19<span style="font-size:16px;color:#666;">/mo</span></div>
                  <ul style="list-style:none;padding:0;margin-bottom:30px;color:#666;">
                    <li style="padding:8px 0;">✓ Feature 1</li>
                    <li style="padding:8px 0;">✓ Feature 2</li>
                    <li style="padding:8px 0;">✓ Feature 3</li>
                  </ul>
                  <button style="width:100%;padding:12px;border:2px solid ${CMS_THEME.primary};background:white;color:${CMS_THEME.primary};border-radius:8px;cursor:pointer;font-weight:600;">Get Started</button>
                </div>
                <div style="border:2px solid ${CMS_THEME.accent};border-radius:16px;padding:40px 30px;text-align:center;background:${CMS_THEME.primary};color:white;transform:scale(1.05);">
                  <div style="background:${CMS_THEME.accent};color:${CMS_THEME.primary};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;display:inline-block;margin-bottom:15px;">POPULAR</div>
                  <h3 style="font-size:20px;margin-bottom:10px;">Pro</h3>
                  <div style="font-size:40px;font-weight:bold;margin-bottom:20px;">$49<span style="font-size:16px;opacity:0.8;">/mo</span></div>
                  <ul style="list-style:none;padding:0;margin-bottom:30px;">
                    <li style="padding:8px 0;">✓ All Basic features</li>
                    <li style="padding:8px 0;">✓ Feature 4</li>
                    <li style="padding:8px 0;">✓ Feature 5</li>
                  </ul>
                  <button style="width:100%;padding:12px;border:none;background:${CMS_THEME.accent};color:${CMS_THEME.primary};border-radius:8px;cursor:pointer;font-weight:600;">Get Started</button>
                </div>
              </div>
            </div>`,
          },
          {
            id: 'section-faq',
            label: 'FAQ Accordion',
            category: 'Sections',
            content: `<div style="padding:60px 20px;background:#f8f9fa;">
              <h2 style="text-align:center;font-size:32px;margin-bottom:40px;color:${CMS_THEME.primary};">Frequently Asked Questions</h2>
              <div style="max-width:800px;margin:0 auto;">
                <details style="background:white;border-radius:12px;margin-bottom:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                  <summary style="padding:20px 24px;font-weight:600;cursor:pointer;color:${CMS_THEME.primary};">What is your question?</summary>
                  <div style="padding:0 24px 20px;color:#666;line-height:1.6;">Answer to the question goes here. Provide helpful information that addresses the user's concern.</div>
                </details>
                <details style="background:white;border-radius:12px;margin-bottom:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                  <summary style="padding:20px 24px;font-weight:600;cursor:pointer;color:${CMS_THEME.primary};">Another common question?</summary>
                  <div style="padding:0 24px 20px;color:#666;line-height:1.6;">Answer to the question goes here. Provide helpful information that addresses the user's concern.</div>
                </details>
                <details style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                  <summary style="padding:20px 24px;font-weight:600;cursor:pointer;color:${CMS_THEME.primary};">How about this question?</summary>
                  <div style="padding:0 24px 20px;color:#666;line-height:1.6;">Answer to the question goes here. Provide helpful information that addresses the user's concern.</div>
                </details>
              </div>
            </div>`,
          },
          {
            id: 'section-cta',
            label: 'Call to Action',
            category: 'Sections',
            content: `<div style="padding:80px 20px;text-align:center;background:linear-gradient(135deg,${CMS_THEME.accent},#d4af37);">
              <h2 style="font-size:36px;color:${CMS_THEME.primary};margin-bottom:16px;">Ready to Get Started?</h2>
              <p style="font-size:18px;color:${CMS_THEME.primary};opacity:0.9;margin-bottom:30px;">Join thousands of satisfied customers today.</p>
              <button style="padding:16px 40px;font-size:18px;background:${CMS_THEME.primary};color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Contact Us Now</button>
            </div>`,
          },
          {
            id: 'section-footer',
            label: 'Footer',
            category: 'Sections',
            content: `<footer style="background:${CMS_THEME.primary};color:white;padding:60px 20px 30px;">
              <div style="max-width:1200px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:40px;">
                <div>
                  <h4 style="font-size:18px;margin-bottom:20px;color:${CMS_THEME.accent};">Company</h4>
                  <ul style="list-style:none;padding:0;line-height:2;">
                    <li><a href="#" style="color:white;opacity:0.8;text-decoration:none;">About Us</a></li>
                    <li><a href="#" style="color:white;opacity:0.8;text-decoration:none;">Our Team</a></li>
                    <li><a href="#" style="color:white;opacity:0.8;text-decoration:none;">Careers</a></li>
                  </ul>
                </div>
                <div>
                  <h4 style="font-size:18px;margin-bottom:20px;color:${CMS_THEME.accent};">Resources</h4>
                  <ul style="list-style:none;padding:0;line-height:2;">
                    <li><a href="#" style="color:white;opacity:0.8;text-decoration:none;">Blog</a></li>
                    <li><a href="#" style="color:white;opacity:0.8;text-decoration:none;">Help Center</a></li>
                    <li><a href="#" style="color:white;opacity:0.8;text-decoration:none;">Contact</a></li>
                  </ul>
                </div>
                <div>
                  <h4 style="font-size:18px;margin-bottom:20px;color:${CMS_THEME.accent};">Legal</h4>
                  <ul style="list-style:none;padding:0;line-height:2;">
                    <li><a href="#" style="color:white;opacity:0.8;text-decoration:none;">Privacy Policy</a></li>
                    <li><a href="#" style="color:white;opacity:0.8;text-decoration:none;">Terms of Service</a></li>
                  </ul>
                </div>
              </div>
              <div style="max-width:1200px;margin:40px auto 0;padding-top:30px;border-top:1px solid rgba(255,255,255,0.2);text-align:center;opacity:0.7;">
                <p>&copy; 2024 Your Company. All rights reserved.</p>
              </div>
            </footer>`,
          },
          {
            id: 'text-basic',
            label: 'Text Block',
            category: 'Basic',
            content: '<div style="padding:20px;"><h2 style="margin-bottom:15px;color:#333;">Section Title</h2><p style="color:#666;line-height:1.8;">Your content goes here. Add your text, describe your products, or share your story.</p></div>',
          },
          {
            id: 'image-basic',
            label: 'Image',
            category: 'Basic',
            content: '<div style="padding:20px;text-align:center;"><img src="https://via.placeholder.com/800x400" alt="Placeholder" style="max-width:100%;height:auto;border-radius:8px;" /></div>',
          },
          {
            id: 'button-basic',
            label: 'Button',
            category: 'Basic',
            content: '<div style="padding:20px;text-align:center;"><button style="padding:12px 32px;background:#0f2942;color:white;border:none;border-radius:6px;cursor:pointer;font-size:16px;">Click Me</button></div>',
          },
          {
            id: 'divider',
            label: 'Divider',
            category: 'Basic',
            content: '<hr style="border:none;height:1px;background:#ddd;margin:30px 20px;" />',
          },
          {
            id: 'columns',
            label: '2 Columns',
            category: 'Layout',
            content: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;padding:30px;">
              <div style="background:#f8f9fa;padding:30px;border-radius:8px;text-align:center;">
                <h3 style="color:#0f2942;margin-bottom:10px;">Column 1</h3>
                <p style="color:#666;">Content for the first column.</p>
              </div>
              <div style="background:#f8f9fa;padding:30px;border-radius:8px;text-align:center;">
                <h3 style="color:#0f2942;margin-bottom:10px;">Column 2</h3>
                <p style="color:#666;">Content for the second column.</p>
              </div>
            </div>`,
          },
          {
            id: 'columns-3',
            label: '3 Columns',
            category: 'Layout',
            content: `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;padding:30px;">
              <div style="background:#f8f9fa;padding:20px;border-radius:8px;text-align:center;">
                <h4 style="color:#0f2942;">Column 1</h4>
              </div>
              <div style="background:#f8f9fa;padding:20px;border-radius:8px;text-align:center;">
                <h4 style="color:#0f2942;">Column 2</h4>
              </div>
              <div style="background:#f8f9fa;padding:20px;border-radius:8px;text-align:center;">
                <h4 style="color:#0f2942;">Column 3</h4>
              </div>
            </div>`,
          },
        ],
      },
      canvas: {
        styles: [
          'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
        ],
      },
    });

    // Add richer reusable blocks on top of plugins for CMS use-cases.
    const bm = editor.BlockManager;
    bm.add('section-testimonials', {
      label: 'Testimonials',
      category: 'Sections',
      content: `<section style="padding:60px 20px;background:#f7f7f7;">
        <div style="max-width:1100px;margin:0 auto;">
          <h2 style="text-align:center;color:${CMS_THEME.primary};margin-bottom:30px;">What clients say</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;">
            <blockquote style="background:#fff;padding:24px;border-radius:12px;">"Great service and results."<br/><strong>- Client A</strong></blockquote>
            <blockquote style="background:#fff;padding:24px;border-radius:12px;">"Fast and professional team."<br/><strong>- Client B</strong></blockquote>
            <blockquote style="background:#fff;padding:24px;border-radius:12px;">"Highly recommended."<br/><strong>- Client C</strong></blockquote>
          </div>
        </div>
      </section>`,
    });
    bm.add('section-gallery', {
      label: 'Image Gallery',
      category: 'Media',
      content: `<section style="padding:50px 20px;background:#fff;">
        <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;">
          <img src="https://picsum.photos/500/350?1" style="width:100%;border-radius:10px;" alt="Gallery"/>
          <img src="https://picsum.photos/500/350?2" style="width:100%;border-radius:10px;" alt="Gallery"/>
          <img src="https://picsum.photos/500/350?3" style="width:100%;border-radius:10px;" alt="Gallery"/>
          <img src="https://picsum.photos/500/350?4" style="width:100%;border-radius:10px;" alt="Gallery"/>
        </div>
      </section>`,
    });
    bm.add('section-stats', {
      label: 'Stats Counter',
      category: 'Sections',
      content: `<section style="padding:50px 20px;background:${CMS_THEME.primary};color:#fff;">
        <div style="max-width:1000px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:20px;text-align:center;">
          <div><div style="font-size:34px;font-weight:700;">250+</div><div>Projects</div></div>
          <div><div style="font-size:34px;font-weight:700;">98%</div><div>Satisfaction</div></div>
          <div><div style="font-size:34px;font-weight:700;">24/7</div><div>Support</div></div>
          <div><div style="font-size:34px;font-weight:700;">15</div><div>Years</div></div>
        </div>
      </section>`,
    });

    // Ensure blocks always show icons, even if GrapesJS font icons fail to load.
    const getFallbackMedia = (categoryName: string) => {
      switch (categoryName) {
        case 'Sections':
          return '<div style="font-size:16px;line-height:1">🧱</div>';
        case 'Basic':
          return '<div style="font-size:16px;line-height:1">🔤</div>';
        case 'Layout':
          return '<div style="font-size:16px;line-height:1">📐</div>';
        case 'Media':
          return '<div style="font-size:16px;line-height:1">🖼️</div>';
        case 'Forms':
          return '<div style="font-size:16px;line-height:1">📝</div>';
        default:
          return '<div style="font-size:16px;line-height:1">⬛</div>';
      }
    };

    editor.on('load', () => {
      bm.getAll().forEach((block) => {
        const category = block.get('category');
        const categoryName = typeof category === 'string'
          ? category
          : (category && typeof category.get === 'function' ? category.get('id') || category.get('label') : '');
        const attrs = block.get('attributes') || {};
        if (!attrs.class) {
          block.set('attributes', {
            ...attrs,
            class: 'gjs-fonts gjs-f-b1',
          });
        }
        const media = block.get('media');
        if (!media) {
          block.set('media', getFallbackMedia(String(categoryName || '')));
        }
      });
    });

    grapesRef.current = editor;

    const initialForActive = contentRef.current[activeLangRef.current] ?? '';
    applyCanvasFromSnapshot(editor, initialForActive, applyingSnapshotRef);

    const persistActiveLang = () => {
      if (applyingSnapshotRef.current) return;
      const lang = activeLangRef.current;
      contentRef.current[lang] = snapshotFromEditor(editor);
    };

    editor.on('component:add', persistActiveLang);
    editor.on('component:update', persistActiveLang);
    editor.on('component:remove', persistActiveLang);
    editor.on('component:styleUpdate', persistActiveLang);

    return () => {
      if (grapesRef.current) {
        grapesRef.current.destroy();
        grapesRef.current = null;
      }
    };
  }, []);

  const saveCurrentLang = () => {
    const ed = grapesRef.current;
    if (ed) contentRef.current[activeLangRef.current] = snapshotFromEditor(ed);
  };

  const switchLanguage = (lang: ContentLang) => {
    saveCurrentLang();
    // Keep ref in sync before any canvas updates; useEffect runs too late and persist would write to the wrong language key.
    activeLangRef.current = lang;
    setActiveLang(lang);
    if (grapesRef.current) {
      applyCanvasFromSnapshot(grapesRef.current, contentRef.current[lang] || '', applyingSnapshotRef);
    }
  };

  const handleSave = async () => {
    saveCurrentLang();
    setIsSaving(true);
    try {
      await Promise.resolve(onSave(contentRef.current));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSwitchToStandard = () => {
    saveCurrentLang();
    onSwitchToStandard?.({
      en: contentRef.current.en ?? '',
      zh_TW: contentRef.current.zh_TW ?? '',
      zh_CN: contentRef.current.zh_CN ?? '',
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Visual Builder</h1>
            <p className="text-sm text-muted-foreground">
              Drag and drop to build your page
              {pageId != null && pageId !== '' && (
                <span className="font-mono text-xs ml-2">· ID {pageId}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border rounded-lg p-1 bg-muted/30">
            <Globe className="w-4 h-4 text-muted-foreground ml-2" />
            {(Object.keys(LANG_SHORT) as ContentLang[]).map((lang) => (
              <button
                key={lang}
                onClick={() => switchLanguage(lang)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  activeLang === lang
                    ? 'bg-[#0f2942] text-white'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {LANG_SHORT[lang]}
              </button>
            ))}
          </div>

          {onSwitchToStandard && (
            <Button type="button" variant="secondary" onClick={handleSwitchToStandard}>
              <FileText className="w-4 h-4 mr-1" />
              Standard editor
            </Button>
          )}
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-1" />
            {isSaving ? 'Saving...' : 'Save Page'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 border-r bg-muted/20 overflow-y-auto flex-shrink-0">
          <div className="p-3 border-b bg-muted/30">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Blocks</h3>
          </div>
          <div id="blocks" className="p-2" />
        </div>

        <div className="flex-1 overflow-auto bg-[#f8f9fa]">
          <div id="grapesjs-editor" ref={editorRef} />
        </div>
      </div>
    </div>
  );
}
