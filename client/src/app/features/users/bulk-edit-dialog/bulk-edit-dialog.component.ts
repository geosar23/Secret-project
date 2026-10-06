import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatSelectModule } from "@angular/material/select";
import { Observable, catchError, forkJoin, map, of } from "rxjs";
import { IUpdateUserRequest, IUser, IOffice, ILevel } from "../../../core/interfaces/user.interface";
import { ICountry } from "../../../core/interfaces/country.interface";
import { IDepartment } from "../../../core/interfaces/department.interface";
import { ISubDepartment } from "../../../core/interfaces/sub-department.interface";
import { IEmploymentTitle } from "../../../core/interfaces/employment-title.interface";
import { IRole } from "../../../core/interfaces/role.interface";
import { IBulkUpdateResult, IBulkUserUpdate, UsersService } from "../../../core/services/users.service";
import { CountryService } from "../../../core/services/country.service";
import { DepartmentService } from "../../../core/services/department.service";
import { SubDepartmentService } from "../../../core/services/sub-department.service";
import { EmploymentTitleService } from "../../../core/services/employment-title.service";
import { RoleService } from "../../../core/services/role.service";
import { LevelService } from "../../../core/services/level.service";
import { OfficeService } from "../../../core/services/office.service";
import {
    officesIn,
    peopleIn,
    refId,
    selectable,
    subDepartmentsOf,
    titlesOf,
} from "../../../core/utils/user-form-options";

export interface BulkEditDialogData {
    users: IUser[];
}

export interface BulkEditDialogResult {
    result: IBulkUpdateResult;
    /** Restores the previous values of every user that was changed. */
    undo: IBulkUserUpdate[];
}

type FieldKey = "employmentTitle" | "office" | "country" | "manager" | "hrRepresentative" | "level" | "role";

interface BulkField {
    key: FieldKey;
    label: string;
    icon: string;
    /** Property name on the update request. */
    payload: string;
    clearable: boolean;
    sensitive?: boolean;
    warning?: string;
}

interface DiffRow {
    label: string;
    from: string;
    to: string;
}

const NONE = "—";

