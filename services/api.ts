import { showSuccess, showError } from '../utils/toast';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ApiOptions {
  successMessage?: string;
  errorMessage?: string;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

const defaultOptions: ApiOptions = {
  showSuccessToast: true,
  showErrorToast: true,
};

/**
 * Generic API wrapper that handles loading, errors, and toasts
 */
export async function apiCall<T>(
  fn: () => Promise<T>,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const opts = { ...defaultOptions, ...options };

  try {
    const data = await fn();
    
    if (opts.showSuccessToast && opts.successMessage) {
      showSuccess(opts.successMessage);
    }
    
    opts.onSuccess?.();
    
    return { success: true, data };
  } catch (error: any) {
    const errorMessage = opts.errorMessage || error.message || 'An unexpected error occurred';
    
    if (opts.showErrorToast) {
      showError(errorMessage);
    }
    
    opts.onError?.(error);
    console.error('[API Error]', error);
    
    return { success: false, error: errorMessage };
  }
}

/**
 * API wrapper for create operations
 */
export async function apiCreate<T>(
  fn: () => Promise<T>,
  entityName: string,
  options: Omit<ApiOptions, 'successMessage'> = {}
): Promise<ApiResponse<T>> {
  return apiCall(fn, {
    ...options,
    successMessage: `${entityName} created successfully`,
  });
}

/**
 * API wrapper for update operations
 */
export async function apiUpdate<T>(
  fn: () => Promise<T>,
  entityName: string,
  options: Omit<ApiOptions, 'successMessage'> = {}
): Promise<ApiResponse<T>> {
  return apiCall(fn, {
    ...options,
    successMessage: `${entityName} updated successfully`,
  });
}

/**
 * API wrapper for delete operations
 */
export async function apiDelete<T>(
  fn: () => Promise<T>,
  entityName: string,
  options: Omit<ApiOptions, 'successMessage'> = {}
): Promise<ApiResponse<T>> {
  return apiCall(fn, {
    ...options,
    successMessage: `${entityName} deleted successfully`,
  });
}

/**
 * API wrapper for fetch operations (no success toast by default)
 */
export async function apiFetch<T>(
  fn: () => Promise<T>,
  options: Omit<ApiOptions, 'successMessage' | 'showSuccessToast'> = {}
): Promise<ApiResponse<T>> {
  return apiCall(fn, {
    ...options,
    showSuccessToast: false,
  });
}


