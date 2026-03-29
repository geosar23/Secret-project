import { IDepartment } from "../interfaces/department.interface";
import { SubDepartmentModel } from "../models/sub-department.model";
import { departmentRepository } from "../repositories/department.repository";

export const DepartmentService = {
    getAll: (companyId: string) =>
        departmentRepository(companyId).find().populate("company", "_id name").sort({ name: 1 }).lean(),

    getById: (id: string, companyId: string) =>
        departmentRepository(companyId).findById(id).populate("company", "_id name").lean(),

    create: async (data: Omit<IDepartment, "_id" | "createdAt" | "updatedAt">, companyId: string) => {
        if (!companyId) {
            throw new Error("Company ID is required for creating department");
        }

        const repository = departmentRepository(companyId);
        const created = await repository.create(data as Partial<IDepartment>);
        return repository.findById(created._id).populate("company", "_id name").lean();
    },

    update: async (id: string, data: Partial<IDepartment>, companyId: string) => {
        const repository = departmentRepository(companyId);
        await repository.updateOne({ _id: id }, data);
        return repository.findById(id).populate("company", "_id name").lean();
    },

    delete: async (id: string, companyId: string) => {
        const hasSubDepartments = await SubDepartmentModel.countDocuments({ department: id, company: companyId });
        if (hasSubDepartments > 0) {
            throw new Error("Cannot delete department with existing sub-departments");
        }

        return departmentRepository(companyId).deleteOne({ _id: id });
    },
};
