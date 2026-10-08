import { AppDatePipe } from "../../shared/pipes/app-date.pipe";
import { PageHeaderComponent } from "../../shared/components/page-header/page-header.component";
import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatTableModule, MatTableDataSource } from "@angular/material/table";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatPaginatorModule, MatPaginator } from "@angular/material/paginator";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatDialog } from "@angular/material/dialog";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { Subject } from "rxjs";
import { takeUntil, debounceTime, distinctUntilChanged } from "rxjs/operators";
import { IOffice } from "../../core/interfaces/user.interface";
import { OfficeService } from "../../core/services/office.service";
import { ToastService } from "../../core/services/toast.service";
import { PermissionService } from "../../core/services/permission.service";
import { OfficeDialogComponent, OfficeDialogData } from "./office-dialog/office-dialog.component";

@Component({
    selector: "app-offices",
    standalone: true,
    imports: [
        AppDatePipe,
        PageHeaderComponent,
        CommonModule,
        ReactiveFormsModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatPaginatorModule,
        MatFormFieldModule,
        MatInputModule,
    ],
    templateUrl: "./offices.component.html",
    styleUrls: ["./offices.component.scss"],
})
export class OfficesComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild("paginator") paginator!: MatPaginator;

    private destroy$ = new Subject<void>();
    private officeService = inject(OfficeService);
    private dialog = inject(MatDialog);
    private toast = inject(ToastService);
    readonly canWrite = inject(PermissionService).canWriteArea("offices");

    loading = false;
    searchControl = new FormControl("");
    tableData = new MatTableDataSource<IOffice>([]);
    displayedColumns: string[] = [
        "name",
        "country",
        "city",
        "status",
        "createdAt",
        ...(this.canWrite ? ["actions"] : []),
    ];

    ngOnInit(): void {
        this.loadOffices();

        this.tableData.filterPredicate = (office, filter) =>
            [office.name, office.country?.name, office.address?.city].some(v => v?.toLowerCase().includes(filter));

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

    loadOffices(): void {
        this.loading = true;
        this.officeService.getOffices().subscribe({
            next: res => {
                if (!res.success || !res.data) {
                    this.toast.error(res.message || "Failed to load offices");
                } else {
                    this.tableData.data = res.data;
                }
                this.loading = false;
            },
            error: err => {
                this.toast.error(err.error?.message || "Failed to load offices");
                this.loading = false;
            },
        });
    }

    openCreateDialog(): void {
        this.openDialog({ mode: "create" }, "Office created successfully");
    }

    openEditDialog(office: IOffice): void {
        this.openDialog({ mode: "edit", office }, "Office updated successfully");
    }

    deleteOffice(office: IOffice): void {
        if (!confirm(`Delete office "${office.name}"?`)) {
            return;
        }

        this.officeService.deleteOffice(office._id).subscribe({
            next: res => {
                if (!res.success) {
                    this.toast.error(res.message || "Failed to delete office");
                    return;
                }
                this.toast.success("Office deleted");
                this.loadOffices();
            },
            error: err => this.toast.error(err.error?.message || "Failed to delete office"),
        });
    }

    private openDialog(data: OfficeDialogData, successMessage: string): void {
        this.dialog
            .open(OfficeDialogComponent, { width: "520px", maxWidth: "95vw", data })
            .afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe((saved?: IOffice) => {
                if (saved) {
                    this.toast.success(successMessage);
                    this.loadOffices();
                }
            });
    }
}
