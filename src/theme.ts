/** 品牌主题色预设 —— 换肤只换 4 个 HSL 变量，全站即时生效（含玻璃主题/流光动效） */
export interface BrandPreset {
  key: string;
  name: string;
  brand: string;
  dark: string;
  light: string;
  tint: string;
}

export const BRAND_PRESETS: BrandPreset[] = [
  { key: 'blue',      name: '默认蓝', brand: '224 76% 48%',  dark: '224 76% 33%',  light: '217 91% 60%',  tint: '220 88% 97%' },
  { key: 'coral',     name: '珊瑚橙', brand: '11 78% 52%',   dark: '11 78% 38%',   light: '24 90% 60%',   tint: '16 100% 97%' },
  { key: 'mint',      name: '薄荷绿', brand: '160 70% 36%',  dark: '160 70% 26%',  light: '158 64% 46%',  tint: '160 60% 96%' },
  { key: 'amber',     name: '琥珀金', brand: '38 92% 44%',   dark: '38 92% 32%',   light: '42 95% 58%',   tint: '40 100% 96%' },
  { key: 'sky',       name: '天空蓝', brand: '199 89% 44%',  dark: '199 89% 32%',  light: '195 92% 60%',  tint: '197 80% 96%' },
  { key: 'lavender',  name: '薰衣草', brand: '262 78% 58%',  dark: '262 78% 42%',  light: '258 90% 68%',  tint: '260 70% 97%' },
  { key: 'pink',      name: '奶油粉', brand: '340 75% 55%',  dark: '340 75% 40%',  light: '335 90% 68%',  tint: '340 80% 97%' },
];

const BRAND_KEY = 'wb-brand';

export function applyBrand(key: string) {
  const p = BRAND_PRESETS.find((x) => x.key === key) ?? BRAND_PRESETS[0];
  const root = document.documentElement;
  root.style.setProperty('--brand', p.brand);
  root.style.setProperty('--brand-dark', p.dark);
  root.style.setProperty('--brand-light', p.light);
  root.style.setProperty('--brand-tint', p.tint);
}

export function savedBrandKey(): string {
  return localStorage.getItem(BRAND_KEY) ?? BRAND_PRESETS[0].key;
}

export function saveBrand(key: string) {
  localStorage.setItem(BRAND_KEY, key);
  applyBrand(key);
}
