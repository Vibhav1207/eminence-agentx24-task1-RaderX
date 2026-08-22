import { ApiResponse, ApiErrorResponse } from '@/lib/types';

export function apiSuccess<T>(data: T, status = 200, meta?: ApiResponse<T>['meta']) {
  const body: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    ...(meta ? { meta } : {}),
  };
  return Response.json(body, { status });
}

export function apiError(message: string, code = 'INTERNAL_ERROR', status = 500, details?: unknown) {
  const body: ApiErrorResponse = {
    success: false,
    error: message,
    code,
    details,
    timestamp: new Date().toISOString(),
  };
  return Response.json(body, { status });
}
