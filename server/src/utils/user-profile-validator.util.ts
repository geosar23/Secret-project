import { DegreeLevel, EmploymentType, Gender, MaritalStatus } from "../enums/profile.enum";

/**
 * Field-level validation for the employee profile (create + update payloads).
 *
 * Only fields present in the payload are checked. When `existing` is supplied (update), a field
 * whose value is unchanged is skipped, so legacy records holding data that predates these rules
 * can still be edited without being forced to fix unrelated fields first.
 */

const MIN_YEAR = 1900;
const MAX_SHORT_TEXT = 100;
const MAX_LONG_TEXT = 200;
const MAX_LIST_ITEMS = 10;
const MAX_EDUCATION_ENTRIES = 20;
const MAX_SALARY = 1_000_000_000;
const PHONE_PATTERN = /^\+?\(?[0-9][0-9\s().-]*$/;
const SALARY_PATTERN = /^\d+(\.\d{1,2})?$/;

const SHORT_TEXT_FIELDS = [
    "name",
    "legalName",
    "firstName",
    "lastName",
    "religion",
    "payrollId",
    "email",
    "personalEmail",
] as const;

const PHONE_FIELDS = ["workPhone", "personalPhone", "homeCountryPhone"] as const;

const ENUM_FIELDS: Record<string, string[]> = {
    gender: Object.values(Gender),
    maritalStatus: Object.values(MaritalStatus),
    employmentType: Object.values(EmploymentType),
};

type Payload = Record<string, unknown>;

const isBlank = (v: unknown): boolean => v === undefined || v === null || (typeof v === "string" && !v.trim());

const toTime = (v: unknown): number | undefined => {
    if (v === null || v === undefined || v === "") {
        return undefined;
    }
    const d = v instanceof Date ? v : new Date(v as string | number);
    return isNaN(d.getTime()) ? NaN : d.getTime();
};

const sameValue = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const DATE_FIELDS = new Set(["birthday", "employmentDate"]);

function isPhone(value: string): boolean {
    const digits = value.replace(/\D/g, "");
    return PHONE_PATTERN.test(value) && digits.length >= 7 && digits.length <= 15;
}

function checkPhone(label: string, value: unknown): string | null {
    if (isBlank(value)) {
        return null;
    }
    if (typeof value !== "string" || !isPhone(value.trim())) {
        return `${label} must be a valid phone number (7-15 digits, optional leading +)`;
    }
    return null;
}

function checkDate(label: string, value: unknown, maxTime: number): string | null {
    const time = toTime(value);
    if (time === undefined) {
        return null;
    }
    if (isNaN(time)) {
        return `${label} is not a valid date`;
    }
    if (new Date(time).getUTCFullYear() < MIN_YEAR) {
        return `${label} cannot be before ${MIN_YEAR}`;
    }
    if (time > maxTime) {
        return `${label} is too far in the future`;
    }
    return null;
}

function checkEducation(raw: unknown, now: Date): string | null {
    if (!Array.isArray(raw)) {
        return "education must be a list";
    }
    if (raw.length > MAX_EDUCATION_ENTRIES) {
        return `education cannot have more than ${MAX_EDUCATION_ENTRIES} entries`;
    }
    const maxYear = now.getUTCFullYear() + 8; // allow degrees still in progress
    for (const [i, entry] of raw.entries()) {
        if (typeof entry !== "object" || entry === null) {
            return `education[${i + 1}] is invalid`;
        }
        const e = entry as Payload;
        if (!isBlank(e.degreeLevel) && !Object.values(DegreeLevel).includes(e.degreeLevel as DegreeLevel)) {
            return `education[${i + 1}] has an invalid degree level`;
        }
        for (const key of ["institution", "degreeTitle"] as const) {
            if (typeof e[key] === "string" && (e[key] as string).length > MAX_LONG_TEXT) {
                return `education[${i + 1}] ${key} is too long`;
            }
        }
        if (e.yearAchieved !== undefined && e.yearAchieved !== null && e.yearAchieved !== "") {
            const y = e.yearAchieved;
            if (typeof y !== "number" || !Number.isInteger(y) || y < MIN_YEAR || y > maxYear) {
                return `education[${i + 1}] year must be a whole year between ${MIN_YEAR} and ${maxYear}`;
            }
        }
    }
    return null;
}

function checkSalary(value: unknown): string | null {
    if (isBlank(value)) {
        return null;
    }
    const text = typeof value === "number" ? String(value) : value;
    if (typeof text !== "string" || !SALARY_PATTERN.test(text.trim())) {
        return "salary must be a non-negative number with at most 2 decimals";
    }
    if (Number(text) > MAX_SALARY) {
        return "salary is out of range";
    }
    return null;
}

/** Returns a user-facing message for the first invalid field, or null when the payload is valid. */
export function validateUserProfilePayload(
    body: Payload,
    existing?: Payload | null,
    now: Date = new Date(),
): string | null {
    const unchanged = (field: string, incoming: unknown): boolean => {
        if (!existing) {
            return false;
        }
        return DATE_FIELDS.has(field)
            ? toTime(incoming) === toTime(existing[field])
            : sameValue(incoming, existing[field]);
    };
    const changed = (field: string): boolean => field in body && !unchanged(field, body[field]);

    for (const field of SHORT_TEXT_FIELDS) {
        if (changed(field) && typeof body[field] === "string" && (body[field] as string).length > MAX_SHORT_TEXT) {
            return `${field} cannot be longer than ${MAX_SHORT_TEXT} characters`;
        }
    }

    for (const [field, allowed] of Object.entries(ENUM_FIELDS)) {
        if (changed(field) && !isBlank(body[field]) && !allowed.includes(body[field] as string)) {
            return `${field} has an invalid value`;
        }
    }

    if (changed("birthday")) {
        const err = checkDate("birthday", body.birthday, now.getTime());
        if (err) {
            return err;
        }
    }
    if (changed("employmentDate")) {
        const oneYearAhead = now.getTime() + 366 * 24 * 60 * 60 * 1000; // future start dates are allowed
        const err = checkDate("employmentDate", body.employmentDate, oneYearAhead);
        if (err) {
            return err;
        }
    }

    for (const field of PHONE_FIELDS) {
        if (changed(field)) {
            const err = checkPhone(field, body[field]);
            if (err) {
                return err;
            }
        }
    }

    for (const field of ["nationalities", "additionalPhones"] as const) {
        if (!changed(field)) {
            continue;
        }
        const list = body[field];
        if (!Array.isArray(list)) {
            return `${field} must be a list`;
        }
        if (list.length > MAX_LIST_ITEMS) {
            return `${field} cannot have more than ${MAX_LIST_ITEMS} entries`;
        }
        for (const item of list) {
            if (typeof item !== "string") {
                return `${field} must only contain text`;
            }
            if (field === "additionalPhones" && !isBlank(item) && !isPhone(item.trim())) {
                return "additionalPhones must contain valid phone numbers (7-15 digits, optional leading +)";
            }
            if (field === "nationalities" && item.length > MAX_SHORT_TEXT) {
                return "nationalities entries are too long";
            }
        }
    }

    if (changed("emergencyContact") && body.emergencyContact && typeof body.emergencyContact === "object") {
        const err = checkPhone("emergencyContact.phone", (body.emergencyContact as Payload).phone);
        if (err) {
            return err;
        }
    }

    for (const field of ["currentAddress", "homeCountryAddress"] as const) {
        if (changed(field) && body[field] && typeof body[field] === "object") {
            for (const [key, value] of Object.entries(body[field] as Payload)) {
                if (typeof value === "string" && value.length > MAX_LONG_TEXT) {
                    return `${field}.${key} is too long`;
                }
            }
        }
    }

    if (changed("education")) {
        const err = checkEducation(body.education, now);
        if (err) {
            return err;
        }
    }

    if (changed("salary")) {
        const err = checkSalary(body.salary);
        if (err) {
            return err;
        }
    }

    return null;
}
