import { companyModel } from "../models/company.model";
import { UserModel } from "../models/user.model";

export function userRepository(companyId: string) {
    if (companyId === "x") {
        return UserModel;
    }
    return companyModel(UserModel, companyId);
}
