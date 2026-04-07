import { ICountry } from "../interfaces/country.interface";
import { countryRepository } from "../repositories/country.repository";

export const CountryService = {
    getAll: (companyId: string) =>
        countryRepository(companyId).find().populate("company", "_id name").sort({ name: 1 }).lean(),

    getById: (id: string, companyId: string) =>
        countryRepository(companyId).findById(id).populate("company", "_id name").lean(),

    create: (data: Omit<ICountry, "_id" | "company" | "createdAt" | "updatedAt">, companyId: string) =>
        countryRepository(companyId).create({
            ...data,
            isActive: data.isActive ?? true,
        }),

    update: async (id: string, data: Partial<ICountry>, companyId: string) => {
        const repository = countryRepository(companyId);
        await repository.updateOne({ _id: id }, data);
        return repository.findById(id).lean();
    },

    delete: (id: string, companyId: string) => countryRepository(companyId).deleteOne({ _id: id }),
};
