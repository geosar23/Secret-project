import {
    calculateLeaveLines,
    entitlementForYear,
    formatDisplayDate,
    isIsoDate,
    rangesOverlap,
} from "../../services/leaves/leave-calculator";

const MON_FRI = [1, 2, 3, 4, 5];

describe("calculateLeaveLines", () => {
    // 05/01/2026 is a Monday
    it("counts working days Monday–Friday and keeps weekends as zero lines", () => {
        const result = calculateLeaveLines({
            startDate: "2026-01-05",
            endDate: "2026-01-11",
            workingDays: MON_FRI,
            unit: "workingDays",
        });
        expect(result.totals.quantity).toBe(5);
        expect(result.lines).toHaveLength(7);
        expect(result.lines.filter(line => line.note === "nonWorkingDay").map(line => line.date)).toEqual([
            "2026-01-10",
            "2026-01-11",
        ]);
        expect(result.lines.every(line => line.period === "2026")).toBe(true);
    });

    it("supports Friday and Sunday off", () => {
        const result = calculateLeaveLines({
            startDate: "2026-01-05",
            endDate: "2026-01-11",
            workingDays: [1, 2, 3, 4, 6],
            unit: "workingDays",
        });
        expect(result.totals.quantity).toBe(5);
        const zero = result.lines.filter(line => line.quantity === 0).map(line => line.date);
        expect(zero).toEqual(["2026-01-09", "2026-01-11"]); // Friday, Sunday
    });

    it("supports a six-day week", () => {
        const result = calculateLeaveLines({
            startDate: "2026-01-05",
            endDate: "2026-01-11",
            workingDays: [1, 2, 3, 4, 5, 6],
            unit: "workingDays",
        });
        expect(result.totals.quantity).toBe(6);
    });

    it("counts every day with calendar-day counting, still marking non-working days", () => {
        const result = calculateLeaveLines({
            startDate: "2026-01-05",
            endDate: "2026-01-11",
            workingDays: MON_FRI,
            unit: "calendarDays",
        });
        expect(result.totals.quantity).toBe(7);
        expect(result.lines.filter(line => line.note === "nonWorkingDay")).toHaveLength(2);
    });

    it("handles a single day and a weekend-only range", () => {
        expect(
            calculateLeaveLines({
                startDate: "2026-01-07",
                endDate: "2026-01-07",
                workingDays: MON_FRI,
                unit: "workingDays",
            }).totals.quantity,
        ).toBe(1);
        expect(
            calculateLeaveLines({
                startDate: "2026-01-10",
                endDate: "2026-01-11",
                workingDays: MON_FRI,
                unit: "workingDays",
            }).totals.quantity,
        ).toBe(0);
    });

    it("splits a range across 31/12 into two leave years", () => {
        // 29/12/2026 Tuesday .. 04/01/2027 Monday
        const result = calculateLeaveLines({
            startDate: "2026-12-29",
            endDate: "2027-01-04",
            workingDays: MON_FRI,
            unit: "workingDays",
        });
        expect(result.byPeriod).toEqual({ "2026": 3, "2027": 2 });
        expect(result.totals.quantity).toBe(5);
    });
});

describe("entitlementForYear", () => {
    it("grants the full amount when hired before the year or with no hire date", () => {
        expect(entitlementForYear(20, "2027")).toBe(20);
        expect(entitlementForYear(20, "2027", "2020-06-01")).toBe(20);
    });

    it("pro-rates the hire year by remaining days, rounded to half a day", () => {
        expect(entitlementForYear(20, "2027", "2027-01-01")).toBe(20);
        expect(entitlementForYear(20, "2027", "2027-07-02")).toBe(10); // 183 of 365 days
        expect(entitlementForYear(30, "2027", "2027-10-01")).toBe(7.5); // 92 of 365 days
    });

    it("applies the company's hire-year rule: full amount or nothing until next year", () => {
        expect(entitlementForYear(20, "2027", "2027-07-02", "full")).toBe(20);
        expect(entitlementForYear(20, "2027", "2027-07-02", "none")).toBe(0);
        expect(entitlementForYear(20, "2028", "2027-07-02", "none")).toBe(20); // only the hire year is affected
    });

    it("grants nothing for a year before the hire date", () => {
        expect(entitlementForYear(20, "2026", "2027-03-01")).toBe(0);
    });
});

describe("date helpers", () => {
    it("validates real calendar dates only", () => {
        expect(isIsoDate("2027-02-28")).toBe(true);
        expect(isIsoDate("2027-02-30")).toBe(false);
        expect(isIsoDate("28/02/2027")).toBe(false);
        expect(isIsoDate(20270228)).toBe(false);
    });

    it("detects inclusive overlaps and formats DD/MM/YYYY", () => {
        expect(rangesOverlap("2027-01-01", "2027-01-05", "2027-01-05", "2027-01-09")).toBe(true);
        expect(rangesOverlap("2027-01-01", "2027-01-04", "2027-01-05", "2027-01-09")).toBe(false);
        expect(formatDisplayDate("2027-01-12")).toBe("12/01/2027");
    });
});
