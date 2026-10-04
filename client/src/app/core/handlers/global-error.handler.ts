import { HttpErrorResponse } from "@angular/common/http";
import { ErrorHandler, Injectable, Injector } from "@angular/core";
import { ToastService } from "../services/toast.service";

const TOAST_COOLDOWN_MS = 3000;

/**
 * Catches uncaught runtime errors. HTTP errors are already handled by the error interceptor
 * and are therefore only logged here.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    private lastToastAt = 0;

    constructor(private injector: Injector) {}

    handleError(error: unknown): void {
        console.error(error);

        if (error instanceof HttpErrorResponse) {
            return;
        }

        const now = Date.now();
        if (now - this.lastToastAt < TOAST_COOLDOWN_MS) {
            return;
        }
        this.lastToastAt = now;

        this.injector.get(ToastService).error("An unexpected error occurred. Please try again.");
    }
}
