/**
 * Pure leave maths: no I/O, so every rule is unit-testable. Dates are calendar-date strings (YYYY-MM-DD) handled in
 * UTC, so a leave never shifts by a day across time zones. The leave year is the calendar year.
 */
import { HireYearEntitlement, ILeaveLine, LeaveCountingUnit } from "../../interfaces/leave.interface";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** True for a real calendar date in YYYY-MM-DD form (rejects 2027-02-30). */
export function isIsoDate(value: unknown): value is string {
    if (typeof value !== "string" || !ISO_DATE.test(value)) {
        return false;
    }
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (date: Date) => date.toISOString().slice(0, 10);

/** Today's calendar date in UTC (per-country time zones are a later refinement). */
export const todayUtc = (now: Date = new Date()) => toIso(now);

export const periodOf = (iso: string) => iso.slice(0, 4);

/** Ranges are inclusive on both ends. */
export const rangesOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
    aStart <= bEnd && bStart <= aEnd;

export interface LeaveCalculationInput {
    startDate: string;
    endDate: string;
    /** Working weekdays from the resolved work schedule, 0 = Sunday. */
    workingDays: number[];
    unit: LeaveCountingUnit;
}

export interface LeaveCalculation {
    lines: ILeaveLine[];
    totals: { quantity: number };
    /** Quantity per leave year, for ledger entries and balance checks. */
    byPeriod: Record<string, number>;
}

/** One line per calendar day; non-working days count 0 unless the policy counts calendar days. */
export function calculateLeaveLines(input: LeaveCalculationInput): LeaveCalculation {
    const working = new Set(input.workingDays);
    const lines: ILeaveLine[] = [];
    const byPeriod: Record<string, number> = {};

    for (let day = toDate(input.startDate); toIso(day) <= input.endDate; day = new Date(day.getTime() + DAY_MS)) {
        const date = toIso(day);
        const isWorking = working.has(day.getUTCDay());
        const counts = input.unit === "calendarDays" || isWorking;
        const line: ILeaveLine = { date, quantity: counts ? 1 : 0, period: periodOf(date) };
        if (!isWorking) {
            line.note = "nonWorkingDay";
        }
        lines.push(line);
        byPeriod[line.period] = (byPeriod[line.period] ?? 0) + line.quantity;
    }

    return { lines, totals: { quantity: lines.reduce((sum, line) => sum + line.quantity, 0) }, byPeriod };
}

const roundToHalf = (value: number) => Math.round(value * 2) / 2;

/**
 * Yearly entitlement for a leave year. In the hire year the company's rule applies: `prorated` by the days remaining
 * from the hire date (rounded to half a day), the `full` amount, or `none` until the next year. Hired after the year:
 * nothing.
 */
export function entitlementForYear(
    amountPerYear: number,
    year: string,
    hireDate?: string,
    hireYearRule: HireYearEntitlement = "prorated",
): number {
    if (!hireDate || periodOf(hireDate) < year) {
        return amountPerYear;
    }
    if (periodOf(hireDate) > year || hireYearRule === "none") {
        return 0;
    }
    if (hireYearRule === "full") {
        return amountPerYear;
    }
    const yearStart = toDate(`${year}-01-01`).getTime();
    const nextYearStart = toDate(`${Number(year) + 1}-01-01`).getTime();
    const daysInYear = (nextYearStart - yearStart) / DAY_MS;
    const remaining = (nextYearStart - toDate(hireDate).getTime()) / DAY_MS;
    return roundToHalf((amountPerYear * remaining) / daysInYear);
}

/** DD/MM/YYYY for summaries and messages. */
export const formatDisplayDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
