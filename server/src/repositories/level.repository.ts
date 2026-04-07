import { companyModel } from "../models/company.model";
import { LevelModel } from "../models/level.model";
import { config } from "../config/env";

export function levelRepository(companyId: string) {
    if (companyId === config.OG_COMPANY_ID) {
        return LevelModel;
    }
    return companyModel(LevelModel, companyId);
}
