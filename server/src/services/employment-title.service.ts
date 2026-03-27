import { IEmploymentTitle } from "../interfaces/employment-title.interface";
import { employmentTitleRepository } from "../repositories/employment-title.repository";
import { subDepartmentRepository } from "../repositories/sub-department.repository";
import { userRepository } from "../repositories/user.repository";

export const EmploymentTitleService = {
    getAll: (companyId: string) =>
        employmentTitleRepository(companyId)
            .find()
            .populate({
                path: "subDepartment",
                select: "_id name department",
                populate: { path: "department", select: "_id name" },
            })
            .sort({ name: 1 })
            .lean(),

    getById: (id: string, companyId: string) =>
        employmentTitleRepository(companyId)
            .findById(id)
            .populate({
                path: "subDepartment",
                select: "_id name department",
                populate: { path: "department", select: "_id name" },
            })
            .lean(),

    create: async (data: Omit<IEmploymentTitle, "_id" | "company" | "createdAt" | "updatedAt">, companyId: string) => {
        const subDepartment = await subDepartmentRepository(companyId).findById(String(data.subDepartment)).lean();
        if (!subDepartment) {
            throw new Error("Invalid sub-department for this company");
        }

        return employmentTitleRepository(companyId).create({
            ...data,
            isActive: data.isActive ?? true,
        });
    },

    update: async (id: string, data: Partial<IEmploymentTitle>, companyId: string) => {
        const repository = employmentTitleRepository(companyId);

        if (data.subDepartment) {
            const subDepartment = await subDepartmentRepository(companyId).findById(String(data.subDepartment)).lean();
            if (!subDepartment) {
                throw new Error("Invalid sub-department for this company");
            }
        }

        await repository.updateOne({ _id: id }, data);
        return repository
            .findById(id)
            .populate({
                path: "subDepartment",
                select: "_id name department",
                populate: { path: "department", select: "_id name" },
            })
            .lean();
    },

    delete: async (id: string, companyId: string) => {
        const assignedUsers = await userRepository(companyId).count({ employmentTitle: id });
        if (assignedUsers > 0) {
            throw new Error("Cannot delete employment title assigned to users");
        }

        return employmentTitleRepository(companyId).deleteOne({ _id: id });
    },
};
