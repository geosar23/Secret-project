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
    user: JwtPayload;
}

export interface JwtPayload {
    id: string;
    email: string;
    name?: string;
    role?: string;
    exp?: number;
}
