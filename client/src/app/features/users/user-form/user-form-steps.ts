import { AbstractControl } from "@angular/forms";

export interface UserFormStep {
    key: string;
    title: string;
    icon: string;
    description: string;
    /** Shows a "Required" tag in the stepper. */
    required: boolean;
    /** Top-level form controls edited on this step; used to jump to the step holding an invalid field. */
    controls: readonly string[];
}

export const USER_FORM_STEPS: readonly UserFormStep[] = [
    {
        key: "account",
        title: "Account",
        icon: "lock_person",
        description: "Sign-in details and access level.",
        required: true,
        controls: ["name", "email", "password", "role", "countryId", "isActive"],
    },
    {
        key: "identity",
        title: "Identity",
        icon: "badge",
        description: "Personal details as they appear on official documents.",
        required: false,
        controls: [
            "firstName",
            "lastName",
            "legalName",
            "personalEmail",
            "gender",
            "birthday",
            "maritalStatus",
            "religion",
            "nationalities",
        ],
    },
    {
        key: "employment",
        title: "Employment",
        icon: "work",
        description: "Where this person sits in the company.",
        required: true,
        controls: [
            "departmentId",
            "subDepartmentId",
            "employmentTitleId",
            "employmentType",
            "employmentDate",
            "levelId",
            "officeId",
            "managerId",
            "hrRepresentativeId",
            "payrollId",
            "isOutsourced",
            "salary",
        ],
    },
    {
        key: "contact",
        title: "Contact",
        icon: "contacts",
        description: "Phones, addresses and an emergency contact.",
        required: false,
        controls: [
            "workPhone",
            "personalPhone",
            "homeCountryPhone",
            "additionalPhones",
            "currentAddress",
            "homeCountryAddress",
            "emergencyContact",
        ],
    },
    {
        key: "education",
        title: "Education",
        icon: "school",
        description: "Optional. Add degrees and institutions.",
        required: false,
        controls: ["education"],
    },
];

/** Index of the first step that contains an invalid control, or -1 when the whole form is valid. */
export function firstInvalidStepIndex(controlOf: (name: string) => AbstractControl | null): number {
    return USER_FORM_STEPS.findIndex(step => step.controls.some(name => controlOf(name)?.invalid));
}
