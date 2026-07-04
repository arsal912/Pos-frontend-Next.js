import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useLoadingStore } from '@/store/loading';

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);
const isMutating = (method?: string) => !!method && MUTATING_METHODS.has(method.toLowerCase());

const API_BASE_URL =
  typeof window !== 'undefined'
    ? '/api/backend'
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: false,
});

// Token stored in localStorage. Risk: accessible to XSS. Mitigation: strict CSP headers
// prevent inline scripts; all user input is escaped. Migration path: httpOnly cookies
// (requires backend session changes) deferred to post-launch security hardening.

// Attach token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  // Track in-flight writes so a global overlay can show "working…" feedback
  // and block double-clicks, without every page needing its own saving state.
  if (isMutating(config.method)) {
    useLoadingStore.getState().start();
  }

  return config;
});

// Handle errors globally
api.interceptors.response.use(
  (response) => {
    if (isMutating(response.config.method)) {
      useLoadingStore.getState().finish();
    }
    return response;
  },
  (error: AxiosError<any>) => {
    if (isMutating(error.config?.method)) {
      useLoadingStore.getState().finish();
    }

    if (typeof window === 'undefined') return Promise.reject(error);

    if (error.response?.status === 401) {
      // Token expired/invalid — clear and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    if (error.response?.status === 402) {
      // Subscription expired — redirect to billing reactivation page
      // Only redirect if we're inside the dashboard (not already on billing)
      const path = window.location.pathname;
      if (path.startsWith('/dashboard') && !path.startsWith('/dashboard/billing')) {
        window.location.href = '/dashboard/billing?reactivate=true';
      }
    }

    return Promise.reject(error);
  }
);

// Helper to extract error message
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      error.response?.data?.errors?.[Object.keys(error.response.data.errors)[0]]?.[0] ||
      error.message ||
      'An error occurred'
    );
  }
  if (error instanceof Error) return error.message;
  return 'An unknown error occurred';
}

// Typed API helpers
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors?: any;
  meta?: {
    pagination?: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
      from: number | null;
      to: number | null;
    };
  };
}

export const apiClient = {
  get: async <T = any>(url: string, params?: any): Promise<ApiResponse<T>> => {
    const { data } = await api.get<ApiResponse<T>>(url, { params });
    return data;
  },
  post: async <T = any>(url: string, body?: any): Promise<ApiResponse<T>> => {
    const { data } = await api.post<ApiResponse<T>>(url, body);
    return data;
  },
  put: async <T = any>(url: string, body?: any): Promise<ApiResponse<T>> => {
    const { data } = await api.put<ApiResponse<T>>(url, body);
    return data;
  },
  patch: async <T = any>(url: string, body?: any): Promise<ApiResponse<T>> => {
    const { data } = await api.patch<ApiResponse<T>>(url, body);
    return data;
  },
  delete: async <T = any>(url: string): Promise<ApiResponse<T>> => {
    const { data } = await api.delete<ApiResponse<T>>(url);
    return data;
  },
};

/**
 * Safely extract items from a paginated API response.
 *
 * Handles both response shapes:
 *   - Flat:   { data: [...items], meta: { pagination } }   ← paginatedResponse() in ApiResponse trait
 *   - Nested: { data: { data: [...items], ... } }           ← legacy / some controllers
 */
export function getItems<T = any>(res: ApiResponse<any>): T[] {
  if (Array.isArray(res.data)) return res.data as T[];
  if (res.data && Array.isArray((res.data as any).data)) return (res.data as any).data as T[];
  return [];
}
