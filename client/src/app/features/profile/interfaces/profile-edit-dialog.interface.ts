import { IUser } from "../../../core/interfaces/user.interface";

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
    updatedUser: IUser;
}
