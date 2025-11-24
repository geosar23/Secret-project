import { DefaultUserRoles } from "../enums/user-role.enum";
import { IUser } from "./user.interface";
import { Request } from "express";

export interface LoginDto {
    email: string;
    password: string;
}

export interface RegisterDto {
    name: string;
    email: string;
    password: string;
    role?: DefaultUserRoles;
}

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
        name: string;
        role: DefaultUserRoles;
    };
}

export interface JwtPayload {
    id: string;
    email: string;
    name?: string;
    role?: string;
}

export interface AuthenticatedRequest extends Request {
    user?: IUser;
    decoded?: {
        id: string;
        email: string;
        name?: string;
        role?: string;
    };
}
