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

export interface ProfileEditDialogPayload {
    name: string;
    email: string;
}

export interface ProfileEditDialogData {
    userId: string;
    name: string;
    email: string;
}

export interface ProfileEditDialogResult {
    payload: ProfileEditDialogPayload;
}

export interface ProfileRouteContext {
    isOwnProfile: boolean;
    pageTitle: string;
    userId: string | null;
}

export interface ChangePasswordDialogResult {
    currentPassword: string;
    newPassword: string;
}

export interface ChangePasswordDialogData {
    userId: string;
}
