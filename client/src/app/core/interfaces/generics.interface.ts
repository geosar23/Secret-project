export interface JsonResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}
