import { IUser } from "./user.interface";

export interface UserProfile extends IUser {
    newField?: string;
}

export interface UpdateProfileRequest {
    name?: string;
    email?: string;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}
