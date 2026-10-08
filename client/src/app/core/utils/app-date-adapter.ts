import { Injectable } from "@angular/core";
import { MatDateFormats, NativeDateAdapter } from "@angular/material/core";

// Material datepicker adapter: displays and parses DD/MM/YYYY (typed input included).
@Injectable()
export class AppDateAdapter extends NativeDateAdapter {
    override format(date: Date, displayFormat: object): string {
        if ((displayFormat as unknown) === "input") {
            const dd = String(date.getDate()).padStart(2, "0");
            const mm = String(date.getMonth() + 1).padStart(2, "0");
            return `${dd}/${mm}/${date.getFullYear()}`;
        }
        return super.format(date, displayFormat);
    }

    override parse(value: unknown): Date | null {
        if (typeof value === "string") {
            const match = /^\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\s*$/.exec(value);
            if (!match) {
                return null;
            }
            const [, d, m, y] = match.map(Number);
            const date = new Date(y, m - 1, d);
            // Reject overflow such as 31/02/2024
            return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
        }
        return super.parse(value);
    }
}

export const APP_DATE_FORMATS: MatDateFormats = {
    parse: { dateInput: "input" },
    display: {
        dateInput: "input",
        monthYearLabel: { year: "numeric", month: "short" },
        dateA11yLabel: { year: "numeric", month: "long", day: "numeric" },
        monthYearA11yLabel: { year: "numeric", month: "long" },
    },
};
