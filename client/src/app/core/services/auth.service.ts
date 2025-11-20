import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { Observable, BehaviorSubject, tap } from "rxjs";
import { ApiService } from "./api.service";

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
        name: string;
        role?: string;
    };
}

interface JwtPayload {
    id: string;
    email: string;
    name?: string;
    role?: string;
    exp?: number;
}

@Injectable({
    providedIn: "root",
})
export class AuthService {
    private currentUserSubject = new BehaviorSubject<AuthResponse["user"] | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();

    constructor(
        private api: ApiService,
        private router: Router,
    ) {
        this.initializeAuth(); // Restore user session if token exists
    }

    private initializeAuth(): void {
        const token = this.getToken();
        if (token) {
            // Decode JWT token to get user info (without verification - server will verify)
            try {
                const payload = this.decodeToken(token);
                if (payload && this.isTokenValid(payload)) {
                    // Set user from token payload
                    this.currentUserSubject.next({
                        id: payload.id,
                        email: payload.email,
                        name: payload.name || "",
                        role: payload.role,
                    });
                } else {
                    // Token expired or invalid
                    this.logout();
                }
            } catch {
                // Invalid token format
                this.logout();
            }
        }
    }

    private decodeToken(token: string): JwtPayload | null {
        try {
            const base64Url = token.split(".")[1];
            const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split("")
                    .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                    .join(""),
            );
            return JSON.parse(jsonPayload) as JwtPayload;
        } catch {
            return null;
        }
    }

    private isTokenValid(payload: JwtPayload): boolean {
        if (!payload || !payload.exp) {
            return false;
        }
        // Check if token is expired (exp is in seconds, Date.now() is in milliseconds)
        return payload.exp * 1000 > Date.now();
    }

    login(credentials: LoginRequest): Observable<AuthResponse> {
        return this.api.post<AuthResponse>("auth/login", credentials).pipe(
            tap(response => {
                this.setToken(response.token);
                this.currentUserSubject.next(response.user);
            }),
        );
    }

    register(data: RegisterRequest): Observable<AuthResponse> {
        return this.api.post<AuthResponse>("auth/register", data).pipe(
            tap(response => {
                this.setToken(response.token);
                this.currentUserSubject.next(response.user);
            }),
        );
    }

    logout(): void {
        localStorage.removeItem("token");
        this.currentUserSubject.next(null);
        this.router.navigate(["/login"]);
    }

    getToken(): string | null {
        return localStorage.getItem("token");
    }

    isAuthenticated(): boolean {
        return !!this.getToken();
    }

    private setToken(token: string): void {
        localStorage.setItem("token", token);
    }
}
