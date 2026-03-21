export interface ICompany {
    _id?: string;
    name: string;
    slug: string;
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
