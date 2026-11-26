/* Produktdaten aus Open Food Facts (frei, ohne Schlüssel) – mit lokalem Zwischenspeicher */
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Product { id: string; barcode?: string; name: string; brand: string; kcal: number; p: number; c: number; f: number; serving: number | null }

const FIELDS = 'code,product_name,product_name_de,brands,nutriments,serving_quantity';
type OffProduct = { code?: string; product_name?: string; product_name_de?: string; brands?: string; nutriments?: Record<string, number>; serving_quantity?: number | string };

function map(p: OffProduct, code?: string): Product | null {
  const n = p.nutriments || {};
  let kcal = n['energy-kcal_100g'];
  if (kcal == null && n.energy_100g != null) kcal = n.energy_100g / 4.184;
  if (kcal == null) return null;
  const bc = code || p.code;
  return {
    id: 'off' + bc, barcode: bc, name: p.product_name_de || p.product_name || 'Unbekanntes Produkt', brand: (p.brands || '').split(',')[0].trim(),
    kcal: Math.round(+kcal), p: +(n.proteins_100g || 0), c: +(n.carbohydrates_100g || 0), f: +(n.fat_100g || 0), serving: +(p.serving_quantity || 0) || null,
  };
}

const CACHE = 'fx.foodcache';
export async function lookupBarcode(code: string): Promise<Product | null> {
  const cache: Record<string, Product> = JSON.parse((await AsyncStorage.getItem(CACHE).catch(() => null)) || '{}');
  if (cache[code]) return cache[code];
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('Produktdatenbank nicht erreichbar');
  const j = await r.json();
  if (j.status !== 1 || !j.product) return null;
  const m = map(j.product, code);
  if (m) { cache[code] = m; AsyncStorage.setItem(CACHE, JSON.stringify(cache)).catch(() => {}); }
  return m;
}
export async function searchProducts(q: string): Promise<Product[]> {
  const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=15&lc=de&fields=${FIELDS}`);
  if (!r.ok) throw new Error('Produktdatenbank nicht erreichbar');
  const j = await r.json();
  return ((j.products || []) as OffProduct[]).map(p => map(p)).filter((x): x is Product => !!x);
}
