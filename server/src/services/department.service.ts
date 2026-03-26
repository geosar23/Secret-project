import { IDepartment } from "../interfaces/department.interface";
import { DepartmentModel } from "../models/department.model";
import { EmploymentTitleModel } from "../models/employment-title.model";
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

    seedExamples: async (companyId: string) => {
        const departmentSeeds = [
            { name: "Engineering", description: "Product and platform development" },
            { name: "Human Resources", description: "People operations and recruitment" },
            { name: "Finance", description: "Accounting and financial planning" },
        ];

        const createdDepartments = await Promise.all(
            departmentSeeds.map(seed =>
                DepartmentModel.findOneAndUpdate(
                    { company: companyId, name: seed.name },
                    { $setOnInsert: { ...seed, company: companyId, isActive: true } },
                    { upsert: true, new: true },
                ),
            ),
        );

        const departmentMap = new Map(createdDepartments.map(dep => [dep.name, dep]));

        const subDepartmentSeeds = [
            {
                name: "Backend",
                description: "APIs and infrastructure",
                departmentName: "Engineering",
            },
            {
                name: "Frontend",
                description: "Web and UX implementation",
                departmentName: "Engineering",
            },
            {
                name: "Talent Acquisition",
                description: "Hiring process and sourcing",
                departmentName: "Human Resources",
            },
            {
                name: "Payroll",
                description: "Salary and benefits processing",
                departmentName: "Finance",
            },
        ];

        const createdSubDepartments = [];
        for (const seed of subDepartmentSeeds) {
            const department = departmentMap.get(seed.departmentName);
            if (!department) {
                continue;
            }

            const subDepartment = await SubDepartmentModel.findOneAndUpdate(
                {
                    company: companyId,
                    department: department._id,
                    name: seed.name,
                },
                {
                    $setOnInsert: {
                        name: seed.name,
                        description: seed.description,
                        company: companyId,
                        department: department._id,
                        isActive: true,
                    },
                },
                { upsert: true, new: true },
            );
            if (subDepartment) {
                createdSubDepartments.push(subDepartment);
            }
        }

        const subDepartmentMap = new Map(createdSubDepartments.map(sub => [sub.name, sub]));

        const titleSeeds = [
            {
                name: "Senior Backend Engineer",
                description: "Designs and builds backend services",
                subDepartmentName: "Backend",
            },
            {
                name: "Frontend Engineer",
                description: "Builds client-facing web applications",
                subDepartmentName: "Frontend",
            },
            {
                name: "Technical Recruiter",
                description: "Owns engineering hiring pipeline",
                subDepartmentName: "Talent Acquisition",
            },
            {
                name: "Payroll Specialist",
                description: "Maintains payroll operations",
                subDepartmentName: "Payroll",
            },
        ];

        const createdTitles = [];
        for (const seed of titleSeeds) {
            const subDepartment = subDepartmentMap.get(seed.subDepartmentName);
            if (!subDepartment) {
                continue;
            }

            const title = await EmploymentTitleModel.findOneAndUpdate(
                {
                    company: companyId,
                    subDepartment: subDepartment._id,
                    name: seed.name,
                },
                {
                    $setOnInsert: {
                        name: seed.name,
                        description: seed.description,
                        company: companyId,
                        subDepartment: subDepartment._id,
                        isActive: true,
                    },
                },
                { upsert: true, new: true },
            );
            if (title) {
                createdTitles.push(title);
            }
        }

        return {
            departments: createdDepartments.length,
            subDepartments: createdSubDepartments.length,
            employmentTitles: createdTitles.length,
        };
    },
};
