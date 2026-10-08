import { Pipe, PipeTransform } from "@angular/core";
import { AppDateKind, formatAppDate } from "../../core/utils/date-format";

@Pipe({ name: "appDate", standalone: true })
export class AppDatePipe implements PipeTransform {
    transform(value: Date | string | number | null | undefined, kind: AppDateKind = "date"): string {
        return formatAppDate(value, kind);
    }
}
