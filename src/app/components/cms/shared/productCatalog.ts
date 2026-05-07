// Shared product catalog — single source of truth used by autocomplete across all order modules

export interface CatalogProduct {
  sku: string;
  name: string;
  category: string;
  brand: string;
  purchasePrice: number; // cost price (for Purchase Orders)
  retailPrice: number;   // in-store retail price (for Retail Orders / POS)
  webPrice: number;      // online selling price (for Web Orders)
}

export const PRODUCT_CATALOG: CatalogProduct[] = [
  { sku: 'ELEC-0042', name: 'Wireless Earbuds Pro X',      category: 'Electronics',    brand: 'SoundMax',    purchasePrice: 280,  retailPrice: 620,  webPrice: 620  },
  { sku: 'ELEC-0043', name: 'Wireless Earbuds Lite',       category: 'Electronics',    brand: 'SoundMax',    purchasePrice: 180,  retailPrice: 420,  webPrice: 380  },
  { sku: 'ELEC-0012', name: 'USB-C Cable (2m)',            category: 'Electronics',    brand: 'TechPro',     purchasePrice: 15,   retailPrice: 45,   webPrice: 40   },
  { sku: 'ELEC-0055', name: 'Bluetooth Speaker Mini',      category: 'Electronics',    brand: 'SoundMax',    purchasePrice: 120,  retailPrice: 380,  webPrice: 350  },
  { sku: 'ELEC-0060', name: 'Smart Watch Series 3',        category: 'Electronics',    brand: 'TechPro',     purchasePrice: 480,  retailPrice: 1280, webPrice: 1180 },
  { sku: 'FASH-0118', name: 'Slim Fit Blazer',             category: 'Fashion',        brand: 'StyleHouse',  purchasePrice: 120,  retailPrice: 480,  webPrice: 399  },
  { sku: 'FASH-0119', name: 'Dress Shirt',                 category: 'Fashion',        brand: 'StyleHouse',  purchasePrice: 65,   retailPrice: 220,  webPrice: 161  },
  { sku: 'FASH-0130', name: 'Chino Trousers',              category: 'Fashion',        brand: 'FashionCo',   purchasePrice: 80,   retailPrice: 280,  webPrice: 240  },
  { sku: 'FASH-0145', name: 'Leather Belt',                category: 'Fashion',        brand: 'LuxeDesign',  purchasePrice: 40,   retailPrice: 180,  webPrice: 150  },
  { sku: 'HOME-0201', name: 'Smart Air Purifier',          category: 'Home & Living',  brand: 'SmartHome',   purchasePrice: 980,  retailPrice: 1580, webPrice: 2800 },
  { sku: 'HOME-0202', name: 'Replacement Filter',          category: 'Home & Living',  brand: 'SmartHome',   purchasePrice: 80,   retailPrice: 200,  webPrice: 200  },
  { sku: 'HOME-0215', name: 'Aromatherapy Diffuser',       category: 'Home & Living',  brand: 'GreenLife',   purchasePrice: 95,   retailPrice: 320,  webPrice: 280  },
  { sku: 'HOME-0220', name: 'Bamboo Cutting Board Set',   category: 'Home & Living',  brand: 'HomePlus',    purchasePrice: 55,   retailPrice: 180,  webPrice: 160  },
  { sku: 'SPRT-0031', name: 'Running Shoes Pro',           category: 'Sports',         brand: 'SportsPro',   purchasePrice: 200,  retailPrice: 680,  webPrice: 580  },
  { sku: 'SPRT-0038', name: 'Yoga Mat Premium',            category: 'Sports',         brand: 'GreenLife',   purchasePrice: 70,   retailPrice: 280,  webPrice: 240  },
  { sku: 'SPRT-0042', name: 'Resistance Band Set',         category: 'Sports',         brand: 'SportsPro',   purchasePrice: 30,   retailPrice: 120,  webPrice: 98   },
];

/** Search catalog by SKU or product name, case-insensitive, max results */
export function searchCatalog(query: string, max = 8): CatalogProduct[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return PRODUCT_CATALOG.filter(
    (p) => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
  ).slice(0, max);
}
