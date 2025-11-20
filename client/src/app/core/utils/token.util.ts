export interface JwtPayload {
    id: string;
    email: string;
    name?: string;
    role?: string;
    exp?: number;
}

/**
 * Decode a JWT token without verification
 * Note: Server will verify token authenticity
 */
export function decodeToken(token: string): JwtPayload | null {
    try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join(""),
        );
        return JSON.parse(jsonPayload) as JwtPayload;
    } catch {
        return null;
    }
}

/**
 * Check if a decoded token payload is still valid
 */
export function isTokenValid(payload: JwtPayload | null): boolean {
    if (!payload || !payload.exp) {
        return false;
    }
    // Check if token is expired (exp is in seconds, Date.now() is in milliseconds)
    return payload.exp * 1000 > Date.now();
}
