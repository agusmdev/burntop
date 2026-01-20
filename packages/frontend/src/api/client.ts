/**
 * Custom fetch instance for Orval-generated API client
 * Handles authentication and base URL configuration
 *
 * Returns responses in the format expected by Orval:
 * { data: T, status: number, headers: Headers }
 *
 * IMPORTANT: Throws errors for non-2xx responses so React Query can properly
 * handle error states and retries.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Custom API error class for better error discrimination
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data: unknown,
    public headers: Headers
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = 'ApiError';
  }

  /**
   * Check if error is a validation error (422)
   */
  isValidationError(): boolean {
    return this.status === 422;
  }

  /**
   * Check if error is an authentication error (401)
   */
  isAuthError(): boolean {
    return this.status === 401;
  }

  /**
   * Check if error is a not found error (404)
   */
  isNotFoundError(): boolean {
    return this.status === 404;
  }

  /**
   * Check if error is a server error (5xx)
   */
  isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Check if error is retriable (network issues, server errors)
   */
  isRetriable(): boolean {
    return this.isServerError() || this.status === 429;
  }
}

export const customInstance = <T>(url: string, config?: RequestInit): Promise<T> => {
  // Get auth token from localStorage
  const token = localStorage.getItem('session_token');

  // Merge headers with auth token
  const headers = new Headers(config?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const fullUrl = `${API_BASE_URL}${url}`;

  return fetch(fullUrl, {
    ...config,
    headers,
  }).then(async (response) => {
    const { status, headers: responseHeaders, statusText } = response;

    // Handle non-2xx responses by throwing an error
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        detail: 'An error occurred',
      }));
      throw new ApiError(status, statusText, errorData, responseHeaders);
    }

    // Handle 204 No Content
    if (status === 204) {
      return {
        data: {},
        status,
        headers: responseHeaders,
      } as T;
    }

    // Return success response in Orval's expected format
    const data = await response.json();
    return {
      data,
      status,
      headers: responseHeaders,
    } as T;
  });
};
