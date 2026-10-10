import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { Injector, inject } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, throwError } from "rxjs";
import { AuthService } from "../services/auth.service";
import { ToastService } from "../services/toast.service";

const PASSWORD_CHANGE_REQUIRED_CODE = "PASSWORD_CHANGE_REQUIRED";
const LOGIN_URL_SUFFIX = "/auth/login";

const MESSAGES = {
    network: "Cannot reach the server. Check your connection and try again.",
    badRequest: "The request was invalid.",
    invalidCredentials: "Invalid email or password.",
    sessionExpired: "Your session has expired. Please log in again.",
    forbidden: "You do not have permission to perform this action.",
    notFound: "The requested resource was not found.",
    conflict: "This conflicts with existing data.",
    payloadTooLarge: "The file or request is too large.",
    tooManyRequests: "Too many requests. Please try again shortly.",
    server: "Something went wrong on our side. Please try again later.",
};

const friendlyMessage = (status: number, isLoginRequest: boolean): string | null => {
    if (status === 0) {
        return MESSAGES.network;
    }
    if (status === 400) {
        return MESSAGES.badRequest;
    }
    if (status === 401) {
        return isLoginRequest ? MESSAGES.invalidCredentials : MESSAGES.sessionExpired;
    }
    if (status === 403) {
        return MESSAGES.forbidden;
    }
    if (status === 404) {
        return MESSAGES.notFound;
    }
    if (status === 409) {
        return MESSAGES.conflict;
    }
    if (status === 413) {
        return MESSAGES.payloadTooLarge;
    }
    if (status === 429) {
        return MESSAGES.tooManyRequests;
    }
    if (status >= 500) {
        return MESSAGES.server;
    }
    return null;
};

// Statuses that are shown globally. Other 4xx statuses are left to the calling component.
const isGloballyToasted = (status: number, isLoginRequest: boolean): boolean =>
    status === 0 || status === 403 || status === 429 || status >= 500 || (status === 401 && !isLoginRequest);

/**
 * Central HTTP error handling:
 * - 401 (outside login): clears the session and redirects to login
 * - 0 / 403 / 429 / 5xx: shows one global toast
 * - every error body gets a user-friendly `message`, because the server sends generic text for hard errors
 * The error is always re-thrown so components can still react to it.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const injector = inject(Injector);

    return next(req).pipe(
        catchError((error: unknown) => {
            if (!(error instanceof HttpErrorResponse)) {
                return throwError(() => error);
            }

            const isLoginRequest = req.url.endsWith(LOGIN_URL_SUFFIX);
            const message = friendlyMessage(error.status, isLoginRequest);

            if (!message) {
                return throwError(() => error);
            }

            if (error.status === 401 && !isLoginRequest) {
                // Resolved lazily: AuthService itself depends on HttpClient.
                const authService = injector.get(AuthService);
                // After the first 401 the token is gone, so parallel 401s don't repeat the logout/toast.
                if (!authService.isAuthenticated()) {
                    return throwError(() => error);
                }
                authService.logout();
            }

            // Signed in with a temporary password: send the user to choose their own instead of toasting.
            if (error.status === 403 && error.error?.code === PASSWORD_CHANGE_REQUIRED_CODE) {
                void injector.get(Router).navigate(["/password-setup"]);
            } else if (isGloballyToasted(error.status, isLoginRequest)) {
                injector.get(ToastService).error(message);
            }

            const body = typeof error.error === "object" && error.error !== null ? error.error : {};

            return throwError(
                () =>
                    new HttpErrorResponse({
                        error: { ...body, message },
                        headers: error.headers,
                        status: error.status,
                        statusText: error.statusText,
                        url: error.url ?? undefined,
                    }),
            );
        }),
    );
};
