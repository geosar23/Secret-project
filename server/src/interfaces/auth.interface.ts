import { Request } from "express";

export interface LoginDto {
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    user: tokenPayload;
}

export interface tokenPayload {
    id: string;
    email: string;
    name: string;
    role: string;
}

export interface AuthenticatedRequest extends Request {
    decoded?: tokenPayload;
}
