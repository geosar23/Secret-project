export interface ISession {
    _id?: string;
    sessionToken: string;
    userId: string;
    ipAddress: string;
    systemInfo: string;
    createdAt: Date;
    expiresAt: Date;
}
