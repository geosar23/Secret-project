import { Types } from "mongoose";

export interface IProfileImageMetadata {
    bucket: string;
    path: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: Date;
}

export interface IAddress {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
}

export interface IEmergencyContact {
    name?: string;
    relationship?: string;
    phone?: string;
}

export interface IEducationEntry {
    institution?: string;
    degreeLevel?: string;
    degreeTitle?: string;
    yearAchieved?: number;
}

export interface IUser {
    _id?: Types.ObjectId;
    name: string;
    email: string;
    password: string;

    // Role & Organization
    role: Types.ObjectId;
    company?: Types.ObjectId;
    department?: Types.ObjectId;
    country?: Types.ObjectId;
    employmentTitle?: Types.ObjectId;
    manager?: Types.ObjectId;
    managedDepartments?: Types.ObjectId[];
    level?: Types.ObjectId;
    office?: Types.ObjectId;
    hrRepresentative?: Types.ObjectId;

    // Identity
    legalName?: string;
    firstName?: string;
    lastName?: string;
    personalEmail?: string;
    gender?: string;
    birthday?: Date;
    maritalStatus?: string;
    nationalities?: string[];
    religion?: string;

    // Contact
    workPhone?: string;
    personalPhone?: string;
    additionalPhones?: string[];
    currentAddress?: IAddress;
    homeCountryAddress?: IAddress;
    homeCountryPhone?: string;
    emergencyContact?: IEmergencyContact;

    // Employment
    employmentDate?: Date;
    employmentType?: string;
    payrollId?: string;
    isOutsourced?: boolean;

    // Education
    education?: IEducationEntry[];

    // Compensation (AES-256-GCM encrypted string when stored)
    salary?: string;

    // Custom permissions
    grantedPermissions?: string[];
    revokedPermissions?: string[];
    profileImage?: IProfileImageMetadata;

    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface IUsersQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    roleId?: string;
    companyId?: string | null;
    departmentId?: string;
    countryId?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}
