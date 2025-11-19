export interface ISession {
    id: string;
    sessionToken: string;
    userId: string;
    userEmail: string;
    ipAddress: string;
    userAgent: string;
    createdAt: Date;
    expiresAt: Date;
    lastActivityAt: Date;
    isActive: boolean;
}
