export interface IRole {
    _id: string;
    name: string;
    role: string;
    permissions?: string[];
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
}