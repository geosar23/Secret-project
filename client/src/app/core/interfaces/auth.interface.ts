export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
}

export interface tokenPayload {
    id: string;
    companyId: string;
    exp: number;
}
