// Admin Panel Type Definitions

import type { ComponentType } from '../constants/components';

// Admin User
export interface AdminUser {
  username: string;
  isAuthenticated: boolean;
  loginTime: number;
}

// Session token structure
export interface AdminSession {
  token: string;
  expiresAt: number;
  user: AdminUser;
}

// Product Variant (matches ObjectModel structure)
export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  path: string;
  image: string;
  link: string;
  price: string | number;
  title?: string;
  floorOffset?: number;
  spawnHeight?: number;
  dimensions: {
    width: number;
    height: number;
    depth?: number;
  };
  orientation?: {
    type: 'face_into_room' | 'flush_with_wall' | 'custom';
    wallBuffer?: number;
    rotationOffset?: number;
    description?: string;
  };
  movement?: {
    snapToWall: boolean;
    cornerInstallOnly?: boolean;
    allowVerticalMovement?: boolean;
    allowFreeRotation?: boolean;
    minHeight?: number;
    maxHeight?: number;
  };
}

// Product Group (contains variants)
export interface AdminProduct {
  id: string;
  category: ComponentType;
  name: string;
  price: string;
  link: string;
  image: string;
  variantType: string;
  features: string[];
  variants: ProductVariant[];
  createdAt?: number;
  updatedAt?: number;
}

// Filter state for product list
export interface ProductFilters {
  categories: ComponentType[];
  searchQuery: string;
  priceRange: {
    min: number | null;
    max: number | null;
  };
  sortBy: 'name' | 'price' | 'category' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

// Pagination state
export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

// Form validation errors
export interface ValidationErrors {
  [key: string]: string;
}

// Toast notification types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  duration: number;
}

// Admin statistics
export interface AdminStats {
  totalProducts: number;
  categoryCounts: Record<ComponentType, number>;
  totalVariants: number;
  recentlyAdded: number;
}

// Default filter state
export const DEFAULT_FILTERS: ProductFilters = {
  categories: [],
  searchQuery: '',
  priceRange: {
    min: null,
    max: null,
  },
  sortBy: 'name',
  sortOrder: 'asc',
};

// Default pagination
export const DEFAULT_PAGINATION: PaginationState = {
  currentPage: 1,
  itemsPerPage: 12,
  totalItems: 0,
};
