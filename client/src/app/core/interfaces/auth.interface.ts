export interface LoginRequest {
    email: string;
    password: string;
}

// export interface RegisterRequest {
//     name: string;
//     email: string;
//     password: string;
// }

export interface AuthResponse {
    token: string;
}

export interface tokenPayload {
    id: string;
    email: string;
    name?: string;
    roleId?: string;
    companyId?: string;
    exp?: number;
}
