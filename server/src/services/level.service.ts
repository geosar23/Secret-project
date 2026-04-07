import { ILevel } from "../interfaces/level.interface";
import { levelRepository } from "../repositories/level.repository";

export const LevelService = {
    getAll: (companyId: string) => levelRepository(companyId).find().sort({ order: 1, name: 1 }).lean(),

    getById: (id: string, companyId: string) => levelRepository(companyId).findById(id).lean(),

    create: (data: Omit<ILevel, "_id" | "createdAt" | "updatedAt">, companyId: string) =>
        levelRepository(companyId).create({ ...data }),

    update: async (id: string, data: Partial<ILevel>, companyId: string) => {
        const repo = levelRepository(companyId);
        await repo.updateOne({ _id: id }, data);
        return repo.findById(id).lean();
    },

    delete: (id: string, companyId: string) => levelRepository(companyId).deleteOne({ _id: id }),
};
