import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { ApiService } from './api.service';

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
    };
}

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private currentUserSubject = new BehaviorSubject<AuthResponse['user'] | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();

    constructor(
        private api: ApiService,
        private router: Router,
    ) {
        // Check if user is already logged in
        const token = this.getToken();
        if (token) {
            // TODO: Optionally decode token and validate with backend
        }
    }

    login(credentials: LoginRequest): Observable<AuthResponse> {
        return this.api.post<AuthResponse>('auth/login', credentials).pipe(
            tap(response => {
                this.setToken(response.token);
                this.currentUserSubject.next(response.user);
            }),
        );
    }

    register(data: RegisterRequest): Observable<AuthResponse> {
        return this.api.post<AuthResponse>('auth/register', data).pipe(
            tap(response => {
                this.setToken(response.token);
                this.currentUserSubject.next(response.user);
            }),
        );
    }

    logout(): void {
        localStorage.removeItem('token');
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
    }

    getToken(): string | null {
        return localStorage.getItem('token');
    }

    isAuthenticated(): boolean {
        return !!this.getToken();
    }

    private setToken(token: string): void {
        localStorage.setItem('token', token);
    }
}
