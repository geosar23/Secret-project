/** Values match server-side profile.enum.ts */

export enum Gender {
    MALE = "male",
    FEMALE = "female",
    OTHER = "other",
    PREFER_NOT_TO_SAY = "prefer_not_to_say",
}

export enum MaritalStatus {
    SINGLE = "single",
    MARRIED = "married",
    DIVORCED = "divorced",
    WIDOWED = "widowed",
}

export enum EmploymentType {
    FULL_TIME = "full_time",
    PART_TIME = "part_time",
    CONTRACTOR = "contractor",
    INTERN = "intern",
}

export enum DegreeLevel {
    HIGH_SCHOOL = "high_school",
    DIPLOMA = "diploma",
    BACHELOR = "bachelor",
    MASTER = "master",
    PHD = "phd",
    OTHER = "other",
}

// ── Display label maps ────────────────────────────────────────────
export const GENDER_LABELS: Record<Gender, string> = {
    [Gender.MALE]: "Male",
    [Gender.FEMALE]: "Female",
    [Gender.OTHER]: "Other",
    [Gender.PREFER_NOT_TO_SAY]: "Prefer not to say",
};

export const MARITAL_STATUS_LABELS: Record<MaritalStatus, string> = {
    [MaritalStatus.SINGLE]: "Single",
    [MaritalStatus.MARRIED]: "Married",
    [MaritalStatus.DIVORCED]: "Divorced",
    [MaritalStatus.WIDOWED]: "Widowed",
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
    [EmploymentType.FULL_TIME]: "Full Time",
    [EmploymentType.PART_TIME]: "Part Time",
    [EmploymentType.CONTRACTOR]: "Contractor",
    [EmploymentType.INTERN]: "Intern",
};

export const DEGREE_LEVEL_LABELS: Record<DegreeLevel, string> = {
    [DegreeLevel.HIGH_SCHOOL]: "High School",
    [DegreeLevel.DIPLOMA]: "Diploma",
    [DegreeLevel.BACHELOR]: "Bachelor's Degree",
    [DegreeLevel.MASTER]: "Master's Degree",
    [DegreeLevel.PHD]: "PhD / Doctorate",
    [DegreeLevel.OTHER]: "Other",
};

// ── Option arrays for selects ─────────────────────────────────────
export const GENDER_OPTIONS = Object.values(Gender).map(value => ({ value, label: GENDER_LABELS[value] }));
export const MARITAL_STATUS_OPTIONS = Object.values(MaritalStatus).map(value => ({
    value,
    label: MARITAL_STATUS_LABELS[value],
}));
export const EMPLOYMENT_TYPE_OPTIONS = Object.values(EmploymentType).map(value => ({
    value,
    label: EMPLOYMENT_TYPE_LABELS[value],
}));
export const DEGREE_LEVEL_OPTIONS = Object.values(DegreeLevel).map(value => ({
    value,
    label: DEGREE_LEVEL_LABELS[value],
}));
