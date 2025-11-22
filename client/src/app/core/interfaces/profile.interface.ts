export interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: string;
    companyId?: string;
    departmentId?: string;
    managerId?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface UpdateProfileRequest {
    name?: string;
    email?: string;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}
