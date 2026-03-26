import { ISubDepartment } from "../interfaces/sub-department.interface";
import { DepartmentModel } from "../models/department.model";
import { EmploymentTitleModel } from "../models/employment-title.model";
import { SubDepartmentModel } from "../models/sub-department.model";

export const SubDepartmentService = {
    getAll: (companyId: string) =>
        SubDepartmentModel.find({ company: companyId }).populate("department", "_id name").sort({ name: 1 }).lean(),

    getById: (id: string, companyId: string) =>
        SubDepartmentModel.findOne({ _id: id, company: companyId }).populate("department", "_id name").lean(),

    create: async (data: Omit<ISubDepartment, "_id" | "company" | "createdAt" | "updatedAt">, companyId: string) => {
        const department = await DepartmentModel.findOne({ _id: data.department, company: companyId }).lean();
        if (!department) {
            throw new Error("Invalid department for this company");
        }

        return SubDepartmentModel.create({
            ...data,
            company: companyId,
            isActive: data.isActive ?? true,
        });
    },

    update: async (id: string, data: Partial<ISubDepartment>, companyId: string) => {
        if (data.department) {
            const department = await DepartmentModel.findOne({ _id: data.department, company: companyId }).lean();
            if (!department) {
                throw new Error("Invalid department for this company");
            }
        }

        await SubDepartmentModel.updateOne({ _id: id, company: companyId }, data);
        return SubDepartmentModel.findOne({ _id: id, company: companyId }).populate("department", "_id name").lean();
    },

    delete: async (id: string, companyId: string) => {
        const hasTitles = await EmploymentTitleModel.countDocuments({ subDepartment: id, company: companyId });
        if (hasTitles > 0) {
            throw new Error("Cannot delete sub-department with existing employment titles");
        }

        return SubDepartmentModel.deleteOne({ _id: id, company: companyId });
    },
};
