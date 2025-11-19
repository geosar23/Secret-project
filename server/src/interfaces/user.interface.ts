export interface IUser {
    id: string;
    name: string;
    email: string;
    role: string;
    password: string;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
