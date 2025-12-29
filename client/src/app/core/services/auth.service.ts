import { Injectable, inject } from "@angular/core";
import { Router } from "@angular/router";
import { Observable, BehaviorSubject, tap, switchMap, map, of } from "rxjs";
import { ApiService } from "./api.service";
import { decodeToken, isTokenValid } from "../utils/token.util";
import { LoginRequest, AuthResponse } from "../interfaces/auth.interface";
import { IUser, IUserResponse } from "../interfaces/user.interface";
import { JsonResponse } from "../interfaces/generics.interface";

@Injectable({
    providedIn: "root",
})
export class AuthService {
    private apiService = inject(ApiService);
    private router = inject(Router);

    private localUserSubject = new BehaviorSubject<IUser | null>(null);
    public localUser$: Observable<IUser | null> = this.localUserSubject.asObservable();

    constructor() {
        this.initializeAuth(); // Restore user session if token exists
    }

    getLocalUser(): IUser | null {
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
                        next: (response: JsonResponse<IUserResponse>) => {
                            this.localUserSubject.next(response.data!.user);
                        },
                        error: () => {
                            this.localUserSubject.next(null);
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

    login(credentials: LoginRequest): Observable<JsonResponse<IUser>> {
        return this.apiService.post<JsonResponse<AuthResponse>>("auth/login2", credentials).pipe(
            switchMap((loginRes: JsonResponse<AuthResponse>) => {
                if (!loginRes.success || !loginRes.data?.token) {
                    return of({
                        success: false,
                        message: loginRes.message || "Login failed",
                    } as JsonResponse<IUserResponse>);
                }

                this.setToken(loginRes.data.token);

                return this.getMe();
            }),
            tap((meRes: JsonResponse<IUserResponse>) => {
                if (meRes.success && meRes.data?.user) {
                    this.localUserSubject.next(meRes.data.user);
                }
            }),
            map((meRes: JsonResponse<IUserResponse>) => ({
                success: meRes.success,
                message: meRes.message,
                data: meRes.data?.user,
            })),
        );
    }

    getMe(): Observable<JsonResponse<IUserResponse>> {
        return this.apiService.get<JsonResponse<IUserResponse>>("auth/me");
    }

    // register(data: RegisterRequest): Observable<IUser> {
    //     return this.apiService.post<AuthResponse>("auth/register", data).pipe(
    //         tap(response => {
    //             this.setToken(response.token);
    //         }),
    //         switchMap(() => this.getMe()),
    //         tap(response => {
    //             this.localUserSubject.next(response.user);
    //         }),
    //         map(response => response.user),
    //     );
    // }

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
