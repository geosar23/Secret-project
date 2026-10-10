import { Types } from "mongoose";
import { IEmploymentTitlePopulated } from "./employment-title.interface";
import { ILevel } from "./level.interface";
import { ICountry } from "./country.interface";
import { IRole } from "./role.interface";
import { ICompany } from "./company.interface";
import { IOffice } from "./office.interface";

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
    country?: Types.ObjectId;
    primaryDepartment?: Types.ObjectId;
    primarySubDepartment?: Types.ObjectId;
    secondaryDepartments?: Types.ObjectId[];
    secondarySubDepartments?: Types.ObjectId[];
    employmentTitle?: Types.ObjectId;
    manager?: Types.ObjectId;
    level?: Types.ObjectId;
    office?: Types.ObjectId;
    hrRepresentative?: Types.ObjectId;
    /** Optional personal work schedule; otherwise the country default, then the company default. */
    workSchedule?: Types.ObjectId;

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

    /** JWTs issued before this moment are rejected (password change, forced logout); matched against the JWT `tra` claim. */
    tokensRevokedAt?: Date | null;
    /** Set while the user holds an admin-issued temporary password; only changing it is allowed. */
    mustChangePassword?: boolean;
    /** The temporary password stops working for sign-in after this moment. */
    temporaryPasswordExpiresAt?: Date | null;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IProfileSectionAccess {
    read: boolean;
    write: boolean;
}

export interface IActorAccessOnSubject {
    canEdit: boolean;
    sections: {
        identity: IProfileSectionAccess;
        contact: IProfileSectionAccess;
        employment: IProfileSectionAccess;
        education: IProfileSectionAccess;
        compensation: IProfileSectionAccess;
    };
}

/**
 * Resolved scope attributes from a create-user request.
 * departmentIds are the requested primary and secondary departments.
 */
export interface IUserCreateScopePayload {
    countryId?: string;
    departmentIds?: string[];
    managerId?: string;
}

export type UserCreateAccessResult = { allowed: true } | { allowed: false; reason: string };

export interface IUsersQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    roleId?: string;
    departmentId?: string;
    countryId?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}

/** A populated department / sub-department reference. */
export interface IOrgRef {
    _id: Types.ObjectId;
    name?: string;
}

export interface IUserPopulated
    extends Omit<
        IUser,
        | "role"
        | "company"
        | "country"
        | "manager"
        | "level"
        | "office"
        | "hrRepresentative"
        | "employmentTitle"
        | "primaryDepartment"
        | "primarySubDepartment"
        | "secondaryDepartments"
        | "secondarySubDepartments"
    > {
    primaryDepartment?: IOrgRef;
    primarySubDepartment?: IOrgRef;
    secondaryDepartments?: IOrgRef[];
    secondarySubDepartments?: IOrgRef[];
    role: IRole;
    company: ICompany;
    country?: ICountry;
    employmentTitle?: IEmploymentTitlePopulated;
    manager?: IUser;
    level?: ILevel;
    office?: IOffice;
    hrRepresentative?: IUser;
}
