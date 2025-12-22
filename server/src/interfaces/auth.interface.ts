import { Request } from "express";

export interface LoginDto {
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
    name: string;
    role: string;
    company?: string;
}

export interface AuthenticatedRequest extends Request {
    decoded?: JwtPayload;
}
