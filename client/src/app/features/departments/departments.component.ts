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
import { DepartmentService } from "../../core/services/department.service";
import { IDepartment } from "../../core/interfaces/department.interface";
import { ToastService } from "../../core/services/toast.service";
import { DepartmentDialogComponent, DepartmentDialogData } from "./department-dialog/department-dialog.component";

@Component({
    selector: "app-departments",
    standalone: true,
    imports: [
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
    templateUrl: "./departments.component.html",
    styleUrls: ["./departments.component.scss"],
})
export class DepartmentsComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild("paginator") paginator!: MatPaginator;

    private destroy$ = new Subject<void>();
    private departmentService = inject(DepartmentService);
    private dialog = inject(MatDialog);
    private toast = inject(ToastService);

    loading = false;
    searchControl = new FormControl("");
    allDepartments: IDepartment[] = [];
    tableData = new MatTableDataSource<IDepartment>([]);
    displayedColumns = ["name", "description", "status", "createdAt", "actions"];

    ngOnInit(): void {
        this.loadDepartments();

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

    loadDepartments(): void {
        this.loading = true;
        this.departmentService.getDepartments().subscribe({
            next: res => {
                if (!res.success || !res.data) {
                    this.toast.error(res.message || "Failed to load departments");
                    this.loading = false;
                    return;
                }
                this.allDepartments = res.data;
                this.tableData.data = res.data;
                this.loading = false;
            },
            error: err => {
                this.toast.error(err.error?.message || "Failed to load departments");
                this.loading = false;
            },
        });
    }

    seedExamples(): void {
        this.departmentService.seedExamples().subscribe({
            next: res => {
                if (!res.success) {
                    this.toast.error(res.message || "Failed to seed examples");
                    return;
                }
                this.toast.success("Example departments, sub-departments, and titles created");
                this.loadDepartments();
            },
            error: err => {
                this.toast.error(err.error?.message || "Failed to seed examples");
            },
        });
    }

    openCreateDialog(): void {
        this.dialog
            .open(DepartmentDialogComponent, {
                width: "460px",
                maxWidth: "95vw",
                data: { mode: "create" } as DepartmentDialogData,
            })
            .afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe((department?: IDepartment) => {
                if (!department) return;
                this.allDepartments = [department, ...this.allDepartments];
                this.tableData.data = this.allDepartments;
                this.toast.success("Department created successfully");
            });
    }

    openEditDialog(department: IDepartment): void {
        this.dialog
            .open(DepartmentDialogComponent, {
                width: "460px",
                maxWidth: "95vw",
                data: { mode: "edit", department } as DepartmentDialogData,
            })
            .afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe((updated?: IDepartment) => {
                if (!updated) return;
                this.allDepartments = this.allDepartments.map(c => (c._id === updated._id ? updated : c));
                this.tableData.data = this.allDepartments;
                this.toast.success("Department updated successfully");
            });
    }

    deleteDepartment(department: IDepartment): void {
        if (!confirm(`Delete department "${department.name}"?`)) return;

        this.departmentService.deleteDepartment(department._id as string).subscribe({
            next: res => {
                if (!res.success) {
                    this.toast.error(res.message || "Failed to delete department");
                    return;
                }
                this.allDepartments = this.allDepartments.filter(c => c._id !== department._id);
                this.tableData.data = this.allDepartments;
                this.toast.success("Department deleted");
            },
            error: err => {
                this.toast.error(err.error?.message || "Failed to delete department");
            },
        });
    }
}
