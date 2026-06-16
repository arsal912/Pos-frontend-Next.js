// ── Built-in re-mappable shortcuts ────────────────────────────────────────────

export type ShortcutAction =
  | 'search'
  | 'customer'
  | 'discount'
  | 'pay'
  | 'hold'
  | 'help';

export interface ShortcutMap {
  search:   string;
  customer: string;
  discount: string;
  pay:      string;
  hold:     string;
  help:     string;
}

export const SHORTCUT_LABELS: Record<ShortcutAction, string> = {
  search:   'Focus product search',
  customer: 'Add / change customer',
  discount: 'Toggle discount panel',
  pay:      'Open payment screen',
  hold:     'Park / recall sale',
  help:     'Show shortcuts',
};

export const DEFAULT_SHORTCUTS: ShortcutMap = {
  search:   'F2',
  customer: 'F3',
  discount: 'F4',
  pay:      'F5',
  hold:     'F8',
  help:     '?',
};

const STORAGE_KEY = 'pos_shortcuts';

export function loadShortcuts(): ShortcutMap {
  if (typeof window === 'undefined') return DEFAULT_SHORTCUTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SHORTCUTS;
    return { ...DEFAULT_SHORTCUTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SHORTCUTS;
  }
}

export function saveShortcuts(map: ShortcutMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function resetShortcuts(): ShortcutMap {
  localStorage.removeItem(STORAGE_KEY);
  return DEFAULT_SHORTCUTS;
}

// ── Custom shortcuts ───────────────────────────────────────────────────────────

export type CustomAction = 'add_product' | 'open_page';

export interface CustomShortcut {
  id:           string;
  key:          string;
  label:        string;
  action:       CustomAction;
  // add_product
  product_id?:  number;
  product_name?: string;
  product_sku?:  string;
  // open_page
  url?:         string;
}

const CUSTOM_KEY = 'pos_custom_shortcuts';

export function loadCustomShortcuts(): CustomShortcut[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomShortcuts(list: CustomShortcut[]): void {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
}

/** Returns all keys currently in use (built-in + custom) */
export function allUsedKeys(): string[] {
  const sc = loadShortcuts();
  const cs = loadCustomShortcuts();
  return [
    ...Object.values(sc),
    ...cs.map(c => c.key),
  ];
}

/** Human-readable description for a custom shortcut */
export function describeCustom(cs: CustomShortcut): string {
  if (cs.action === 'add_product') return `Add "${cs.product_name}" to cart`;
  if (cs.action === 'open_page')   return `Go to ${cs.url}`;
  return cs.label;
}
