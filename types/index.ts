// ============================================================================
// Phase 4D — Reports types
// ============================================================================

export interface ReportSummaryCard {
  label: string;
  value: string;
  raw: number | string;
  trend?: number | null;
  format?: 'money' | 'int' | 'pct' | 'string';
}

export interface ReportColumn {
  key: string;
  label: string;
  type: 'money' | 'number' | 'int' | 'percent' | 'date' | 'string';
  align?: 'left' | 'right' | 'center';
  total?: boolean;
}

export interface ReportChartData {
  type: 'line' | 'bar' | 'pie' | 'area';
  labels: string[];
  series: { name: string; data: number[] }[];
}

export interface ReportMeta {
  filters_used: Record<string, any>;
  date_from?: string;
  date_to?: string;
  generated_at: string;
  row_count: number;
  timezone?: string;
}

export interface ReportResult {
  summary: ReportSummaryCard[];
  rows: Record<string, any>[];
  groups?: Record<string, { label: string; rows: Record<string, any>[]; subtotals?: Record<string, any> }>;
  chart_data?: ReportChartData;
  comparison?: ReportResult;
  meta: ReportMeta;
  columns: ReportColumn[];
  totals?: Record<string, any>;
}

export interface ReportFilterSchema {
  key: string;
  type: 'date_range' | 'branch_select' | 'select' | 'multi_select' | 'number' | 'text' | 'date';
  label: string;
  default?: any;
  required?: boolean;
  options?: { value: string | number; label: string }[];
}

export interface ReportInfo {
  slug: string;
  name: string;
  category: string;
  description?: string;
  required_module?: string | null;
  required_permission?: string | null;
}

export interface ReportSchema {
  slug: string;
  name: string;
  category: string;
  description: string;
  filter_schema: ReportFilterSchema[];
  default_filters: Record<string, any>;
}

// ============================================================================

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
  is_weightable: boolean;
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

// ============================================================================
// Phase 4 — POS / Sales types
// ============================================================================

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'jazzcash' | 'easypaisa' | 'store_credit' | 'other';

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  variant_id: number | null;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  cost_at_time: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  line_total: number;
}

export interface SalePayment {
  id: number;
  sale_id: number;
  method: PaymentMethod;
  amount: number;
  reference: string | null;
  notes: string | null;
}

export interface Sale {
  id: number;
  sale_number: string;
  branch_id: number;
  customer_id: number | null;
  cashier_id: number;
  sale_date: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  discount_type: 'fixed' | 'percent' | null;
  discount_reason: string | null;
  total: number;
  paid_amount: number;
  change_given: number;
  balance: number;
  status: 'draft' | 'completed' | 'refunded' | 'partially_refunded' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'partial' | 'refunded';
  notes: string | null;
  items?: SaleItem[];
  payments?: SalePayment[];
  customer?: Customer | null;
}

export interface CashDrawerSession {
  id: number;
  branch_id: number;
  cashier_id: number;
  opened_at: string;
  opening_balance: number;
  closed_at: string | null;
  closing_balance: number | null;
  expected_balance: number | null;
  over_short: number | null;
}

export interface HoldSale {
  id: number;
  name: string;
  customer_id: number | null;
  data: any;
  created_at: string;
}

// ============================================================================
// Phase 4 — Customer types
// ============================================================================

export interface CustomerGroup {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  default_discount_percent: number | null;
  earns_loyalty_points: boolean;
  is_default: boolean;
  color: string;
  is_active: boolean;
  sort_order: number;
  customers_count?: number;
}

export interface Customer {
  id: number;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  tax_number: string | null;
  billing_address: string | null;
  shipping_address: string | null;
  city: string | null;
  country: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_say' | null;
  opening_balance: number;
  credit_limit: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  // Phase 4C
  customer_group_id: number | null;
  loyalty_points_balance: number;
  lifetime_value: number;
  outstanding_balance: number;
  last_purchase_at: string | null;
  total_purchases_count: number;
  sms_marketing_opted_in: boolean;
  email_marketing_opted_in: boolean;
  whatsapp_marketing_opted_in: boolean;
  referral_code: string | null;
  referred_by_customer_id: number | null;
  tags: string[] | null;
  group?: CustomerGroup | null;
}

