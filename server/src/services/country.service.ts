import { ICountry } from "../interfaces/country.interface";
import { CountryModel } from "../models/country.model";

export const CountryService = {
    getAll: (companyId: string) => CountryModel.find({ company: companyId }).sort({ name: 1 }).lean(),

    getById: (id: string, companyId: string) => CountryModel.findOne({ _id: id, company: companyId }).lean(),

    create: (data: Omit<ICountry, "_id" | "company" | "createdAt" | "updatedAt">, companyId: string) =>
        CountryModel.create({
            ...data,
            company: companyId,
            isActive: data.isActive ?? true,
        }),

    update: async (id: string, data: Partial<ICountry>, companyId: string) => {
        await CountryModel.updateOne({ _id: id, company: companyId }, data);
        return CountryModel.findOne({ _id: id, company: companyId }).lean();
    },

    delete: (id: string, companyId: string) => CountryModel.deleteOne({ _id: id, company: companyId }),
};
