import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatSelectModule } from "@angular/material/select";
import { MatChipsModule } from "@angular/material/chips";
import { RoleService } from "../../../core/services/role.service";
import { CompanyService } from "../../../core/services/company.service";
import { AuthService } from "../../../core/services/auth.service";
import { PermissionService } from "../../../core/services/permission.service";
import { ToastService } from "../../../core/services/toast.service";
import { IRole } from "../../../core/interfaces/role.interface";
import { ICompany } from "../../../core/interfaces/company.interface";
import { PERMISSIONS, PermissionCategoriesStrings } from "../../../core/enums/permissions.enum";
import { IPermissionDefinition } from "../../../core/interfaces/permission.interface";

interface PermissionGroup {
    category: string;
    categoryLabel: string;
    permissions: IPermissionDefinition[];
}

export interface RoleDialogData {
    mode: "create" | "edit";
    role?: IRole;
}

@Component({
    selector: "app-role-dialog",
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatSlideToggleModule,
        MatSelectModule,
        MatChipsModule,
    ],
    templateUrl: "./role-dialog.component.html",
    styleUrls: ["./role-dialog.component.scss"],
})
export class RoleDialogComponent implements OnInit {
    private fb = inject(FormBuilder);
    private roleService = inject(RoleService);
    private companyService = inject(CompanyService);
    private authService = inject(AuthService);
    private permissionService = inject(PermissionService);
    private toast = inject(ToastService);
    private dialogRef = inject(MatDialogRef<RoleDialogComponent, IRole | undefined>);
    data = inject<RoleDialogData>(MAT_DIALOG_DATA);

    loading = false;
    companiesLoading = false;
    isEdit = this.data.mode === "edit";
    companies: ICompany[] = [];

    readonly permissionGroups: PermissionGroup[] = this.buildPermissionGroups();
    readonly canSelectCompany = this.permissionService.canViewCrossCompany();

    form: FormGroup = this.fb.group({
        name: [this.data.role?.name ?? "", [Validators.required, Validators.minLength(2)]],
        description: [this.data.role?.description ?? "", [Validators.maxLength(255)]],
        companyId: [this.data.role?.company?._id ?? this.authService.getLocalUser()?.company?._id ?? ""],
        isActive: [this.data.role?.isActive ?? true],
        permissions: [this.data.role?.permissions ?? []],
    });

    ngOnInit(): void {
        if (!this.canSelectCompany) {
            return;
        }

        this.companiesLoading = true;
        this.companyService.getCompanies().subscribe({
            next: res => {
                this.companies = res.data ?? [];
                this.companiesLoading = false;
            },
            error: () => {
                this.companiesLoading = false;
                this.toast.error("Failed to load companies");
            },
        });
    }

    get selectedPermissions(): string[] {
        return (this.form.get("permissions")?.value as string[]) ?? [];
    }

    getSelectedPermissionLabel(permissionKey: string): string {
        const definition = (Object.values(PERMISSIONS) as IPermissionDefinition[]).find(p => p.key === permissionKey);
        return definition?.name ?? permissionKey;
    }

    clearPermissions(): void {
        this.form.get("permissions")?.setValue([]);
        this.form.get("permissions")?.markAsDirty();
    }

    private buildPermissionGroups(): PermissionGroup[] {
        const grouped = new Map<string, IPermissionDefinition[]>();

        (Object.values(PERMISSIONS) as IPermissionDefinition[]).forEach(permission => {
            if (!grouped.has(permission.category)) {
                grouped.set(permission.category, []);
            }
            grouped.get(permission.category)?.push(permission);
        });

        return Array.from(grouped.entries()).map(([category, permissions]) => ({
            category,
            categoryLabel:
                PermissionCategoriesStrings[category as keyof typeof PermissionCategoriesStrings] ?? category,
            permissions: permissions.sort((a, b) => a.name.localeCompare(b.name)),
        }));
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.loading = true;
        this.dialogRef.disableClose = true;

        const { name, description, companyId, isActive, permissions } = this.form.value as {
            name: string;
            description: string;
            companyId?: string;
            isActive: boolean;
            permissions: string[];
        };

        const request$ = this.isEdit
            ? this.roleService.updateRole(this.data.role!._id as string, {
                  name,
                  description,
                  companyId: this.canSelectCompany ? companyId || undefined : undefined,
                  isActive,
                  permissions,
              })
            : this.roleService.createRole({
                  name,
                  description,
                  permissions,
                  companyId: this.canSelectCompany ? companyId || undefined : undefined,
              });

        request$.subscribe({
            next: res => {
                if (!res.success || !res.data?.role) {
                    this.toast.error(res.message || "Operation failed");
                    this.loading = false;
                    this.dialogRef.disableClose = false;
                    return;
                }
                this.dialogRef.close(res.data.role);
            },
            error: err => {
                this.toast.error(err.error?.message || "Operation failed");
                this.loading = false;
                this.dialogRef.disableClose = false;
            },
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}
