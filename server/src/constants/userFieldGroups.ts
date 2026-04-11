import { PermissionKeys } from "../enums/permissions.enum";

/**
 * Maps each section-level edit permission to the user field names it protects.
 * Used by the update controller to validate that the actor holds the required
 * permission for every section whose fields appear in the request body.
 */
export const USER_FIELD_GROUPS: Record<string, string[]> = {
    [PermissionKeys.CAN_EDIT_USER_IDENTITY]: [
        "legalName",
        "firstName",
        "lastName",
        "personalEmail",
        "gender",
        "birthday",
        "maritalStatus",
        "nationalities",
        "religion",
    ],
    [PermissionKeys.CAN_EDIT_USER_CONTACT]: [
        "workPhone",
        "personalPhone",
        "additionalPhones",
        "currentAddress",
        "homeCountryAddress",
        "homeCountryPhone",
        "emergencyContact",
    ],
    [PermissionKeys.CAN_EDIT_USER_EMPLOYMENT]: [
        "employmentDate",
        "employmentType",
        "payrollId",
        "office",
        "officeId",
        "isOutsourced",
        "hrRepresentative",
        "hrRepresentativeId",
        "level",
        "levelId",
        "manager",
        "managerId",
        "department",
        "departmentId",
        "subDepartment",
        "employmentTitle",
        "employmentTitleId",
        "company",
        "companyId",
        "role",
    ],
    [PermissionKeys.CAN_EDIT_USER_EDUCATION]: ["education"],
    [PermissionKeys.CAN_EDIT_USER_COMPENSATION]: ["salary"],
};
