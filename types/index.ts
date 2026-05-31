export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  is_super_admin: boolean;
  is_active: boolean;
  store_id: number | null;
  branch_id: number | null;
  roles: string[];
  permissions: string[];
  store: Store | null;
  branch: Branch | null;
}

export interface Store {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  currency: string;
  status: 'pending' | 'active' | 'suspended' | 'expired';
  trial_ends_at: string | null;
}

export interface Branch {
  id: number;
  name: string;
}

export interface Plan {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  billing_cycle: 'monthly' | 'yearly' | 'lifetime';
  trial_days: number;
  features: string[];
  is_featured: boolean;
  limits: {
    max_products: number | null;
    max_users: number | null;
    max_branches: number | null;
  };
}

export interface Module {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: string;
  icon: string;
  is_core: boolean;
  is_enabled: boolean;
  has_store_override?: boolean;
  has_user_override?: boolean;
  in_plan?: boolean;
  store_enabled?: boolean;
}

export interface LandingPageData {
  settings: {
    is_enabled: boolean;
    site_title: string;
    site_description: string;
    logo: string | null;
    primary_color: string;
    maintenance_message: string | null;
    redirect_when_disabled: string | null;
  };
  sections: Record<string, LandingSection[]>;
  plans: Plan[];
}

export interface LandingSection {
  key: string;
  title: string | null;
  subtitle: string | null;
  content: any;
  is_enabled: boolean;
  sort_order: number;
}

// ============================================================================
// Phase 4 — Catalog types
// ============================================================================

export interface Category {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  image: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  products_count?: number;
  children?: Category[];
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  is_active: boolean;
  products_count?: number;
}

export interface TaxRate {
  id: number;
  name: string;
  rate: number;
  is_inclusive: boolean;
  is_active: boolean;
  products_count?: number;
}

export interface Unit {
  id: number;
  name: string;
  short_code: string;
  is_decimal: boolean;
  products_count?: number;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  name: string;
  sku: string;
  barcode: string | null;
  attributes: Record<string, string> | null;
  cost_price: number;
  selling_price: number;
  image: string | null;
  is_active: boolean;
  sort_order: number;
  total_stock?: number;
}

export interface ProductImage {
  id: number;
  product_id: number;
  variant_id: number | null;
  path: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  image: string | null;
  gallery: string[] | null;
  type: 'simple' | 'variable';
  category_id: number | null;
  brand_id: number | null;
  unit_id: number | null;
  tax_rate_id: number | null;
  cost_price: number;
  selling_price: number;
  msrp: number | null;
  track_stock: boolean;
  allow_negative_stock: boolean;
  low_stock_threshold: number | null;
  is_active: boolean;
  created_by: number | null;
  total_stock?: number;
  variants_count?: number;
  category?: Pick<Category, 'id' | 'name'>;
  brand?: Pick<Brand, 'id' | 'name'>;
  unit?: Pick<Unit, 'id' | 'name' | 'short_code'>;
  tax_rate?: TaxRate;
  variants?: ProductVariant[];
  images?: ProductImage[];
  primary_image?: ProductImage;
}

export interface InventoryItem {
  id: number;
  product_id: number;
  variant_id: number | null;
  branch_id: number;
  quantity: number;
  reserved_quantity: number;
  available?: number;
  last_counted_at: string | null;
  product?: Pick<Product, 'id' | 'name' | 'sku'>;
  variant?: Pick<ProductVariant, 'id' | 'name' | 'sku'>;
}

export interface ApiLog {
  id: number;
  user_id: number | null;
  store_id: number | null;
  method: string;
  endpoint: string;
  route_name: string | null;
  response_status: number | null;
  duration_ms: number;
  ip_address: string;
  user_agent: string;
  exception: string | null;
  created_at: string;
  user?: { id: number; name: string; email: string };
  store?: { id: number; name: string };
}
