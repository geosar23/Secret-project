import { IOffice } from "../interfaces/office.interface";
import { officeRepository } from "../repositories/office.repository";

export const OfficeService = {
    getAll: (companyId: string) =>
        officeRepository(companyId)
            .find()
            .populate("country", "_id name")
            .populate("company", "_id name")
            .sort({ name: 1 })
            .lean(),

    getById: (id: string, companyId: string) =>
        officeRepository(companyId).findById(id).populate("country", "_id name").lean(),

    create: (data: Omit<IOffice, "_id" | "createdAt" | "updatedAt">, companyId: string) =>
        officeRepository(companyId).create({ ...data }),

    update: async (id: string, data: Partial<IOffice>, companyId: string) => {
        const repo = officeRepository(companyId);
        await repo.updateOne({ _id: id }, data);
        return repo.findById(id).populate("country", "_id name").lean();
    },

    delete: (id: string, companyId: string) => officeRepository(companyId).deleteOne({ _id: id }),
};
