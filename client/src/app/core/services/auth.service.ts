import { Injectable, inject } from "@angular/core";
import { Router } from "@angular/router";
import { Observable, BehaviorSubject, tap, switchMap, map } from "rxjs";
import { ApiService } from "./api.service";
import { decodeToken, isTokenValid } from "../utils/token.util";
import { LoginRequest, AuthResponse } from "../interfaces/auth.interface";
import { IUser, UserResponse } from "../interfaces/user.interface";
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
                        next: (response: JsonResponse<UserResponse>) => {
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
        return this.apiService.post<JsonResponse<AuthResponse>>("auth/login", credentials).pipe(
            tap((response: JsonResponse<AuthResponse>) => {
                this.setToken(response.data!.token);
            }),
            switchMap(() => this.getMe()),
            tap((response: JsonResponse<UserResponse>) => {
                this.localUserSubject.next(response.data!.user);
            }),
            tap(() => { this.router.navigate(["/"]) } ),
            map(response => ({ success: true, data: response.data!.user } as JsonResponse<IUser>)),
        );
    }

    getMe(): Observable<JsonResponse<UserResponse>> {
        return this.apiService.get<JsonResponse<UserResponse>>("auth/me");
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
