/**
 * API Client - Agentic Mobile Map
 *
 * Centralized HTTP client for all backend API calls.
 * Features:
 * - Base URL configuration
 * - Authentication token handling
 * - Request/response interceptors
 * - Error normalization
 * - Retry logic for transient failures
 * - Offline detection
 */

import { Platform } from 'react-native';
import type { ApiError, ApiResponse } from '@/types/api';

/**
 * API Configuration
 */
const API_CONFIG = {
  // Development URLs
  DEV_URL: Platform.select({
    ios: 'http://localhost:3000/api/v1',
    android: 'http://10.0.2.2:3000/api/v1', // Android emulator localhost
    default: 'http://localhost:3000/api/v1',
  }),
  // Production URL (will be set via environment variable)
  PROD_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api.agenticmap.com/api/v1',

  // Timeouts
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  UPLOAD_TIMEOUT: 60000, // 60 seconds

  // Retry config
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};

/**
 * Get the base URL based on environment
 */
const getBaseUrl = (): string => {
  const isDev = __DEV__ || process.env.NODE_ENV === 'development';
  return isDev ? API_CONFIG.DEV_URL : API_CONFIG.PROD_URL;
};

/**
 * Token storage (in-memory for now, would use secure storage in production)
 */
let authToken: string | null = null;

/**
 * Set the authentication token
 */
export const setAuthToken = (token: string | null): void => {
  authToken = token;
};

/**
 * Get the current auth token
 */
export const getAuthToken = (): string | null => {
  return authToken;
};

/**
 * Request options
 */
interface RequestOptions {
  timeout?: number;
  retries?: number;
  skipAuth?: boolean;
  headers?: Record<string, string>;
}

/**
 * Build request headers
 */
const buildHeaders = (options: RequestOptions = {}): Headers => {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  });

  if (!options.skipAuth && authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  return headers;
};

/**
 * Normalize API errors
 */
const normalizeError = (error: unknown, status?: number): ApiError => {
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      status: status || 500,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>;
    return {
      code: (errorObj.code as string) || 'UNKNOWN_ERROR',
      message: (errorObj.message as string) || 'An unexpected error occurred',
      status: (errorObj.status as number) || status || 500,
      details: errorObj.details as Record<string, unknown> | undefined,
      suggestions: errorObj.suggestions as string[] | undefined,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    status: status || 500,
  };
};

/**
 * Fetch with timeout
 */
const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Main request function with retry logic
 */
const request = async <T>(
  endpoint: string,
  method: string,
  body?: unknown,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> => {
  const url = `${getBaseUrl()}${endpoint}`;
  const timeout = options.timeout || API_CONFIG.DEFAULT_TIMEOUT;
  const maxRetries = options.retries ?? API_CONFIG.MAX_RETRIES;

  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        url,
        {
          method,
          headers: buildHeaders(options),
          body: body ? JSON.stringify(body) : undefined,
        },
        timeout
      );

      // Parse response
      const contentType = response.headers.get('content-type');
      let data: unknown;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Handle non-OK responses
      if (!response.ok) {
        const error = normalizeError(data, response.status);

        // Don't retry client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          return { success: false, error };
        }

        // Retry server errors (5xx)
        lastError = error;
        if (attempt < maxRetries) {
          await sleep(API_CONFIG.RETRY_DELAY * (attempt + 1));
          continue;
        }

        return { success: false, error };
      }

      // Success
      return {
        success: true,
        data: data as T,
      };
    } catch (error) {
      // Handle network errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          lastError = {
            code: 'TIMEOUT',
            message: 'Request timed out',
            status: 408,
          };
        } else if (error.message.includes('Network request failed')) {
          lastError = {
            code: 'NETWORK_ERROR',
            message: 'Network connection failed. Please check your internet.',
            status: 0,
          };
        } else {
          lastError = normalizeError(error);
        }
      } else {
        lastError = normalizeError(error);
      }

      // Retry on network errors
      if (attempt < maxRetries) {
        await sleep(API_CONFIG.RETRY_DELAY * (attempt + 1));
        continue;
      }
    }
  }

  // All retries exhausted
  return {
    success: false,
    error: lastError || {
      code: 'MAX_RETRIES_EXCEEDED',
      message: 'Maximum retry attempts exceeded',
      status: 500,
    },
  };
};

/**
 * API Client methods
 */
export const apiClient = {
  /**
   * GET request
   */
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, 'GET', undefined, options),

  /**
   * POST request
   */
  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, 'POST', body, options),

  /**
   * PUT request
   */
  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, 'PUT', body, options),

  /**
   * PATCH request
   */
  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, 'PATCH', body, options),

  /**
   * DELETE request
   */
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, 'DELETE', undefined, options),

  /**
   * Set auth token
   */
  setToken: setAuthToken,

  /**
   * Get current token
   */
  getToken: getAuthToken,

  /**
   * Clear auth token
   */
  clearToken: () => setAuthToken(null),
};

export default apiClient;
