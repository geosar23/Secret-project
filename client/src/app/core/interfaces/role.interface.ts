export interface IRole {
    _id: string;
    name: string;
    description?: string;
    role: string;
    permissions?: string[];
    isSytemRole?: boolean;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
