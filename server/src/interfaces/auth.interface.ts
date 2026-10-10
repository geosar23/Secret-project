import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";

export interface LoginDto {
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    /** True while the user holds an admin-issued temporary password and has to choose their own. */
    mustChangePassword: boolean;
}

export interface tokenPayload {
    id: string;
    companyId: string;
    /** Session revocation marker: epoch ms of the user's sessionsRevokedAt at sign-in, 0 when never revoked. */
    sra?: number;
}

export interface AuthenticatedRequest extends Request {
    decoded?: tokenPayload | string | JwtPayload;
}
