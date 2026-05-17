import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

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

// Attach token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Token expired/invalid - clear and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
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
