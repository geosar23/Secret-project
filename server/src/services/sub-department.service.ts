import { ISubDepartment } from "../interfaces/sub-department.interface";
import { departmentRepository } from "../repositories/department.repository";
import { employmentTitleRepository } from "../repositories/employment-title.repository";
import { subDepartmentRepository } from "../repositories/sub-department.repository";

export const SubDepartmentService = {
    getAll: (companyId: string) =>
        subDepartmentRepository(companyId).find().populate("department", "_id name").sort({ name: 1 }).lean(),

    getById: (id: string, companyId: string) =>
        subDepartmentRepository(companyId).findById(id).populate("department", "_id name").lean(),

    create: async (data: Omit<ISubDepartment, "_id" | "company" | "createdAt" | "updatedAt">, companyId: string) => {
        const department = await departmentRepository(companyId).findById(String(data.department)).lean();
        if (!department) {
            throw new Error("Invalid department for this company");
        }

        return subDepartmentRepository(companyId).create({
            ...data,
            isActive: data.isActive ?? true,
        });
    },

    update: async (id: string, data: Partial<ISubDepartment>, companyId: string) => {
        const repository = subDepartmentRepository(companyId);

        if (data.department) {
            const department = await departmentRepository(companyId).findById(String(data.department)).lean();
            if (!department) {
                throw new Error("Invalid department for this company");
            }
        }

        await repository.updateOne({ _id: id }, data);
        return repository.findById(id).populate("department", "_id name").lean();
    },

    delete: async (id: string, companyId: string) => {
        const hasTitles = await employmentTitleRepository(companyId).count({ subDepartment: id });
        if (hasTitles > 0) {
            throw new Error("Cannot delete sub-department with existing employment titles");
        }

        return subDepartmentRepository(companyId).deleteOne({ _id: id });
    },
};
