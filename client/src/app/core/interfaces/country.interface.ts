export interface ICountry {
    _id?: string;
    name: string;
    description?: string;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ICreateCountryRequest {
    name: string;
    description?: string;
}

export interface IUpdateCountryRequest {
    name?: string;
    description?: string;
    isActive?: boolean;
}
