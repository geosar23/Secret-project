import { IDepartment } from "../interfaces/department.interface";
import { DepartmentModel } from "../models/department.model";
import { SubDepartmentModel } from "../models/sub-department.model";

export const DepartmentService = {
    getAll: (companyId: string) => DepartmentModel.find({ company: companyId }).sort({ name: 1 }).lean(),

    getById: (id: string, companyId: string) => DepartmentModel.findOne({ _id: id, company: companyId }).lean(),

    create: (data: Omit<IDepartment, "_id" | "company" | "createdAt" | "updatedAt">, companyId: string) =>
        DepartmentModel.create({
            ...data,
            company: companyId,
            isActive: data.isActive ?? true,
        }),

    update: async (id: string, data: Partial<IDepartment>, companyId: string) => {
        await DepartmentModel.updateOne({ _id: id, company: companyId }, data);
        return DepartmentModel.findOne({ _id: id, company: companyId }).lean();
    },

    delete: async (id: string, companyId: string) => {
        const hasSubDepartments = await SubDepartmentModel.countDocuments({ department: id, company: companyId });
        if (hasSubDepartments > 0) {
            throw new Error("Cannot delete department with existing sub-departments");
        }

        return DepartmentModel.deleteOne({ _id: id, company: companyId });
    },
};
