export interface IUser {
    id: string;
    _id?: string;
    name: string;
    email: string;
    role: string;
    password: string;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
