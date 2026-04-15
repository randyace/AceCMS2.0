import { ContentLang } from './LanguageTabs';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AttributeDef {
  id: string;
  shortCode?: string;
  content: Record<ContentLang, { name: string }>;
}

export interface AttributeGroup {
  id: string;
  sortOrder: number;
  content: Record<ContentLang, { name: string }>;
  attributes: AttributeDef[];
}

/** A single value badge on a product (e.g. "Red", "Midnight Black") */
export interface AttrValue {
  id: string;
  defId?: string; // set when selected from the library
  content: Record<ContentLang, string>; // localised display names
  shortCode?: string; // override for SKU suffix generation (e.g. "R", "XL")
}

/** One attribute group row assigned to a product */
export interface AttrRow {
  rowId: string;
  groupId: string;
  values: AttrValue[];
}

// ─── Short-code utilities ──────────────────────────────────────────────────────

/** Auto-derive a short SKU code from a display name. */
export function autoShortCode(text: string): string {
  const t = (text || '').trim();
  if (!t) return '?';
  // Already a short uppercase/digit code like "XL", "XXL", "S"
  if (/^[A-Z0-9]+$/.test(t) && t.length <= 4) return t;
  // Extract consecutive uppercase letters (e.g. "Red" → "R", "Midnight Black" → "MB")
  const upper = t.replace(/[^A-Z]/g, '');
  if (upper.length >= 1 && upper.length <= 4) return upper;
  // Fallback: first char uppercased
  return t.charAt(0).toUpperCase();
}

/** Effective short code: explicit override or auto-derived. */
export function effectiveCode(val: AttrValue): string {
  return (val.shortCode || autoShortCode(val.content.en || val.content.zh_TW || '')).toUpperCase();
}

// ─── Child SKU generation ──────────────────────────────────────────────────────

export interface ChildSku {
  sku: string;
  combo: { groupName: string; value: AttrValue }[];
}

function cartesian<T>(arrays: T[][]): T[][] {
  return arrays.reduce<T[][]>(
    (acc, arr) => acc.flatMap((combo) => arr.map((item) => [...combo, item])),
    [[]]
  );
}

/**
 * Rows with ≥ 2 values become "variant dimensions".
 * Their cartesian product generates child SKUs.
 */
export function generateChildSkus(
  parentSku: string,
  attrRows: AttrRow[],
  groups: AttributeGroup[]
): ChildSku[] {
  if (!parentSku) return [];
  const variantRows = attrRows.filter((r) => r.values.length >= 2);
  if (variantRows.length === 0) return [];
  const dims = variantRows.map((r) => r.values);
  const combos = cartesian(dims);
  return combos.map((combo) => ({
    sku: parentSku + '-' + combo.map(effectiveCode).join(''),
    combo: combo.map((val, i) => ({
      groupName: groups.find((g) => g.id === variantRows[i].groupId)?.content.en.name ?? '—',
      value: val,
    })),
  }));
}

// ─── Initial data ─────────────────────────────────────────────────────────────

