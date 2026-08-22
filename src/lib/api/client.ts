import { ApiResponse, ApiErrorResponse } from '@/lib/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok || data.success === false) {
      const errRes = data as ApiErrorResponse;
      const errorMsg = typeof errRes.error === 'string' ? errRes.error : `API Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return (data as ApiResponse<T>).data;
  } catch (error: any) {
    console.error(`API Fetch Error [${endpoint}]:`, error);
    throw error;
  }
}
