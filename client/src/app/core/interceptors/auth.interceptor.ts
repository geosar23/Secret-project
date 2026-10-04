import { HttpInterceptorFn } from "@angular/common/http";
import { environment } from "../../../environments/environment";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const token = localStorage.getItem("token");

    // Only attach the token to our own API, never to third-party hosts (e.g. signed storage URLs).
    if (token && req.url.startsWith(environment.apiUrl)) {
        const clonedRequest = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`,
            },
        });
        return next(clonedRequest);
    }

    return next(req);
};
