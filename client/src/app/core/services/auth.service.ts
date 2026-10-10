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

    setLocalUser(user: IUser | null): void {
        this.localUserSubject.next(user);
    }

    patchLocalUser(userPatch: Partial<IUser>): void {
        const currentUser = this.getLocalUser();

        if (!currentUser) {
            return;
        }

        this.setLocalUser({
            ...currentUser,
            ...userPatch,
        });
    }

    refreshCurrentUser(): Observable<IUser> {
        return this.getMe().pipe(
            map((response: JsonResponse<IUserResponse>) => {
                if (!response.success || !response.data?.user) {
                    throw new Error(response.message || "Failed to refresh current user");
                }

                return response.data.user;
            }),
            tap(user => {
                this.setLocalUser(user);
            }),
        );
    }

    patchAndRefreshCurrentUser(userPatch: Partial<IUser>): Observable<IUser> {
        this.patchLocalUser(userPatch);
        return this.refreshCurrentUser();
    }

    private initializeAuth(): void {
        const token = this.getToken();
        if (token) {
            // Decode JWT token to get user info
            try {
                const payload = decodeToken(token);
                if (payload && isTokenValid(payload)) {
                    this.refreshCurrentUser().subscribe({
                        next: () => {
                            return;
                        },
                        error: () => {
                            this.setLocalUser(null);
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
            switchMap((loginRes: JsonResponse<AuthResponse>) => {
                if (!loginRes.success || !loginRes.data?.token) {
                    return of({
                        success: false,
                        message: loginRes.message || "Login failed",
                    } as JsonResponse<IUserResponse>);
                }

                this.setToken(loginRes.data.token);
                const mustChangePassword = !!loginRes.data.mustChangePassword;

                return this.refreshCurrentUser().pipe(
                    map(
                        user =>
                            ({
                                success: true,
                                data: { user: { ...user, mustChangePassword } },
                            }) as JsonResponse<IUserResponse>,
                    ),
                );
            }),
            map((meRes: JsonResponse<IUserResponse>) => ({
                success: meRes.success,
                message: meRes.message,
                data: meRes.data?.user,
            })),
        );
    }

    /** Public: asks for a reset link. The server answers the same way whether or not the account exists. */
    forgotPassword(email: string): Observable<JsonResponse<{ message: string }>> {
        return this.apiService.post<JsonResponse<{ message: string }>>("auth/forgot-password", { email });
    }

    /** Public: sets a new password with the token from an emailed link. */
    setupPassword(token: string, newPassword: string): Observable<JsonResponse<{ message: string }>> {
        return this.apiService.post<JsonResponse<{ message: string }>>("auth/password-setup", { token, newPassword });
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
        this.setLocalUser(null);
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
