import { CompanyModel } from "../models/company.model";

export const CompanyService = {
    getAll: () => CompanyModel.find().sort({ name: 1 }).lean(),

    getById: (id: string) => CompanyModel.findById(id).lean(),

    create: async (data: { name: string; slug: string }) => {
        const company = await CompanyModel.create({ ...data, isActive: true });
        return company;
    },

    update: async (id: string, data: { name?: string; slug?: string; isActive?: boolean }) => {
        await CompanyModel.updateOne({ _id: id }, data);
        return CompanyModel.findById(id).lean();
    },

    delete: (id: string) => CompanyModel.deleteOne({ _id: id }),
};
