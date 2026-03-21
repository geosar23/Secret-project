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
import { CompanyService } from "../../core/services/company.service";
import { ICompany } from "../../core/interfaces/company.interface";
import { ToastService } from "../../core/services/toast.service";
import { CompanyDialogComponent, CompanyDialogData } from "./company-dialog/company-dialog.component";

@Component({
    selector: "app-companies",
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
    templateUrl: "./companies.component.html",
    styleUrls: ["./companies.component.scss"],
})
export class CompaniesComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild("paginator") paginator!: MatPaginator;

    private destroy$ = new Subject<void>();
    private companyService = inject(CompanyService);
    private dialog = inject(MatDialog);
    private toast = inject(ToastService);

    loading = false;
    searchControl = new FormControl("");
    allCompanies: ICompany[] = [];
    tableData = new MatTableDataSource<ICompany>([]);
    displayedColumns = ["name", "slug", "status", "createdAt", "actions"];

    ngOnInit(): void {
        this.loadCompanies();

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

    loadCompanies(): void {
        this.loading = true;
        this.companyService.getCompanies().subscribe({
            next: res => {
                if (!res.success || !res.data) {
                    this.toast.error(res.message || "Failed to load companies");
                    this.loading = false;
                    return;
                }
                this.allCompanies = res.data;
                this.tableData.data = res.data;
                this.loading = false;
            },
            error: err => {
                this.toast.error(err.error?.message || "Failed to load companies");
                this.loading = false;
            },
        });
    }

    openCreateDialog(): void {
        this.dialog
            .open(CompanyDialogComponent, {
                width: "460px",
                maxWidth: "95vw",
                data: { mode: "create" } as CompanyDialogData,
            })
            .afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe((company?: ICompany) => {
                if (!company) return;
                this.allCompanies = [company, ...this.allCompanies];
                this.tableData.data = this.allCompanies;
                this.toast.success("Company created successfully");
            });
    }

    openEditDialog(company: ICompany): void {
        this.dialog
            .open(CompanyDialogComponent, {
                width: "460px",
                maxWidth: "95vw",
                data: { mode: "edit", company } as CompanyDialogData,
            })
            .afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe((updated?: ICompany) => {
                if (!updated) return;
                this.allCompanies = this.allCompanies.map(c => (c._id === updated._id ? updated : c));
                this.tableData.data = this.allCompanies;
                this.toast.success("Company updated successfully");
            });
    }

    deleteCompany(company: ICompany): void {
        if (!confirm(`Delete company "${company.name}"? This cannot be undone.`)) return;

        this.companyService.deleteCompany(company._id as string).subscribe({
            next: res => {
                if (!res.success) {
                    this.toast.error(res.message || "Failed to delete company");
                    return;
                }
                this.allCompanies = this.allCompanies.filter(c => c._id !== company._id);
                this.tableData.data = this.allCompanies;
                this.toast.success("Company deleted");
            },
            error: err => {
                this.toast.error(err.error?.message || "Failed to delete company");
            },
        });
    }
}
