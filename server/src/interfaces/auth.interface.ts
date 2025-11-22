import { UserRole } from "../enums";

export interface LoginDto {
    email: string;
    password: string;
}

export interface RegisterDto {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
}

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
        name: string;
        role: UserRole;
    };
}

export interface JwtPayload {
    id: string;
    email: string;
    name?: string;
    role?: string;
}