export interface LoyaltyTransaction {
  id: number;
  customer_id: number;
  type: string;
  points: number;
  balance_after: number;
  reference_type: string | null;
  reference_id: number | null;
  description: string;
  expires_at: string | null;
  created_at: string;
}

export interface CreditTransaction {
  id: number;
  customer_id: number;
  type: string;
  amount: number;
  balance_after: number;
  payment_method: string | null;
  reference_type: string | null;
  notes: string | null;
  created_at: string;
}

export interface CustomerNote {
  id: number;
  customer_id: number;
  note: string;
  is_pinned: boolean;
  created_by: number | null;
  created_at: string;
}

export interface CustomerSegment {
  id: number;
  name: string;
  description: string | null;
  rules: any[];
  customer_count_cached: number;
  is_active: boolean;
  created_at: string;
}

export interface LoyaltySettings {
  id: number;
  is_enabled: boolean;
  points_per_currency_unit: number;
  redemption_value: number;
  minimum_points_to_redeem: number;
  maximum_redemption_per_sale: number | null;
  points_expiry_days: number | null;
  earn_on_discounted_sales: boolean;
  earn_on_tax: boolean;
  welcome_bonus_points: number;
  birthday_bonus_points: number;
  referral_bonus_points: number;
}

// ============================================================================
// Phase 4 — Inventory & Supply Chain types
// ============================================================================

export interface StockMovement {
  id: number;
  product_id: number;
  variant_id: number | null;
  branch_id: number;
  type: string;
  reference_type: string | null;
  reference_id: number | null;
  quantity: number;
  cost_at_time: number;
  balance_after: number;
  notes: string | null;
  created_by: number | null;
  created_at: string;
  product?: Pick<Product, 'id' | 'name' | 'sku'>;
  variant?: Pick<ProductVariant, 'id' | 'name' | 'sku'>;
}

export interface Supplier {
  id: number;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  tax_number: string | null;
  opening_balance: number;
  is_active: boolean;
  notes: string | null;
  purchase_orders_count?: number;
}

export interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  product_id: number;
  variant_id: number | null;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  tax_rate: number;
  discount: number;
  subtotal: number;
  product?: Pick<Product, 'id' | 'name' | 'sku'>;
  variant?: Pick<ProductVariant, 'id' | 'name' | 'sku'>;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  branch_id: number;
  order_date: string;
  expected_delivery_date: string | null;
  status: 'draft' | 'sent' | 'partially_received' | 'received' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  notes: string | null;
  terms: string | null;
  created_at: string;
  supplier?: Pick<Supplier, 'id' | 'name' | 'company'>;
  items?: PurchaseOrderItem[];
  items_count?: number;
}

export interface GrnItem {
  id: number;
  grn_id: number;
  product_id: number;
  variant_id: number | null;
  quantity_received: number;
  unit_cost: number;
  po_item_id: number | null;
  product?: Pick<Product, 'id' | 'name' | 'sku'>;
}

export interface Grn {
  id: number;
  grn_number: string;
  purchase_order_id: number | null;
  supplier_id: number | null;
  branch_id: number;
  received_date: string;
  status: 'draft' | 'received';
  notes: string | null;
  created_at: string;
  supplier?: Pick<Supplier, 'id' | 'name'>;
  purchase_order?: Pick<PurchaseOrder, 'id' | 'po_number'>;
  items?: GrnItem[];
  items_count?: number;
}

export interface StockAdjustmentItem {
  id: number;
  product_id: number;
  variant_id: number | null;
  quantity_before: number;
  quantity_after: number;
  difference: number;
  cost_at_time: number;
  product?: Pick<Product, 'id' | 'name' | 'sku'>;
}

export interface StockAdjustment {
  id: number;
  branch_id: number;
  reason: 'damage' | 'loss' | 'count_correction' | 'expired' | 'other';
  notes: string | null;
  status: 'draft' | 'approved' | 'rejected';
  created_by: number | null;
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
  items?: StockAdjustmentItem[];
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
