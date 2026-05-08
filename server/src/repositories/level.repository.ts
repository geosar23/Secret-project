import { companyModel } from "../models/company.model";
import { LevelModel } from "../models/level.model";

export function levelRepository(companyId: string) {
    return companyModel(LevelModel, companyId);
}
