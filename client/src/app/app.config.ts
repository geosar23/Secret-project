import {
    ApplicationConfig,
    ErrorHandler,
    provideBrowserGlobalErrorListeners,
    provideZoneChangeDetection,
} from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { authInterceptor } from "./core/interceptors/auth.interceptor";
import { errorInterceptor } from "./core/interceptors/error.interceptor";
import { retryInterceptor } from "./core/interceptors/retry.interceptor";
import { GlobalErrorHandler } from "./core/handlers/global-error.handler";

import { routes } from "./app.routes";

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        // Order matters: auth (outermost) -> error (sees the final failure) -> retry/timeout (innermost)
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor, retryInterceptor])),
        { provide: ErrorHandler, useClass: GlobalErrorHandler },
    ],
};
