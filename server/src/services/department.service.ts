import { IDepartment } from "../interfaces/department.interface";
import { SubDepartmentModel } from "../models/sub-department.model";
import { departmentRepository } from "../repositories/department.repository";

export const DepartmentService = {
    getAll: (companyId: string) => departmentRepository(companyId).find().sort({ name: 1 }).lean(),

    getById: (id: string, companyId: string) => departmentRepository(companyId).findById(id).lean(),

    create: (data: Omit<IDepartment, "_id" | "company" | "createdAt" | "updatedAt">, companyId: string) =>
        departmentRepository(companyId).create({
            ...data,
            isActive: data.isActive ?? true,
        }),

    update: async (id: string, data: Partial<IDepartment>, companyId: string) => {
        const repository = departmentRepository(companyId);
        await repository.updateOne({ _id: id }, data);
        return repository.findById(id).lean();
    },

    delete: async (id: string, companyId: string) => {
        const hasSubDepartments = await SubDepartmentModel.countDocuments({ department: id, company: companyId });
        if (hasSubDepartments > 0) {
            throw new Error("Cannot delete department with existing sub-departments");
        }

        return departmentRepository(companyId).deleteOne({ _id: id });
    },
};
