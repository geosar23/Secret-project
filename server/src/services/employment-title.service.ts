import { IEmploymentTitle } from "../interfaces/employment-title.interface";
import { EmploymentTitleModel } from "../models/employment-title.model";
import { SubDepartmentModel } from "../models/sub-department.model";
import { UserModel } from "../models/user.model";

export const EmploymentTitleService = {
    getAll: (companyId: string) =>
        EmploymentTitleModel.find({ company: companyId })
            .populate({
                path: "subDepartment",
                select: "_id name department",
                populate: { path: "department", select: "_id name" },
            })
            .sort({ name: 1 })
            .lean(),

    getById: (id: string, companyId: string) =>
        EmploymentTitleModel.findOne({ _id: id, company: companyId })
            .populate({
                path: "subDepartment",
                select: "_id name department",
                populate: { path: "department", select: "_id name" },
            })
            .lean(),

    create: async (data: Omit<IEmploymentTitle, "_id" | "company" | "createdAt" | "updatedAt">, companyId: string) => {
        const subDepartment = await SubDepartmentModel.findOne({ _id: data.subDepartment, company: companyId }).lean();
        if (!subDepartment) {
            throw new Error("Invalid sub-department for this company");
        }

        return EmploymentTitleModel.create({
            ...data,
            company: companyId,
            isActive: data.isActive ?? true,
        });
    },

    update: async (id: string, data: Partial<IEmploymentTitle>, companyId: string) => {
        if (data.subDepartment) {
            const subDepartment = await SubDepartmentModel.findOne({
                _id: data.subDepartment,
                company: companyId,
            }).lean();
            if (!subDepartment) {
                throw new Error("Invalid sub-department for this company");
            }
        }

        await EmploymentTitleModel.updateOne({ _id: id, company: companyId }, data);
        return EmploymentTitleModel.findOne({ _id: id, company: companyId })
            .populate({
                path: "subDepartment",
                select: "_id name department",
                populate: { path: "department", select: "_id name" },
            })
            .lean();
    },

    delete: async (id: string, companyId: string) => {
        const assignedUsers = await UserModel.countDocuments({ company: companyId, employmentTitle: id });
        if (assignedUsers > 0) {
            throw new Error("Cannot delete employment title assigned to users");
        }

        return EmploymentTitleModel.deleteOne({ _id: id, company: companyId });
    },
};
