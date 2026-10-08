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
import { ILevel } from "../../core/interfaces/user.interface";
import { LevelService } from "../../core/services/level.service";
import { ToastService } from "../../core/services/toast.service";
import { PermissionService } from "../../core/services/permission.service";
import { LevelDialogComponent, LevelDialogData } from "./level-dialog/level-dialog.component";

@Component({
    selector: "app-levels",
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
    templateUrl: "./levels.component.html",
    styleUrls: ["./levels.component.scss"],
})
export class LevelsComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild("paginator") paginator!: MatPaginator;

    private destroy$ = new Subject<void>();
    private levelService = inject(LevelService);
    private dialog = inject(MatDialog);
    private toast = inject(ToastService);
    readonly canWrite = inject(PermissionService).canWriteArea("levels");

    loading = false;
    searchControl = new FormControl("");
    tableData = new MatTableDataSource<ILevel>([]);
    displayedColumns: string[] = ["name", "order", "status", "createdAt", ...(this.canWrite ? ["actions"] : [])];

    ngOnInit(): void {
        this.loadLevels();

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

    loadLevels(): void {
        this.loading = true;
        this.levelService.getLevels().subscribe({
            next: res => {
                if (!res.success || !res.data) {
                    this.toast.error(res.message || "Failed to load levels");
                } else {
                    this.tableData.data = [...res.data].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                }
                this.loading = false;
            },
            error: err => {
                this.toast.error(err.error?.message || "Failed to load levels");
                this.loading = false;
            },
        });
    }

    openCreateDialog(): void {
        this.openDialog({ mode: "create" }, "Level created successfully");
    }

    openEditDialog(level: ILevel): void {
        this.openDialog({ mode: "edit", level }, "Level updated successfully");
    }

    deleteLevel(level: ILevel): void {
        if (!confirm(`Delete level "${level.name}"?`)) {
            return;
        }

        this.levelService.deleteLevel(level._id).subscribe({
            next: res => {
                if (!res.success) {
                    this.toast.error(res.message || "Failed to delete level");
                    return;
                }
                this.toast.success("Level deleted");
                this.loadLevels();
            },
            error: err => this.toast.error(err.error?.message || "Failed to delete level"),
        });
    }

    private openDialog(data: LevelDialogData, successMessage: string): void {
        this.dialog
            .open(LevelDialogComponent, { width: "460px", maxWidth: "95vw", data })
            .afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe((saved?: ILevel) => {
                if (saved) {
                    this.toast.success(successMessage);
                    this.loadLevels();
                }
            });
    }
}
