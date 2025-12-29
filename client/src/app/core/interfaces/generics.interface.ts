/* eslint-disable @typescript-eslint/no-explicit-any */
export interface JsonResponse<T> {
    success: boolean;
    data?: T;
    error: any;
    message?: string;
}