export const INITIAL_ATTRIBUTE_GROUPS: AttributeGroup[] = [
  {
    id: 'ag1', sortOrder: 1,
    content: {
      en: { name: 'Color' },
      zh_TW: { name: '顏色' },
      zh_CN: { name: '颜色' },
    },
    attributes: [
      { id: 'ad1', content: { en: { name: 'Black' },   zh_TW: { name: '黑色' }, zh_CN: { name: '黑色' } } },
      { id: 'ad2', content: { en: { name: 'White' },   zh_TW: { name: '白色' }, zh_CN: { name: '白色' } } },
      { id: 'ad3', content: { en: { name: 'Red' },     zh_TW: { name: '紅色' }, zh_CN: { name: '红色' } } },
      { id: 'ad4', content: { en: { name: 'Blue' },    zh_TW: { name: '藍色' }, zh_CN: { name: '蓝色' } } },
      { id: 'ad5', content: { en: { name: 'Gold' },    zh_TW: { name: '金色' }, zh_CN: { name: '金色' } } },
      { id: 'ad6', content: { en: { name: 'Silver' },  zh_TW: { name: '銀色' }, zh_CN: { name: '银色' } } },
      { id: 'ad7', content: { en: { name: 'Midnight Black' }, zh_TW: { name: '午夜黑' }, zh_CN: { name: '午夜黑' } } },
    ],
  },
  {
    id: 'ag2', sortOrder: 2,
    content: {
      en: { name: 'Size' },
      zh_TW: { name: '尺碼' },
      zh_CN: { name: '尺码' },
    },
    attributes: [
      { id: 'ad8',  content: { en: { name: 'XS' },  zh_TW: { name: 'XS' },  zh_CN: { name: 'XS' } } },
      { id: 'ad9',  content: { en: { name: 'S' },   zh_TW: { name: 'S' },   zh_CN: { name: 'S' } } },
      { id: 'ad10', content: { en: { name: 'M' },   zh_TW: { name: 'M' },   zh_CN: { name: 'M' } } },
      { id: 'ad11', content: { en: { name: 'L' },   zh_TW: { name: 'L' },   zh_CN: { name: 'L' } } },
      { id: 'ad12', content: { en: { name: 'XL' },  zh_TW: { name: 'XL' },  zh_CN: { name: 'XL' } } },
      { id: 'ad13', content: { en: { name: 'XXL' }, zh_TW: { name: 'XXL' }, zh_CN: { name: 'XXL' } } },
    ],
  },
  {
    id: 'ag3', sortOrder: 3,
    content: {
      en: { name: 'Material' },
      zh_TW: { name: '材質' },
      zh_CN: { name: '材质' },
    },
    attributes: [
      { id: 'ad14', content: { en: { name: 'Cotton' },    zh_TW: { name: '棉' },      zh_CN: { name: '棉' } } },
      { id: 'ad15', content: { en: { name: 'Wool' },      zh_TW: { name: '羊毛' },    zh_CN: { name: '羊毛' } } },
      { id: 'ad16', content: { en: { name: 'Polyester' }, zh_TW: { name: '聚酯纖維' },zh_CN: { name: '聚酯纤维' } } },
      { id: 'ad17', content: { en: { name: 'Nylon' },     zh_TW: { name: '尼龍' },    zh_CN: { name: '尼龙' } } },
      { id: 'ad18', content: { en: { name: 'Leather' },   zh_TW: { name: '皮革' },    zh_CN: { name: '皮革' } } },
    ],
  },
  {
    id: 'ag4', sortOrder: 4,
    content: {
      en: { name: 'Connectivity' },
      zh_TW: { name: '連接方式' },
      zh_CN: { name: '连接方式' },
    },
    attributes: [
      { id: 'ad19', content: { en: { name: 'Bluetooth 5.0' }, zh_TW: { name: '藍牙 5.0' }, zh_CN: { name: '蓝牙 5.0' } } },
      { id: 'ad20', content: { en: { name: 'Bluetooth 5.3' }, zh_TW: { name: '藍牙 5.3' }, zh_CN: { name: '蓝牙 5.3' } } },
      { id: 'ad21', content: { en: { name: 'WiFi' },          zh_TW: { name: 'WiFi' },      zh_CN: { name: 'WiFi' } } },
      { id: 'ad22', content: { en: { name: 'USB-C' },         zh_TW: { name: 'USB-C' },     zh_CN: { name: 'USB-C' } } },
    ],
  },
  {
    id: 'ag5', sortOrder: 5,
    content: {
      en: { name: 'Battery Life' },
      zh_TW: { name: '電池壽命' },
      zh_CN: { name: '电池寿命' },
    },
    attributes: [],
  },
  {
    id: 'ag6', sortOrder: 6,
    content: {
      en: { name: 'Fit' },
      zh_TW: { name: '版型' },
      zh_CN: { name: '版型' },
    },
    attributes: [
      { id: 'ad23', content: { en: { name: 'Slim Fit' },    zh_TW: { name: '修身版' }, zh_CN: { name: '修身版' } } },
      { id: 'ad24', content: { en: { name: 'Regular Fit' }, zh_TW: { name: '標準版' }, zh_CN: { name: '标准版' } } },
      { id: 'ad25', content: { en: { name: 'Oversized' },   zh_TW: { name: '寬鬆版' }, zh_CN: { name: '宽松版' } } },
    ],
  },
];