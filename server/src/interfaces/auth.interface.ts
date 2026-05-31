import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";

export interface LoginDto {
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
}

export interface tokenPayload {
    id: string;
    companyId: string;
}

export interface AuthenticatedRequest extends Request {
    decoded?: tokenPayload | string | JwtPayload;
}
