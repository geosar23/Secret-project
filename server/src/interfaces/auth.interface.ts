import { Request } from "express";

export interface LoginDto {
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
}

export interface tokenPayload {
    id: string;
    email: string;
    name: string;
    roleId: string;
    companyId?: string;
}

export interface AuthenticatedRequest extends Request {
    decoded?: tokenPayload;
}
