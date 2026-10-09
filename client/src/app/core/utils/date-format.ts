import { formatDate } from "@angular/common";

// Single source of truth for how dates are displayed. Rule: DD/MM/YYYY everywhere.
// To make this user/company configurable later, change where DATE_FORMATS gets its values.
export type AppDateKind = "date" | "datetime" | "monthYear" | "weekdayDate";

export const DATE_FORMATS: Record<AppDateKind, string> = {
    date: "dd/MM/yyyy",
    datetime: "dd/MM/yyyy HH:mm",
    monthYear: "MM/yyyy",
    weekdayDate: "EEEE, dd/MM/yyyy",
};

export function formatAppDate(value: Date | string | number | null | undefined, kind: AppDateKind = "date"): string {
    if (value === null || value === undefined || value === "") {
        return "";
    }
    try {
        return formatDate(value, DATE_FORMATS[kind], "en-US");
    } catch {
        return "";
    }
}

/** Date -> "YYYY-MM-DD" from the local calendar day (what the leaves API expects). */
export function toIsoDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}
