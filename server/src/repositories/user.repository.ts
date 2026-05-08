import { companyModel } from "../models/company.model";
import { UserModel } from "../models/user.model";

export function userRepository(companyId: string) {
    return companyModel(UserModel, companyId);
}
