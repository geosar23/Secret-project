import { FilterQuery } from "mongoose";
import { IRole } from "../interfaces/role.interface";
import { RoleModel } from "../models/role.model";

const withRoleScope = (companyId: string, filter: FilterQuery<IRole> = {}) => {
    if (companyId === process.env.OG_COMPANY_ID) {
        return filter;
    }

    return {
        $and: [{ $or: [{ company: companyId }, { company: { $exists: false } }] }, filter],
    } as FilterQuery<IRole>;
};

export function roleRepository(companyId: string) {
    return {
        find(filter: FilterQuery<IRole> = {}) {
            return RoleModel.find(withRoleScope(companyId, filter));
        },

        findOne(filter: FilterQuery<IRole> = {}) {
            return RoleModel.findOne(withRoleScope(companyId, filter));
        },

        findById(id: string) {
            return RoleModel.findOne(withRoleScope(companyId, { _id: id }));
        },

        create(data: Partial<IRole>) {
            if (companyId !== process.env.OG_COMPANY_ID && !data.company) {
                return RoleModel.create({ ...data, company: companyId });
            }
            return RoleModel.create(data);
        },

        findOneAndUpdate(filter: FilterQuery<IRole>, update: Partial<IRole>, options: { new: true }) {
            return RoleModel.findOneAndUpdate(withRoleScope(companyId, filter), update, options);
        },

        deleteOne(filter: FilterQuery<IRole>) {
            return RoleModel.deleteOne(withRoleScope(companyId, filter));
        },
    };
}
