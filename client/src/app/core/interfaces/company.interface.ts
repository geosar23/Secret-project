export interface ILogoMetadata {
    bucket: string;
    path: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: Date;
}

export interface ILogoUrlResponse {
    url: string;
    expiresIn: number;
}

export interface ICompany {
    _id?: string;
    name: string;
    slug: string;
    logo?: ILogoMetadata;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ICreateCompanyRequest {
    name: string;
    slug: string;
}

export interface IUpdateCompanyRequest {
    name?: string;
    slug?: string;
    isActive?: boolean;
}
