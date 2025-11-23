import { Component, OnInit, ViewChild, AfterViewInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatTableModule, MatTableDataSource } from "@angular/material/table";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from "@angular/material/chips";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatPaginatorModule, MatPaginator } from "@angular/material/paginator";
import { MatSortModule, MatSort } from "@angular/material/sort";
import { MatDialog } from "@angular/material/dialog";
import { UsersService } from "../../core/services/users.service";
import { IUser } from "../../core/interfaces/user.interface";
import { CreateUserDialogComponent } from "./create-user-dialog/create-user-dialog.component";

@Component({
    selector: "app-users",
    standalone: true,
    imports: [
        CommonModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        MatPaginatorModule,
        MatSortModule,
    ],
    templateUrl: "./users.component.html",
    styleUrls: ["./users.component.scss"],
})
export class UsersComponent implements OnInit, AfterViewInit {
    @ViewChild("paginator", { static: false }) public paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    public tableData: MatTableDataSource<IUser> = new MatTableDataSource<IUser>([]);
    public displayedColumns: string[] = [
        "name",
        "email",
        "role",
        "companyId",
        "status",
        "createdAt",
        "actions",
    ];
    loading = false;
    userFetchingError = "";

    constructor(
        private usersService: UsersService,
        private dialog: MatDialog,
    ) {}

    ngOnInit() {
        this.loadUsers();
    }

    ngAfterViewInit() {
        if (this.paginator) {
            this.paginator.pageSizeOptions = [10, 25, 50, 100];
            this.paginator.pageSize = 10;
            this.tableData.paginator = this.paginator;
        }
        if (this.sort) {
            this.tableData.sort = this.sort;
        }
    }

    loadUsers() {
        this.loading = true;
        this.userFetchingError = "";
        this.usersService.getUsers().subscribe({
            next: response => {
                this.tableData.data = response.users;
                console.log(response);
                this.loading = false;
            },
            error: err => {
                this.userFetchingError = err.error?.message || "Failed to load users";
                this.loading = false;
            },
        });
    }

    openCreateModal() {
        const dialogRef = this.dialog.open(CreateUserDialogComponent, {
            width: "500px",
            disableClose: false,
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                const currentData = this.tableData.data;
                currentData.unshift(result);
                this.tableData.data = currentData;
            }
        });
    }

    getRoleBadgeClass(role: string): string {
        const roleMap: Record<string, string> = {
            god: "badge-god",
            super_admin: "badge-super-admin",
            admin: "badge-admin",
            hr: "badge-hr",
            manager: "badge-manager",
            employee: "badge-employee",
        };
        return roleMap[role] || "badge-default";
    }
}
