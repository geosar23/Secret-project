export type SuccessResponse<T> = { success: true; data: T };
export type ErrorResponse = { success: false; message?: string; error?: unknown };

export const success = <T = unknown>(data: T): SuccessResponse<T> => ({ success: true, data });
export const softError = (message?: string, errorDetail?: unknown): ErrorResponse => ({
  success: false,
  message,
  error: errorDetail,
});