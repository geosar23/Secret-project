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
import { ISubDepartment } from "../../core/interfaces/sub-department.interface";
import { SubDepartmentService } from "../../core/services/sub-department.service";
import { ToastService } from "../../core/services/toast.service";
import { PermissionService } from "../../core/services/permission.service";
import { OrgMoveWizardComponent, OrgMoveWizardData } from "../org-move-wizard/org-move-wizard.component";
import {
    SubDepartmentDialogComponent,
    SubDepartmentDialogData,
} from "./sub-department-dialog/sub-department-dialog.component";

@Component({
    selector: "app-sub-departments",
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
    templateUrl: "./sub-departments.component.html",
    styleUrls: ["./sub-departments.component.scss"],
})
export class SubDepartmentsComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild("paginator") paginator!: MatPaginator;

    private destroy$ = new Subject<void>();
    private subDepartmentService = inject(SubDepartmentService);
    private dialog = inject(MatDialog);
    private toast = inject(ToastService);
    readonly canWrite = inject(PermissionService).canWriteArea("subDepartments");

    loading = false;
    searchControl = new FormControl("");
    allSubDepartments: ISubDepartment[] = [];
    tableData = new MatTableDataSource<ISubDepartment>([]);
    displayedColumns: string[] = [
        "name",
        "department",
        "description",
        "status",
        "createdAt",
        ...(this.canWrite ? ["actions"] : []),
    ];

    ngOnInit(): void {
        this.loadSubDepartments();

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

    loadSubDepartments(): void {
        this.loading = true;
        this.subDepartmentService.getSubDepartments().subscribe({
            next: res => {
                if (!res.success || !res.data) {
                    this.toast.error(res.message || "Failed to load sub-departments");
                    this.loading = false;
                    return;
                }
                this.allSubDepartments = res.data;
                this.tableData.data = res.data;
                this.loading = false;
            },
            error: err => {
                this.toast.error(err.error?.message || "Failed to load sub-departments");
                this.loading = false;
            },
        });
    }

    getDepartmentName(item: ISubDepartment): string {
        return typeof item.department === "string" ? item.department : item.department?.name || "-";
    }

    openCreateDialog(): void {
        this.dialog
            .open(SubDepartmentDialogComponent, {
                width: "500px",
                maxWidth: "95vw",
                data: { mode: "create" } as SubDepartmentDialogData,
            })
            .afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe((subDepartment?: ISubDepartment) => {
                if (!subDepartment) {
                    return;
                }
                this.allSubDepartments = [subDepartment, ...this.allSubDepartments];
                this.tableData.data = this.allSubDepartments;
                this.toast.success("Sub-department created successfully");
            });
    }

    openEditWizard(subDepartment: ISubDepartment): void {
        this.dialog
            .open(OrgMoveWizardComponent, {
                width: "760px",
                maxWidth: "95vw",
                data: { kind: "subDepartment", subDepartment } as OrgMoveWizardData,
            })
            .afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.loadSubDepartments());
    }

    deleteSubDepartment(subDepartment: ISubDepartment): void {
        if (!confirm(`Delete sub-department "${subDepartment.name}"?`)) {
            return;
        }

        this.subDepartmentService.deleteSubDepartment(subDepartment._id as string).subscribe({
            next: res => {
                if (!res.success) {
                    this.toast.error(res.message || "Failed to delete sub-department");
                    return;
                }
                this.allSubDepartments = this.allSubDepartments.filter(d => d._id !== subDepartment._id);
                this.tableData.data = this.allSubDepartments;
                this.toast.success("Sub-department deleted");
            },
            error: err => {
                this.toast.error(err.error?.message || "Failed to delete sub-department");
            },
        });
    }
}
