export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    /** True while the user holds an admin-issued temporary password and has to choose their own. */
    mustChangePassword?: boolean;
}

export interface tokenPayload {
    id: string;
    companyId: string;
    exp: number;
}
