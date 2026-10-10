import { companyModel } from "../models/company.model";
import { WorkScheduleModel } from "../models/work-schedule.model";

export function workScheduleRepository(companyId: string) {
    return companyModel(WorkScheduleModel, companyId);
}
