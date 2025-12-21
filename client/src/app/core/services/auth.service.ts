import { Injectable, inject } from "@angular/core";
import { Router } from "@angular/router";
import { Observable, BehaviorSubject, tap, switchMap, map } from "rxjs";
import { ApiService } from "./api.service";
import { decodeToken, isTokenValid } from "../utils/token.util";
import { LoginRequest, RegisterRequest, AuthResponse } from "../interfaces/auth.interface";
import { IUser, UserResponse } from "../interfaces/user.interface";

@Injectable({
    providedIn: "root",
})
export class AuthService {
    private api = inject(ApiService);
    private router = inject(Router);

    private localUserSubject = new BehaviorSubject<IUser | null>(null);
    public localUser$ = this.localUserSubject.asObservable();

    constructor() {
        this.initializeAuth(); // Restore user session if token exists
    }

    getCurrentUser(): IUser | null {
        return this.localUserSubject.getValue();
    }

    private initializeAuth(): void {
        const token = this.getToken();
        if (token) {
            // Decode JWT token to get user info
            try {
                const payload = decodeToken(token);
                if (payload && isTokenValid(payload)) {
                    // Fetch full user data from backend
                    this.getMe().subscribe({
                        next: (response: { user: IUser | null }) => {
                            this.localUserSubject.next(response.user);
                        },
                        error: () => {
                            // If getMe fails, logout
                            this.logout();
                        },
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

    login(credentials: LoginRequest): Observable<IUser> {
        return this.api.post<AuthResponse>("auth/login", credentials).pipe(
            tap(response => {
                this.setToken(response.token);
            }),
            switchMap(() => this.getMe()),
            tap(response => {
                this.localUserSubject.next(response.user);
            }),
            map(response => response.user),
        );
    }

    getMe(): Observable<UserResponse> {
        return this.api.get<UserResponse>("auth/me");
    }

    register(data: RegisterRequest): Observable<IUser> {
        return this.api.post<AuthResponse>("auth/register", data).pipe(
            tap(response => {
                this.setToken(response.token);
            }),
            switchMap(() => this.getMe()),
            tap(response => {
                this.localUserSubject.next(response.user);
            }),
            map(response => response.user),
        );
    }

    logout(): void {
        localStorage.removeItem("token");
        this.localUserSubject.next(null);
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
