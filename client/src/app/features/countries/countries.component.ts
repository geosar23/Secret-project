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
import { ICountry } from "../../core/interfaces/country.interface";
import { CountryService } from "../../core/services/country.service";
import { ToastService } from "../../core/services/toast.service";
import { CountryDialogComponent, CountryDialogData } from "./country-dialog/country-dialog.component";

@Component({
    selector: "app-countries",
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
    templateUrl: "./countries.component.html",
    styleUrls: ["./countries.component.scss"],
})
export class CountriesComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild("paginator") paginator!: MatPaginator;

    private destroy$ = new Subject<void>();
    private countryService = inject(CountryService);
    private dialog = inject(MatDialog);
    private toast = inject(ToastService);

    loading = false;
    searchControl = new FormControl("");
    allCountries: ICountry[] = [];
    tableData = new MatTableDataSource<ICountry>([]);
    displayedColumns: string[] = ["name", "description", "status", "createdAt", "actions"];

    ngOnInit(): void {
        this.loadCountries();

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

    loadCountries(): void {
        this.loading = true;
        this.countryService.getCountries().subscribe({
            next: res => {
                if (!res.success || !res.data) {
                    this.toast.error(res.message || "Failed to load countries");
                    this.loading = false;
                    return;
                }
                this.allCountries = res.data;
                this.tableData.data = res.data;
                this.loading = false;
            },
            error: err => {
                this.toast.error(err.error?.message || "Failed to load countries");
                this.loading = false;
            },
        });
    }

    openCreateDialog(): void {
        this.dialog
            .open(CountryDialogComponent, {
                width: "460px",
                maxWidth: "95vw",
                data: { mode: "create" } as CountryDialogData,
            })
            .afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe((country?: ICountry) => {
                if (!country) return;
                this.allCountries = [country, ...this.allCountries];
                this.tableData.data = this.allCountries;
                this.toast.success("Country created successfully");
            });
    }

    openEditDialog(country: ICountry): void {
        this.dialog
            .open(CountryDialogComponent, {
                width: "460px",
                maxWidth: "95vw",
                data: { mode: "edit", country } as CountryDialogData,
            })
            .afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe((updated?: ICountry) => {
                if (!updated) return;
                this.allCountries = this.allCountries.map(c => (c._id === updated._id ? updated : c));
                this.tableData.data = this.allCountries;
                this.toast.success("Country updated successfully");
            });
    }

    deleteCountry(country: ICountry): void {
        if (!confirm(`Delete country "${country.name}"?`)) return;

        this.countryService.deleteCountry(country._id as string).subscribe({
            next: res => {
                if (!res.success) {
                    this.toast.error(res.message || "Failed to delete country");
                    return;
                }
                this.allCountries = this.allCountries.filter(c => c._id !== country._id);
                this.tableData.data = this.allCountries;
                this.toast.success("Country deleted");
            },
            error: err => {
                this.toast.error(err.error?.message || "Failed to delete country");
            },
        });
    }
}