@Component({
    selector: "app-bulk-edit-dialog",
    standalone: true,
    imports: [
        MatDialogModule,
        MatButtonModule,
        MatCheckboxModule,
        MatFormFieldModule,
        MatIconModule,
        MatProgressBarModule,
        MatSelectModule,
    ],
    templateUrl: "./bulk-edit-dialog.component.html",
    styleUrls: ["./bulk-edit-dialog.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BulkEditDialogComponent {
    private readonly dialogRef = inject<MatDialogRef<BulkEditDialogComponent, BulkEditDialogResult>>(MatDialogRef);
    private readonly usersService = inject(UsersService);
    readonly data = inject<BulkEditDialogData>(MAT_DIALOG_DATA);

    readonly fields: readonly BulkField[] = [
        {
            key: "employmentTitle",
            label: "Employment Title",
            icon: "work",
            payload: "employmentTitleId",
            clearable: true,
        },
        { key: "office", label: "Office", icon: "business", payload: "officeId", clearable: true },
        {
            key: "country",
            label: "Country",
            icon: "public",
            payload: "countryId",
            clearable: true,
            warning: "Country affects payroll rules and public holidays.",
        },
        { key: "manager", label: "Manager", icon: "supervisor_account", payload: "managerId", clearable: true },
        {
            key: "hrRepresentative",
            label: "HR Representative",
            icon: "support_agent",
            payload: "hrRepresentativeId",
            clearable: true,
        },
        { key: "level", label: "Level", icon: "stairs", payload: "levelId", clearable: true },
        { key: "role", label: "Role", icon: "verified_user", payload: "role", clearable: false, sensitive: true },
    ];

    readonly step = signal<1 | 2>(1);
    readonly applying = signal(false);
    readonly loading = signal(true);

    // Reference data
    private readonly countries = signal<ICountry[]>([]);
    private readonly departments = signal<IDepartment[]>([]);
    private readonly subDepartments = signal<ISubDepartment[]>([]);
    private readonly titles = signal<IEmploymentTitle[]>([]);
    private readonly offices = signal<IOffice[]>([]);
    private readonly levels = signal<ILevel[]>([]);
    private readonly roles = signal<IRole[]>([]);
    private readonly people = signal<IUser[]>([]);

    // Form state. A value of null means "not chosen yet", "" means "clear the value".
    readonly enabled = signal<Partial<Record<FieldKey, boolean>>>({});
    readonly values = signal<Partial<Record<FieldKey, string | null>>>({});
    readonly titleDepartment = signal<string | null>(null);
    readonly titleSubDepartment = signal<string | null>(null);

    readonly departmentOptions = computed(() => selectable(this.departments()));
    readonly subDepartmentOptions = computed(() =>
        subDepartmentsOf(this.subDepartments(), this.titleDepartment() ?? ""),
    );
    readonly titleOptions = computed(() => titlesOf(this.titles(), this.titleSubDepartment() ?? ""));
    readonly officeOptions = computed(() => {
        const country = this.enabled().country ? this.values().country : "";
        return officesIn(this.offices(), country ?? "");
    });
    readonly personOptions = computed(() => peopleIn(this.people(), ""));
    readonly levelOptions = computed(() => selectable(this.levels()));
    readonly roleOptions = computed(() => selectable(this.roles()));
    readonly countryOptions = computed(() => selectable(this.countries()));

    readonly readyFields = computed(() =>
        this.fields.filter(f => this.enabled()[f.key] && this.values()[f.key] != null),
    );

    readonly plan = computed(() => this.buildPlan());

    constructor() {
        const quiet = <T>(source$: Observable<{ data?: T[] }>) =>
            source$.pipe(
                map(res => res.data ?? []),
                catchError(() => of([] as T[])),
            );

        forkJoin([
            quiet(inject(CountryService).getCountries()),
            quiet(inject(DepartmentService).getDepartments()),
            quiet(inject(SubDepartmentService).getSubDepartments()),
            quiet(inject(EmploymentTitleService).getEmploymentTitles()),
            quiet(inject(OfficeService).getOffices()),
            quiet(inject(LevelService).getLevels()),
            quiet(inject(RoleService).getAllRoles()),
            quiet(this.usersService.getUsers({ limit: 100 }).pipe(map(res => ({ data: res.data?.users ?? [] })))),
        ]).subscribe(([countries, departments, subDepartments, titles, offices, levels, roles, people]) => {
            this.countries.set(countries);
            this.departments.set(departments);
            this.subDepartments.set(subDepartments);
            this.titles.set(titles);
            this.offices.set(offices);
            this.levels.set(levels);
            this.roles.set(roles);
            this.people.set(people);
            this.loading.set(false);
        });
    }

    toggle(field: BulkField, on: boolean): void {
        this.enabled.update(e => ({ ...e, [field.key]: on }));
        if (!on) {
            this.values.update(v => ({ ...v, [field.key]: null }));
            if (field.key === "employmentTitle") {
                this.titleDepartment.set(null);
                this.titleSubDepartment.set(null);
            }
        }
    }

    setValue(field: BulkField, value: string | null): void {
        this.values.update(v => ({ ...v, [field.key]: value }));
        if (value != null && !this.enabled()[field.key]) {
            this.enabled.update(e => ({ ...e, [field.key]: true }));
        }
    }

    setTitleDepartment(id: string | null): void {
        this.titleDepartment.set(id);
        this.titleSubDepartment.set(null);
        this.values.update(v => ({ ...v, employmentTitle: null }));
    }

    setTitleSubDepartment(id: string | null): void {
        this.titleSubDepartment.set(id);
        this.values.update(v => ({ ...v, employmentTitle: null }));
    }

    optionsFor(key: FieldKey): readonly { _id?: string; name: string }[] {
        switch (key) {
            case "employmentTitle":
                return this.titleOptions();
            case "office":
                return this.officeOptions();
            case "country":
                return this.countryOptions();
            case "manager":
            case "hrRepresentative":
                return this.personOptions();
            case "level":
                return this.levelOptions();
            case "role":
                return this.roleOptions();
        }
    }

    /** The title select stays locked until a sub-department is picked, unless "clear" was chosen. */
    valueDisabled(field: BulkField): boolean {
        if (!this.enabled()[field.key]) {
            return true;
        }
        return field.key === "employmentTitle" && !this.titleSubDepartment() && this.values().employmentTitle !== "";
    }

    review(): void {
        this.step.set(2);
    }

    back(): void {
        this.step.set(1);
    }

    apply(): void {
        const { updates, undo } = this.plan();
        if (!updates.length) {
            return;
        }
        this.applying.set(true);
        this.usersService.bulkUpdate(updates).subscribe(result => {
            const done = new Set(result.succeeded);
            this.dialogRef.close({ result, undo: undo.filter(u => done.has(u.id)) });
        });
    }

    private nameOf(key: FieldKey, id: string): string {
        if (!id) {
            return NONE;
        }
        const lists: Record<FieldKey, readonly { _id?: string; name: string }[]> = {
            employmentTitle: this.titles(),
            office: this.offices(),
            country: this.countries(),
            manager: this.people(),
            hrRepresentative: this.people(),
            level: this.levels(),
            role: this.roles(),
        };
        return lists[key].find(i => i._id === id)?.name ?? NONE;
    }

    private buildPlan() {
        const fields = this.readyFields();
        const updates: IBulkUserUpdate[] = [];
        const undo: IBulkUserUpdate[] = [];
        const same: IUser[] = [];
        const selfManaged: string[] = [];
        const changedFields = new Map<FieldKey, { from: Map<string, number>; to: string }>();
        let countryMismatch = 0;

        for (const user of this.data.users) {
            const data: Record<string, string> = {};
            const previous: Record<string, string> = {};

            for (const field of fields) {
                const next = this.values()[field.key] as string;
                if (field.key === "manager" && next === user._id) {
                    selfManaged.push(user.name);
                    continue;
                }
                const current = refId(user[field.key]);
                if (current === next) {
                    continue;
                }
                data[field.payload] = next;
                previous[field.payload] = current;

                const entry = changedFields.get(field.key) ?? {
                    from: new Map<string, number>(),
                    to: this.nameOf(field.key, next),
                };
                const label = this.nameOf(field.key, current);
                entry.from.set(label, (entry.from.get(label) ?? 0) + 1);
                changedFields.set(field.key, entry);
            }

            if (!Object.keys(data).length) {
                same.push(user);
                continue;
            }

            const newCountry = data["countryId"];
            if (newCountry && !("officeId" in data)) {
                const officeCountry = refId(user.office?.country);
                if (officeCountry && officeCountry !== newCountry) {
                    countryMismatch++;
                }
            }

            const id = user._id as string;
            updates.push({ id, data: data as IUpdateUserRequest });
            undo.push({ id, data: previous as IUpdateUserRequest });
        }

        const diff: DiffRow[] = this.fields
            .filter(f => changedFields.has(f.key))
            .map(f => {
                const entry = changedFields.get(f.key)!;
                const from = [...entry.from].map(([name, n]) => `${name} ×${n}`).join(", ");
                return { label: f.label, from, to: entry.to };
            });

        const changed = new Set(updates.map(u => u.id));
        return {
            updates,
            undo,
            diff,
            same,
            selfManaged: [...new Set(selfManaged)],
            countryMismatch,
            changedUsers: this.data.users.filter(u => changed.has(u._id as string)),
        };
    }
}
