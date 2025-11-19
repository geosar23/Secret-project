export interface ISession {
    id: string;
    sessionToken: string;
    userId: string;
    ipAddress: string;
    systemInfo: string;
    createdAt: Date;
    expiresAt: Date;
}
