import { ICompany } from "./company.interface";
import { ICountry } from "./country.interface";
import { IDepartment } from "./department.interface";
import { IEmploymentTitle } from "./employment-title.interface";
import { IRole } from "./role.interface";

export interface IProfileImage {
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

export interface ILevel {
    _id: string;
    name: string;
    order?: number;
    company?: { _id: string; name?: string };
}

export interface IOffice {
    _id: string;
    name: string;
    address?: IAddress;
    company?: { _id: string; name?: string };
}

export interface IUser {
    _id?: string;
    name: string;
    email: string;
    password: string;

    // Role & Organization
    role: IRole;
    country?: ICountry;
    employmentTitle?: IEmploymentTitle;
    manager?: IUser;
    level?: ILevel;
    office?: IOffice;
    hrRepresentative?: IUser;

    // Identity
    legalName?: string;
    firstName?: string;
    lastName?: string;
    personalEmail?: string;
    gender?: string;
    birthday?: string | Date;
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
    employmentDate?: string | Date;
    employmentType?: string;
    payrollId?: string;
    isOutsourced?: boolean;

    // Education
    education?: IEducationEntry[];

    // Compensation
    salary?: string;

    // Custom permissions
    grantedPermissions?: string[];
    revokedPermissions?: string[];
    profileImage?: IProfileImage;

    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ICreateUserRequest {
    name: string;
    email: string;
    password: string;
    role: string;
    countryId?: string;
    employmentTitleId?: string;
    managerId?: string;
    departmentId?: string;
    levelId?: string;
    officeId?: string;
    hrRepresentativeId?: string;
    // Identity
    legalName?: string;
    firstName?: string;
    lastName?: string;
    personalEmail?: string;
    gender?: string;
    birthday?: string;
    maritalStatus?: string;
    nationalities?: string[];
    religion?: string;
    // Contact
    workPhone?: string;
    personalPhone?: string;
    homeCountryPhone?: string;
    additionalPhones?: string[];
    currentAddress?: IAddress;
    homeCountryAddress?: IAddress;
    emergencyContact?: IEmergencyContact;
    // Employment
    employmentDate?: string;
    employmentType?: string;
    payrollId?: string;
    isOutsourced?: boolean;
    // Education
    education?: IEducationEntry[];
    // Compensation
    salary?: string;
}

export interface IUpdateUserRequest {
    name?: string;
    email?: string;
    role?: string;
    countryId?: string;
    employmentTitleId?: string;
    managerId?: string;
    isActive?: boolean;
    departmentId?: string;
    levelId?: string;
    officeId?: string;
    hrRepresentativeId?: string;
    // Identity
    legalName?: string;
    firstName?: string;
    lastName?: string;
    personalEmail?: string;
    gender?: string;
    birthday?: string;
    maritalStatus?: string;
    nationalities?: string[];
    religion?: string;
    // Contact
    workPhone?: string;
    personalPhone?: string;
    homeCountryPhone?: string;
    additionalPhones?: string[];
    currentAddress?: IAddress;
    homeCountryAddress?: IAddress;
    emergencyContact?: IEmergencyContact;
    // Employment
    employmentDate?: string;
    employmentType?: string;
    payrollId?: string;
    isOutsourced?: boolean;
    // Education
    education?: IEducationEntry[];
    // Compensation
    salary?: string;
}

export interface IUsersListResponse {
    users: IUser[];
    total: number;
    page: number;
    limit: number;
}

export interface IUserResponse {
    user: IUser;
}

export interface IProfileImageUrlResponse {
    url: string;
    expiresIn: number;
}

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
