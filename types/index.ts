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
  email_verified_at: string | null;
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
