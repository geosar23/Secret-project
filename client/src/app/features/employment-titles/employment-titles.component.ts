import { AppDatePipe } from "../../shared/pipes/app-date.pipe";
import { PageHeaderComponent } from "../../shared/components/page-header/page-header.component";
import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatTableModule, MatTableDataSource } from "@angular/material/table";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from "@angular/material/chips";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatPaginatorModule, MatPaginator } from "@angular/material/paginator";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatDialog } from "@angular/material/dialog";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { Subject } from "rxjs";
import { takeUntil, debounceTime, distinctUntilChanged } from "rxjs/operators";
import { ToastService } from "../../core/services/toast.service";
import { PermissionService } from "../../core/services/permission.service";
import { IEmploymentTitle } from "../../core/interfaces/employment-title.interface";
import { EmploymentTitleService } from "../../core/services/employment-title.service";
import { OrgMoveWizardComponent, OrgMoveWizardData } from "../org-move-wizard/org-move-wizard.component";
import {
    EmploymentTitleDialogComponent,
    EmploymentTitleDialogData,
} from "./employment-title-dialog/employment-title-dialog.component";
import { ISubDepartment } from "../../core/interfaces/sub-department.interface";
import { IDepartment } from "../../core/interfaces/department.interface";

@Component({
    selector: "app-employment-titles",
    standalone: true,
    imports: [
        AppDatePipe,
        PageHeaderComponent,
        CommonModule,
        ReactiveFormsModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        MatPaginatorModule,
        MatFormFieldModule,
        MatInputModule,
    ],
    templateUrl: "./employment-titles.component.html",
    styleUrls: ["./employment-titles.component.scss"],
})
export class EmploymentTitlesComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild("paginator") paginator!: MatPaginator;

    private destroy$ = new Subject<void>();
    private employmentTitleService = inject(EmploymentTitleService);
    private dialog = inject(MatDialog);
    private toast = inject(ToastService);
    readonly canWrite = inject(PermissionService).canWriteArea("employmentTitles");

    loading = false;
    searchControl = new FormControl("");
    allEmploymentTitles: IEmploymentTitle[] = [];
    tableData = new MatTableDataSource<IEmploymentTitle>([]);
    displayedColumns: string[] = [
        "name",
        "subDepartment",
        "department",
        "status",
        "createdAt",
        ...(this.canWrite ? ["actions"] : []),
    ];

    ngOnInit(): void {
        this.loadEmploymentTitles();

        this.searchControl.valueChanges
            .pipe(takeUntil(this.destroy$), debounceTime(300), distinctUntilChanged())
            .subscribe(q => {
                this.tableData.filter = (q ?? "").trim().toLowerCase();
            });
    }

    ngAfterViewInit(): void {
        this.tableData.paginator = this.paginator;
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadEmploymentTitles(): void {
        this.loading = true;
        this.employmentTitleService.getEmploymentTitles().subscribe({
            next: res => {
                if (!res.success || !res.data) {
                    this.toast.error(res.message || "Failed to load employment titles");
                    this.loading = false;
                    return;
                }
                this.allEmploymentTitles = res.data;
                this.tableData.data = res.data;
                this.loading = false;
            },
            error: err => {
                this.toast.error(err.error?.message || "Failed to load employment titles");
                this.loading = false;
            },
        });
    }

    getSubDepartmentName(item: IEmploymentTitle): string {
        return typeof item.subDepartment === "string" ? item.subDepartment : item.subDepartment?.name || "-";
    }

    getDepartmentName(item: IEmploymentTitle): string {
        if (typeof item.subDepartment === "string") {
            return "-";
        }

        const subDepartment = item.subDepartment as ISubDepartment;
        const department = subDepartment.department;
        if (!department) {
            return "-";
        }

        return typeof department === "string" ? department : (department as IDepartment).name || "-";
    }

    openCreateDialog(): void {
        this.dialog
            .open(EmploymentTitleDialogComponent, {
                width: "500px",
                maxWidth: "95vw",
                data: { mode: "create" } as EmploymentTitleDialogData,
            })
            .afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe((employmentTitle?: IEmploymentTitle) => {
                if (!employmentTitle) {
                    return;
                }
                this.allEmploymentTitles = [employmentTitle, ...this.allEmploymentTitles];
                this.tableData.data = this.allEmploymentTitles;
                this.toast.success("Employment title created successfully");
            });
    }

    openEditWizard(employmentTitle: IEmploymentTitle): void {
        this.dialog
            .open(OrgMoveWizardComponent, {
                width: "760px",
                maxWidth: "95vw",
                data: { kind: "title", title: employmentTitle } as OrgMoveWizardData,
            })
            .afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.loadEmploymentTitles());
    }

    deleteEmploymentTitle(employmentTitle: IEmploymentTitle): void {
        if (!confirm(`Delete employment title "${employmentTitle.name}"?`)) {
            return;
        }

        this.employmentTitleService.deleteEmploymentTitle(employmentTitle._id as string).subscribe({
            next: res => {
                if (!res.success) {
                    this.toast.error(res.message || "Failed to delete employment title");
                    return;
                }
                this.allEmploymentTitles = this.allEmploymentTitles.filter(d => d._id !== employmentTitle._id);
                this.tableData.data = this.allEmploymentTitles;
                this.toast.success("Employment title deleted");
            },
            error: err => {
                this.toast.error(err.error?.message || "Failed to delete employment title");
            },
        });
    }
}
