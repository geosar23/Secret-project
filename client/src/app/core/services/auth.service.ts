import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { Observable, BehaviorSubject, tap } from "rxjs";
import { ApiService } from "./api.service";
import { decodeToken, isTokenValid } from "../utils/token.util";

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

    getCurrentUser(): AuthResponse["user"] | null {
        return this.currentUserSubject.getValue();
    }

    private initializeAuth(): void {
        const token = this.getToken();
        if (token) {
            // Decode JWT token to get user info (without verification - server will verify)
            try {
                const payload = decodeToken(token);
                if (payload && isTokenValid(payload)) {
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
