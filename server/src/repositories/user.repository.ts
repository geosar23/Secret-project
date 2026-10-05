import { companyModel } from "../models/company.model";
import { UserModel } from "../models/user.model";

export function userRepository(companyId: string) {
    return companyModel(UserModel, companyId);
}

/**
 * Email is globally unique and login must resolve the company from it,
 * so these lookups are intentionally not company-scoped. Use only for identity resolution.
 */
export function userIdentityRepository() {
    return {
        findByEmail(email: string) {
            return UserModel.findOne({ email });
        },

        emailExists(email: string) {
            return UserModel.exists({ email });
        },
    };
}
