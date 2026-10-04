import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { catchError, retry, throwError, timeout, timer, TimeoutError } from "rxjs";

const DEFAULT_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 500;
const RETRYABLE_STATUSES = new Set([0, 502, 503, 504]);

const isIdempotent = (method: string): boolean => method === "GET" || method === "HEAD";

/**
 * Adds a request timeout and retries idempotent requests (GET/HEAD only) on network errors
 * and gateway errors using exponential backoff. Writes are never retried.
 */
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
    const timeoutMs = req.body instanceof FormData ? UPLOAD_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
    const canRetry = isIdempotent(req.method);

    return next(req).pipe(
        timeout(timeoutMs),
        catchError((error: unknown) =>
            throwError(() =>
                error instanceof TimeoutError
                    ? new HttpErrorResponse({ status: 0, statusText: "Timeout", url: req.url, error })
                    : error,
            ),
        ),
        retry({
            count: canRetry ? MAX_RETRIES : 0,
            delay: (error: unknown, retryCount: number) =>
                error instanceof HttpErrorResponse && RETRYABLE_STATUSES.has(error.status)
                    ? timer(BASE_RETRY_DELAY_MS * 2 ** (retryCount - 1))
                    : throwError(() => error),
        }),
    );
};
